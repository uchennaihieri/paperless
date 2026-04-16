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
    return { success: false, error: err.message || "Invalid signature token." };
  }
}

// ── GET /api/v1/security/my-signature ────────────────────────────────────────
export async function getMySignature() {
  try {
    const result = await apiClient("/security/my-signature", { method: "GET" });
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to retrieve signature." };
  }
}
