"use server";

import { apiClient } from "@/lib/apiClient";
import { auth } from "@/auth";

export async function getAccountServicesStats() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return { pending: 0, inReview: 0, completed: 0, errors: 0 };
    }

    const response = await apiClient(`/mobile_dashboard?userId=${userId}`);
    if (response.success) {
      return response.stats;
    }

    return { pending: 0, inReview: 0, completed: 0, errors: 0 };
  } catch (error) {
    console.error("Failed to fetch account services stats:", error);
    return { pending: 0, inReview: 0, completed: 0, errors: 0 };
  }
}
