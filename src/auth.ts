import NextAuth, { DefaultSession, CredentialsSignin } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id"
import { apiClient } from "@/lib/apiClient"
import { cookies } from "next/headers"

declare module "next-auth" {
  interface Session {
    user: {
      roles: string;
      activeRoleId: string;
      backendToken: string;
      mustResetPassword: boolean;
      hasProfileImage: boolean;
    } & DefaultSession["user"]
  }
}

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  debug: false,
  basePath: "/api/auth",
  providers: [
    MicrosoftEntraId({
      clientId: process.env.SHAREPOINT_CLIENT_ID || "",
      clientSecret: process.env.SHAREPOINT_CLIENT_SECRET || "",
      issuer: `https://login.microsoftonline.com/${process.env.SHAREPOINT_TENANT_ID || "common"}/v2.0`,
      authorization: { params: { scope: "openid profile email User.Read" } },
    }),
    CredentialsProvider({
      name: "OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        employeeId: { label: "Employee ID", type: "text" },
        otp: { label: "OTP", type: "text" },
        newPassword: { label: "New Password", type: "password" },
      },
      async authorize(credentials) {
        if ((!credentials?.email && !credentials?.employeeId) || !credentials?.otp) return null;

        const email = (credentials.email as string) || undefined;
        const employeeId = (credentials.employeeId as string) || undefined;
        const otp = credentials.otp as string;
        const newPassword = (credentials.newPassword as string) || undefined;

        try {
          const result = await apiClient("/auth/verify-otp", {
            method: "POST",
            body: JSON.stringify({ email, employeeId, otp, newPassword }),
          });

          if (!result || !result.success) {
            const error = new CredentialsSignin();
            error.code = result?.code || result?.error || "AUTH_FAILED";
            throw error;
          }

          // Express backend returns: { success, token, mustResetPassword, user: { id, name, email, roles, ... } }
          const user = result.user;
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name || "User",
            roles: JSON.stringify(user.roles || []),
            activeRoleId: user.roles?.[0]?.id?.toString() ?? user.id.toString(),
            backendToken: result.token,
            mustResetPassword: result.mustResetPassword ?? false,
            isLegacyAccount: result.isLegacyAccount ?? false,
            hasProfileImage: result.hasProfileImage ?? false,
          };
        } catch (err: any) {
           if (err instanceof CredentialsSignin) throw err;
           const error = new CredentialsSignin();
           error.code = err.code || err.message || "AUTH_FAILED";
           throw error;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (account?.provider === "microsoft-entra-id" && user) {
        const cookieStore = await cookies();
        const employeeId = cookieStore.get("pending_employee_id")?.value;

        if (!employeeId) {
          throw new Error("Employee ID is missing. Please enter your Employee ID before logging in with Microsoft.");
        }

        try {
           const data = await apiClient("/auth/oauth-login", {
             method: "POST",
             body: JSON.stringify({ 
               employeeId, 
               email: user.email, 
               secret: process.env.JWT_SECRET,
               microsoftAccessToken: account.access_token || null,
             })
           });
           
           if (!data.success) {
             throw new Error(data.error || "Microsoft login failed.");
           }
           
           token.roles = JSON.stringify(data.user.roles || []);
           token.activeRoleId = data.user.roles?.[0]?.id?.toString() ?? data.user.id.toString();
           token.backendToken = data.token;
           token.mustResetPassword = data.mustResetPassword ?? false;
           token.isLegacyAccount = data.isLegacyAccount ?? false;
           token.hasProfileImage = data.hasProfileImage ?? false;
           
           // CRITICAL FIX: NextAuth automatically injects the entire OAuth profile
           // (picture, name, email, etc.) into the JWT token.
           // For Microsoft Entra, this can be massive and blow up the Nginx proxy buffer 
           // when NextAuth chunks it into multiple Set-Cookie headers.
           delete token.picture;
           delete token.name;
           delete token.email;
           delete (token as any).accessToken;
           delete (token as any).idToken;
           delete (token as any).profile;

        } catch (e: any) {
           console.error("OAuth Backend error:", e.message);
           throw new Error(e.message || "Failed to authenticate with backend.");
        }
      } else if (user) {
        token.roles = (user as any).roles;
        token.activeRoleId = (user as any).activeRoleId ?? user.id;
        token.backendToken = (user as any).backendToken;
        token.mustResetPassword = (user as any).mustResetPassword ?? false;
        token.isLegacyAccount = (user as any).isLegacyAccount ?? false;
        token.hasProfileImage = (user as any).hasProfileImage ?? false;
      }
      if (trigger === "update") {
        if (session?.activeRoleId) token.activeRoleId = session.activeRoleId;
        if (session?.mustResetPassword !== undefined) token.mustResetPassword = session.mustResetPassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        (session.user as any).roles = token.roles;
        (session.user as any).activeRoleId = token.activeRoleId;
        (session.user as any).backendToken = token.backendToken;
        (session.user as any).mustResetPassword = token.mustResetPassword ?? false;
        (session.user as any).isLegacyAccount = token.isLegacyAccount ?? false;
        (session.user as any).hasProfileImage = token.hasProfileImage ?? false;
      }
      return session;
    }
  },
  session: {
     strategy: "jwt",
  },
  pages: {
    signIn: "/",
    error: "/", // Redirect any OAuth errors back to the login page with ?error=...
  }
})
