"use server";

import { apiClient } from "@/lib/apiClient";
import { revalidatePath } from "next/cache";

export async function searchActiveWorkflowUsers(query: string) {
  const result = await apiClient(`/workflow/users/search?q=${encodeURIComponent(query)}`, { method: "GET" });
  return result.data || [];
}

export async function assignToSelf(submissionId: string) {
  const result = await apiClient(`/workflow/${submissionId}/assign`, { method: "POST" });
  revalidatePath("/dashboard/action");
  return result;
}

export async function completeProcessWithApprover(submissionId: string, approverEmail?: string, approverName?: string) {
  const result = await apiClient(`/workflow/${submissionId}/complete`, {
    method: "POST",
    body: JSON.stringify({ approverEmail, approverName })
  });
  revalidatePath("/dashboard/action");
  revalidatePath("/dashboard/workflow");
  return result;
}

export async function approveSubmission(submissionId: string) {
  const result = await apiClient(`/workflow/${submissionId}/approve`, { method: "POST" });
  revalidatePath("/dashboard/workflow");
  return result;
}

export async function getMyQueue() {
  const result = await apiClient("/workflow/queue", { method: "GET" });
  return result.data || [];
}

export async function signSubmission(
  submissionId: string,
  payload?: { signatureData?: string; signatureToken?: string }
) {
  const result = await apiClient(`/workflow/${submissionId}/sign`, {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
  revalidatePath("/dashboard/workflow");
  return result;
}

export async function declineSubmission(submissionId: string) {
  const result = await apiClient(`/workflow/${submissionId}/decline`, { method: "POST" });
  revalidatePath("/dashboard/workflow");
  return result;
}

export async function getSubmissionDetail(id: string) {
  const result = await apiClient(`/submissions/${id}`, { method: "GET" });
  return result.data || null;
}
