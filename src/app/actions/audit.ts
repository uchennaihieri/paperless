"use server";

import { apiClient } from "@/lib/apiClient";

export type AuditRecord = {
  id: string;
  formReference: string | null;
  prevStatus: string;
  newStatus: string;
  action: string;
  actorName: string | null;
  actorEmail: string | null;
  note: string | null;
  createdAt: string;
};

export type AuditMeta = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export async function getAuditTrail(params: {
  reference?: string;
  email?: string;
  status?: string;
  date?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: AuditRecord[]; meta: AuditMeta }> {
  const query = new URLSearchParams();
  if (params.reference) query.set("reference", params.reference);
  if (params.email)     query.set("email", params.email);
  if (params.status)    query.set("status", params.status);
  if (params.date)      query.set("date", params.date);
  if (params.page)      query.set("page", String(params.page));
  if (params.limit)     query.set("limit", String(params.limit));

  const result = await apiClient(`/audit?${query.toString()}`, { method: "GET" }).catch(() => ({
    data: [], meta: { total: 0, page: 1, limit: 50, pages: 0 },
  }));
  return {
    data: result.data || [],
    meta: result.meta || { total: 0, page: 1, limit: 50, pages: 0 },
  };
}
