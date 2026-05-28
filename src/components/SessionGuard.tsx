"use client";

/**
 * SessionGuard
 * Patches window.fetch globally to detect auth-related 401 responses
 * from the Express backend and immediately sign the user out.
 *
 * This handles all client-side fetch calls (HistoryModal, WorkflowClient, etc.)
 * as well as any server action that returns { error, code } with an auth error.
 *
 * Mount once at the dashboard layout level — no UI rendered.
 */

import { useEffect } from "react";
import { signOut } from "next-auth/react";

const AUTH_ERROR_CODES = new Set([
  "INVALID_TOKEN",
  "TOKEN_EXPIRED",
  "PASSWORD_CHANGED",
]);

export function SessionGuard() {
  useEffect(() => {
    const original = window.fetch;

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await original(...args);

      if (response.status === 401) {
        // Clone so the original caller can still consume the body
        const clone = response.clone();
        clone
          .json()
          .then((data) => {
            const code = data?.code || "";
            const msg = (data?.error || "").toLowerCase();
            const isAuthError =
              AUTH_ERROR_CODES.has(code) ||
              msg.includes("invalid") ||
              msg.includes("expired") ||
              msg.includes("token");

            if (isAuthError) {
              signOut({ callbackUrl: "/?reason=session_expired" });
            }
          })
          .catch(() => {});
      }

      return response;
    };

    return () => {
      window.fetch = original;
    };
  }, []);

  return null;
}

