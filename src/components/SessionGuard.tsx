"use client";

/**
 * SessionGuard
 * Patches window.fetch globally to detect PASSWORD_CHANGED 401 responses
 * from the Express backend and immediately sign the user out.
 *
 * This handles all client-side fetch calls (HistoryModal, WorkflowClient, etc.)
 * as well as any server action that returns { error, code: "PASSWORD_CHANGED" }.
 *
 * Mount once at the dashboard layout level — no UI rendered.
 */

import { useEffect } from "react";
import { signOut } from "next-auth/react";

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
            if (data?.code === "PASSWORD_CHANGED") {
              signOut({ callbackUrl: "/" });
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
