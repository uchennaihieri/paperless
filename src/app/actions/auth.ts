"use server";

import { apiClient } from "@/lib/apiClient";

export async function sendOTP(email: string) {
  try {
    const data = await apiClient("/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return data;
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    return { success: false, error: error.message || "Failed to send OTP. Please try again." };
  }
}
