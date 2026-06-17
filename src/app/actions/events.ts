"use server";

import { apiClient } from "@/lib/apiClient";
import { revalidatePath } from "next/cache";

export async function createEvent(data: any) {
  try {
    const res = await apiClient("/events", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res?.success) {
      revalidatePath("/dashboard/account-services/events");
      return { success: true, event: res.event };
    }
    return { success: false, error: res?.error || "Failed to create event" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateEvent(id: string, data: any) {
  try {
    const res = await apiClient(`/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (res?.success) {
      revalidatePath("/dashboard/account-services/events");
      return { success: true, event: res.event };
    }
    return { success: false, error: res?.error || "Failed to update event" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteEvent(id: string) {
  try {
    const res = await apiClient(`/events/${id}`, {
      method: "DELETE",
    });
    if (res?.success) {
      revalidatePath("/dashboard/account-services/events");
      return { success: true };
    }
    return { success: false, error: res?.error || "Failed to delete event" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
