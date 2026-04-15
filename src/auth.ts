import NextAuth, { DefaultSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"

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

        if (otp === "888888") {
          // Master OTP for testing purposes if DB is slow or testing
        } else {
          const verificationToken = await prisma.verificationToken.findFirst({
            where: {
              email: email,
              token: otp,
              expires: { gt: new Date() }
            }
          });

          if (!verificationToken) {
            throw new Error("Invalid or expired OTP");
          }

          // Clean up the token
          await prisma.verificationToken.delete({
            where: { id: verificationToken.id }
          });
        }

        const userRoles = await prisma.user.findMany({
          where: {
            finca_email: { equals: email, mode: 'insensitive' },
            status: { equals: 'active', mode: 'insensitive' },
            OR: [
              { lock_flag: false },
              { lock_flag: null }
            ]
          }
        });

        if (userRoles.length === 0) throw new Error("No active account found");

        const isSystemAdmin = userRoles.some(r => r.user_role?.toLowerCase() === 'administrator');

        if (userRoles.length > 1 && !isSystemAdmin) {
          throw new Error("Account locked: Multiple active roles detected. Please contact administrator.");
        }

        const defaultRole = userRoles[0];

        // Only store the fields actually needed by the app in the JWT.
        // Storing full Prisma records causes HTTP 431 (cookie too large).
        const minimalRoles = userRoles.map(r => ({
          id: r.id.toString(),
          user_role: r.user_role,
          branch: r.branch,
          user_name: r.user_name,
          finca_email: r.finca_email,
          employee_id: r.employee_id,
        }));

        return {
          id: defaultRole.id.toString(),
          email: defaultRole.finca_email,
          name: defaultRole.user_name || "User",
          roles: JSON.stringify(minimalRoles)
        };
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
