"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * This page is no longer part of the active flow.
 * Password reset now happens inline during login (credentials → new-password → OTP).
 * Redirect any visitor here back to the login page.
 */
export default function ResetPasswordPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">Redirecting to login…</p>
      </div>
    </div>
  );
}
