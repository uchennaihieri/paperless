"use server";

import { apiClient } from "@/lib/apiClient";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MyReport {
  id: string;
  name: string;
  description: string;
}

export interface ReportAccessEntry {
  userEmail: string;
  grantedAt: string;
}

export interface AdminReport extends MyReport {
  script: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  access: ReportAccessEntry[];
}

export interface Branch {
  id: string;
  name: string;
}

// ── Actions ───────────────────────────────────────────────────────────────────

// GET /api/v1/reports/my-reports — all authenticated users
export async function getMyReports(): Promise<MyReport[]> {
  const result = await apiClient("/reports/my-reports", { method: "GET" }).catch(() => ({ data: [] }));
  return result.data || [];
}

// GET /api/v1/reports — admin only
export async function getAllReports(): Promise<AdminReport[]> {
  const result = await apiClient("/reports", { method: "GET" }).catch(() => ({ data: [] }));
  return result.data || [];
}

// GET /api/v1/reports/:id — admin only
export async function getReport(id: string): Promise<AdminReport | null> {
  const result = await apiClient(`/reports/${id}`, { method: "GET" }).catch(() => ({ data: null }));
  return result.data || null;
}

// POST /api/v1/reports — admin only
export async function createReport(body: {
  name: string;
  description: string;
  script: string;
  granted_emails: string[];
}) {
  return apiClient("/reports", { method: "POST", body: JSON.stringify(body) });
}

// PUT /api/v1/reports/:id — admin only
export async function updateReport(
  id: string,
  body: { name?: string; description?: string; script?: string; granted_emails?: string[] }
) {
  return apiClient(`/reports/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

// DELETE /api/v1/reports/:id — admin only
export async function deleteReport(id: string) {
  return apiClient(`/reports/${id}`, { method: "DELETE" });
}

// POST /api/v1/reports/:id/spool — any user with access
export async function spoolReport(
  id: string,
  body: { from_date: string; to_date: string; branch: string }
) {
  return apiClient(`/reports/${id}/spool`, { method: "POST", body: JSON.stringify(body) });
}

// GET /api/v1/branches — all authenticated users
export async function getBranches(): Promise<Branch[]> {
  const result = await apiClient("/branches", { method: "GET" }).catch(() => ({ data: [] }));
  return result.data || [];
}
