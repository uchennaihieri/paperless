"use server";

import { apiClient } from "@/lib/apiClient";

export type CreditBureauLog = {
  id: string;
  reference: string;
  bureau: string;
  bvn: string;
  subjectName: string;
  status: string;
  matchCount: number;
  pdfPath: string | null;
  enquiryReason: string;
  verifiedBy: string;
  createdAt: string;
  requestData: Record<string, any>;
  responseData: Record<string, any>;
  reportData: Record<string, any> | null;
};

export async function getCreditBureauLogs(params: {
  bureau?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: CreditBureauLog[]; total: number; page: number; limit: number }> {
  const query = new URLSearchParams();
  if (params.bureau) query.set("bureau", params.bureau);
  if (params.search) query.set("search", params.search);
  if (params.page)   query.set("page",   String(params.page));
  if (params.limit)  query.set("limit",  String(params.limit));

  const result = await apiClient(`/credit-bureau/logs?${query.toString()}`, { method: "GET" }).catch(() => ({
    data: [], total: 0, page: 1, limit: 20,
  }));
  return { data: result.data ?? [], total: result.total ?? 0, page: result.page ?? 1, limit: result.limit ?? 20 };
}

export async function checkCrbHistory(bvn: string): Promise<{ success: boolean; data?: CreditBureauLog | null; error?: string }> {
  return apiClient(`/credit-bureau/lookup/${encodeURIComponent(bvn)}`, {
    method: "GET",
  }).catch((e: any) => ({ success: false, error: e.message }));
}

export async function runFirstCentralCheck(payload: {
  bvn: string;
  enquiryReason?: string;
  productId?: number;
  forceNew?: boolean;
  cloneFromReference?: string;
}): Promise<{ success: boolean; id?: string; reference?: string; status?: string; count?: number; matched?: any[]; verifiedBy?: string; createdAt?: string; subjectName?: string; error?: string }> {
  return apiClient("/credit-bureau/consumer/bvn", {
    method: "POST",
    body: JSON.stringify(payload),
  }).catch((e: any) => ({ success: false, error: e.message }));
}

export async function runFirstCentralReport(payload: {
  reference: string;
  consumerID: string;
  enquiryID: string;
  subscriberEnquiryEngineID: string;
}): Promise<{ success: boolean; report?: any; error?: string }> {
  return apiClient("/credit-bureau/consumer/report", {
    method: "POST",
    body: JSON.stringify(payload),
  }).catch((e: any) => ({ success: false, error: e.message }));
}

export async function runCreditRegistryCheck(payload: {
  bvn: string;
  forceNew?: boolean;
  cloneFromReference?: string;
}): Promise<{
  success: boolean; id?: string; reference?: string; status?: string;
  count?: number; searchResult?: any[]; report?: any;
  verifiedBy?: string; createdAt?: string; subjectName?: string; error?: string;
}> {
  return apiClient("/credit-bureau/consumer/bvn", {
    method: "POST",
    body: JSON.stringify({ ...payload, bureau: "creditregistry" }),
  }).catch((e: any) => ({ success: false, error: e.message }));
}
