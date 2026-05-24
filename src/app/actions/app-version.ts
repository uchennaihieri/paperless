"use server";

import { apiClient } from "@/lib/apiClient";

export interface AppVersion {
  id: string;
  version: string;
  downloadUrl: string;
  releaseNotes?: string | null;
  publishedAt: string;
  publishedBy?: string;
}

export async function getLatestAppVersion(): Promise<AppVersion | null> {
  try {
    const res = await apiClient("/app-version", { method: "GET", next: { revalidate: 0 } });
    return res.data ?? null;
  } catch {
    return null;
  }
}

export async function publishAppVersion(body: {
  version: string;
  downloadUrl: string;
  releaseNotes?: string;
}): Promise<{ success: boolean; data?: AppVersion; error?: string }> {
  return apiClient("/app-version", { method: "PUT", body: JSON.stringify(body) });
}

export async function getAppVersionHistory(): Promise<AppVersion[]> {
  try {
    const res = await apiClient("/app-version/history", { method: "GET" });
    return res.data ?? [];
  } catch {
    return [];
  }
}
