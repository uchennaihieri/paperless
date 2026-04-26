"use server";

import { apiClient } from "@/lib/apiClient";

export async function getPrerequisites(submissionId: string) {
  try {
    const result = await apiClient(`/prerequisites/for/${submissionId}`, { method: "GET" });
    return result.data || [];
  } catch {
    return [];
  }
}

export async function sendPrerequisiteReminder(prereqId: string) {
  try {
    const result = await apiClient(`/prerequisites/${prereqId}/remind`, { method: "POST" });
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send reminder" };
  }
}
