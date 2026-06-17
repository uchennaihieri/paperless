"use server";

import { apiClient } from "@/lib/apiClient";

// ── POST /api/v1/security/register ───────────────────────────────────────────
export async function saveSecuritySignature(token: string, signatureBlob: string) {
  try {
    const result = await apiClient("/security/register", {
      method: "POST",
      body: JSON.stringify({ token, signatureBlob })
    });
    return result;
  } catch (err: any) {
    if (err?.message === "NEXT_REDIRECT" || err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    return { success: false, error: err.message || "Failed to save security token and signature." };
  }
}

// ── POST /api/v1/security/verify-token ───────────────────────────────────────
export async function verifySignatureToken(token: string) {
  try {
    const result = await apiClient("/security/verify-token", {
      method: "POST",
      body: JSON.stringify({ token })
    });
    return result;
  } catch (err: any) {
    if (err?.message === "NEXT_REDIRECT" || err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    return { success: false, error: err.message || "Invalid signature token." };
  }
}

// ── GET /api/v1/security/my-signature ────────────────────────────────────────
export async function getMySignature() {
  try {
    const result = await apiClient("/security/my-signature", { method: "GET" });
    return result;
  } catch (err: any) {
    if (err?.message === "NEXT_REDIRECT" || err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    return { success: false, error: err.message || "Failed to retrieve signature." };
  }
}

// ── GET /api/v1/security/notification-preferences ─────────────────────────────
export async function getNotificationPreferences() {
  const DEFAULT_PREFERENCES = {
    channels: {
      email: true,
      teams: false,
    },
    patterns: {
      onSubmitForm: false,
      onToSign: true,
      onFinalApprover: false,
      onMyFormSigned: false,
      onMyFormProcessing: false,
      onMyFormCompleted: true,
      onBusinessUnitTreat: false,
      onMyFormDeclined: true,
    }
  };

  try {
    const result = await apiClient("/security/notification-preferences", { method: "GET" });
    
    // If the backend doesn't return preferences (or returns success: false because they don't exist)
    if (!result.preferences || Object.keys(result.preferences).length === 0) {
      return { success: true, preferences: DEFAULT_PREFERENCES };
    }
    
    return result;
  } catch (err: any) {
    if (err?.message === "NEXT_REDIRECT" || err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    // Catch ANY error (not just 404) and fallback to defaults so the UI never breaks
    console.warn("Notification Preferences API Failed - Falling back to defaults:", err?.message);
    return { success: true, preferences: DEFAULT_PREFERENCES };
  }
}

// ── POST /api/v1/security/notification-preferences ────────────────────────────
export async function saveNotificationPreferences(preferences: any) {
  try {
    const result = await apiClient("/security/notification-preferences", {
      method: "POST",
      body: JSON.stringify({ preferences })
    });
    return result;
  } catch (err: any) {
    if (err?.message === "NEXT_REDIRECT" || err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    return { success: false, error: err.message || "Failed to save notification preferences." };
  }
}
