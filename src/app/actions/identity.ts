"use server";

import { apiClient } from "@/lib/apiClient";

export type IdentityLog = {
  id: string;
  reference: string;
  idType: string;
  idNumber: string;
  subjectName: string;
  status: string;
  pdfPath: string | null;
  verifiedBy: string;
  createdAt: string;
  requestData: Record<string, any>;
  responseData: Record<string, any>;
};

export async function getIdentityLogs(params: {
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: IdentityLog[]; total: number; page: number; limit: number }> {
  const query = new URLSearchParams();
  if (params.type)   query.set("type",   params.type);
  if (params.search) query.set("search", params.search);
  if (params.page)   query.set("page",   String(params.page));
  if (params.limit)  query.set("limit",  String(params.limit));

  const result = await apiClient(`/identity/logs?${query.toString()}`, { method: "GET" }).catch(() => ({
    data: [], total: 0, page: 1, limit: 20,
  }));
  return {
    data:  result.data  ?? [],
    total: result.total ?? 0,
    page:  result.page  ?? 1,
    limit: result.limit ?? 20,
  };
}

export async function checkIdentityHistory(idType: string, idNumber: string): Promise<{ success: boolean; data?: IdentityLog | null; error?: string }> {
  return apiClient(`/identity/lookup/${encodeURIComponent(idType)}/${encodeURIComponent(idNumber)}`, {
    method: "GET",
  }).catch((e: any) => ({ success: false, error: e.message }));
}

export async function runBvnCheck(payload: {
  idNumber: string;
  firstname: string;
  lastname: string;
  dob?: string;
  phone?: string;
  email?: string;
  gender?: string;
  forceNew?: boolean;
  cloneFromReference?: string;
}): Promise<{ success: boolean; data?: any; reference?: string; status?: string; error?: string }> {
  return apiClient(`/identity/bvn/${encodeURIComponent(payload.idNumber)}`, {
    method: "POST",
    body: JSON.stringify({
      firstname: payload.firstname,
      lastname:  payload.lastname,
      dob:       payload.dob,
      phone:     payload.phone,
      email:     payload.email,
      gender:    payload.gender,
      forceNew:  payload.forceNew,
      cloneFromReference: payload.cloneFromReference,
    }),
  }).catch((e: any) => ({ success: false, error: e.message }));
}

export async function runNinCheck(payload: {
  idNumber: string;
  firstname: string;
  lastname: string;
  middlename?: string;
  dob?: string;
  phone?: string;
  email?: string;
  gender?: string;
  forceNew?: boolean;
  cloneFromReference?: string;
}): Promise<{ success: boolean; data?: any; reference?: string; status?: string; error?: string }> {
  return apiClient(`/identity/nin/${encodeURIComponent(payload.idNumber)}`, {
    method: "POST",
    body: JSON.stringify({
      firstname:  payload.firstname,
      lastname:   payload.lastname,
      middlename: payload.middlename,
      dob:        payload.dob,
      phone:      payload.phone,
      email:      payload.email,
      gender:     payload.gender,
      forceNew:   payload.forceNew,
      cloneFromReference: payload.cloneFromReference,
    }),
  }).catch((e: any) => ({ success: false, error: e.message }));
}
