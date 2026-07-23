"use server";

import { apiClient } from "@/lib/apiClient";

export async function getProfile() {
  try {
    const data = await apiClient("/auth/profile", {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    return data?.profile || null;
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return null;
  }
}
