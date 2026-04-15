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

          // Express backend returns: { success, token, user: { id, name, email, roles, ... } }
          const user = result.user;
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name || "User",
            roles: JSON.stringify(user.roles || []),
            activeRoleId: user.roles?.[0]?.id?.toString() ?? user.id.toString(),
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
