"use server";

import { apiClient } from "@/lib/apiClient";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BugReport = {
  id: number;
  title: string;
  description: string;
  type: string;
  isAnonymous: boolean;
  status: string;
  postedById: number;
  fixedByEmail: string | null;
  fixComment: string | null;
  fixedAt: string | null;
  createdAt: string;
  updatedAt: string;
  postedBy: { user_name: string | null; finca_email: string | null };
  attachments: BugAttachment[];
  comments?: BugComment[];
  upvotes?: { userEmail: string }[];
  _count: { comments: number; upvotes: number };
};

export type BugAttachment = {
  id: string;
  originalName: string;
  filePath?: string;
  mimeType: string;
  size: number;
};

export type BugComment = {
  id: string;
  bugReportId: number;
  authorName: string;
  authorEmail: string;
  content: string;
  createdAt: string;
};

export type BugMeta = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

// ── Actions ───────────────────────────────────────────────────────────────────

export async function getBugs(params: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: BugReport[]; meta: BugMeta }> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));

  const result = await apiClient(`/bugs?${query.toString()}`, { method: "GET" }).catch(() => ({
    data: [],
    meta: { total: 0, page: 1, limit: 20, pages: 0 },
  }));

  return {
    data: result.data || [],
    meta: result.meta || { total: 0, page: 1, limit: 20, pages: 0 },
  };
}

export async function getBugDetail(id: number): Promise<BugReport | null> {
  const result = await apiClient(`/bugs/${id}`, { method: "GET" }).catch(() => null);
  return result;
}

export async function createBug(formData: FormData): Promise<BugReport | null> {
  const result = await apiClient("/bugs", {
    method: "POST",
    body: formData,
    headers: {},
  }).catch(() => null);
  return result;
}

export async function toggleUpvote(
  bugId: number,
  userEmail: string
): Promise<{ upvoted: boolean; count: number } | null> {
  const result = await apiClient(`/bugs/${bugId}/upvote`, {
    method: "POST",
    body: JSON.stringify({ userEmail }),
  }).catch(() => null);
  return result;
}

export async function addComment(
  bugId: number,
  authorName: string,
  authorEmail: string,
  content: string
): Promise<BugComment | null> {
  const result = await apiClient(`/bugs/${bugId}/comment`, {
    method: "POST",
    body: JSON.stringify({ authorName, authorEmail, content }),
  }).catch(() => null);
  return result;
}

export async function fixBug(
  bugId: number,
  fixComment: string,
  fixedByEmail: string,
  fixedByName: string,
  userRole: string,
  specialAccess: string
): Promise<BugReport | null> {
  const result = await apiClient(`/bugs/${bugId}/fix`, {
    method: "PUT",
    body: JSON.stringify({ fixComment, fixedByEmail, fixedByName, userRole, specialAccess }),
  }).catch(() => null);
  return result;
}
