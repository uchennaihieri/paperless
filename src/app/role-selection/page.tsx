import { auth } from "@/auth";
import { redirect } from "next/navigation";
import RoleSelectionClient from "./client-page";

export default async function RoleSelectionPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  // The roles are injected into session during JWT callback in NextAuth
  const roles = JSON.parse((session.user as any).roles || "[]");

  // If there's only one role, maybe we just auto-login or let them still see it
  if (roles.length === 0) {
    // Edge case
    redirect("/");
  }

  return <RoleSelectionClient roles={roles} />;
}
