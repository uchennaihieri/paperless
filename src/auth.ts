import NextAuth, { DefaultSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { apiClient } from "@/lib/apiClient"

declare module "next-auth" {
  interface Session {
    user: {
      roles: string;
      activeRoleId: string;
      backendToken: string;
      mustResetPassword: boolean;
    } & DefaultSession["user"]
  }
}

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  basePath: "/api/auth",
  providers: [
    CredentialsProvider({
      name: "OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) return null;

        const email = credentials.email as string;
        const otp = credentials.otp as string;

        try {
          const result = await apiClient("/auth/verify-otp", {
            method: "POST",
            body: JSON.stringify({ email, otp }),
          });

          if (!result || !result.success) {
            throw new Error(result.error || "Invalid OTP or account inactive");
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
          };
        } catch (err: any) {
           throw new Error(err.message || "Failed to authenticate");
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.roles = (user as any).roles;
        token.activeRoleId = (user as any).activeRoleId ?? user.id;
        token.backendToken = (user as any).backendToken;
        token.mustResetPassword = (user as any).mustResetPassword ?? false;
        token.isLegacyAccount = (user as any).isLegacyAccount ?? false;
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
      }
      return session;
    }
  },
  session: {
     strategy: "jwt",
  },
  pages: {
    signIn: "/",
  }
})
