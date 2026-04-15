"use server";

import { apiClient } from "@/lib/apiClient";

export async function saveSecuritySignature(token: string, signatureBlob: string) {
  try {
    const result = await apiClient("/security/signature", {
      method: "POST",
      body: JSON.stringify({ token, signatureBlob })
    });
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to save security token and signature." };
  }
}

export async function verifySignatureToken(token: string) {
  try {
    const result = await apiClient("/security/verify", {
      method: "POST",
      body: JSON.stringify({ token })
    });
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || "Invalid signature token." };
  }
}

export async function getMySignature() {
  try {
    const result = await apiClient("/security/signature", { method: "GET" });
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to retrieve signature." };
  }
}
