import NextAuth, { DefaultSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { apiClient } from "@/lib/apiClient"

declare module "next-auth" {
  interface Session {
    user: {
      roles: string;
      activeRoleId: string;
    } & DefaultSession["user"]
  }
}

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
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

          // The Express backend should return the default role/user info in result.data
          // Let's assume it returns user and minimalRoles
          return {
             id: result.data.id.toString(),
             email: result.data.finca_email,
             name: result.data.user_name || "User",
             roles: JSON.stringify(result.data.minimalRoles || [result.data])
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
        token.activeRoleId = user.id;
      }
      if (trigger === "update" && session?.activeRoleId) {
        token.activeRoleId = session.activeRoleId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        (session.user as any).roles = token.roles;
        (session.user as any).activeRoleId = token.activeRoleId;
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
