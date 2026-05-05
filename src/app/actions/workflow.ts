"use server";

import { apiClient } from "@/lib/apiClient";
import { revalidatePath } from "next/cache";

export async function searchActiveWorkflowUsers(query: string) {
  const result = await apiClient(`/workflow/search-users?q=${encodeURIComponent(query)}`, { method: "GET" }).catch(e => ({ data: [] }));
  return result.data || [];
}

export async function assignToSelf(submissionId: string) {
  try {
    const result = await apiClient(`/workflow/${submissionId}/assign-self`, { method: "POST" });
    revalidatePath("/dashboard/action");
    return result;
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function revertAssignment(submissionId: string) {
  try {
    const result = await apiClient(`/workflow/${submissionId}/revert-assignment`, { method: "PATCH" });
    revalidatePath("/dashboard/action");
    return result;
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function completeProcessWithApprover(submissionId: string, approverEmail?: string, approverName?: string, signatureToken?: string) {
  try {
    const result = await apiClient(`/workflow/${submissionId}/complete`, {
      method: "POST",
      body: JSON.stringify({ approverEmail, approverName, signatureToken })
    });
    revalidatePath("/dashboard/action");
    revalidatePath("/dashboard/workflow");
    return result;
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function approveSubmission(submissionId: string, signatureToken: string) {
  try {
    const result = await apiClient(`/workflow/${submissionId}/approve`, {
      method: "POST",
      body: JSON.stringify({ signatureToken }),
    });
    revalidatePath("/dashboard/workflow");
    return result;
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function declineFinalApproval(submissionId: string) {
  try {
    const result = await apiClient(`/workflow/${submissionId}/decline-final`, { method: "POST" });
    revalidatePath("/dashboard/workflow");
    return result;
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function disapproveFinalApproval(submissionId: string, reason: string) {
  try {
    const result = await apiClient(`/workflow/${submissionId}/disapprove-final`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    revalidatePath("/dashboard/workflow");
    return result;
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getMyQueue() {
  const result = await apiClient("/workflow/queue", { method: "GET" }).catch(e => ({ data: [] }));
  return result.data || [];
}

export async function signSubmission(
  submissionId: string,
  payload?: { signatureData?: string; signatureToken?: string }
) {
  try {
    const result = await apiClient(`/workflow/${submissionId}/sign`, {
      method: "POST",
      body: JSON.stringify(payload || {})
    });
    revalidatePath("/dashboard/workflow");
    return result;
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// Updated: now accepts an optional reason for the decline
export async function declineSubmission(submissionId: string, reason?: string) {
  try {
    const result = await apiClient(`/workflow/${submissionId}/decline`, {
      method: "POST",
      body: JSON.stringify(reason?.trim() ? { reason: reason.trim() } : {}),
    });
    revalidatePath("/dashboard/workflow");
    return result;
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function disapproveSignatory(submissionId: string, reason: string) {
  try {
    const result = await apiClient(`/workflow/${submissionId}/disapprove-signatory`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    revalidatePath("/dashboard/workflow");
    return result;
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getSubmissionDetail(id: string) {
  const result = await apiClient(`/workflow/submissions/${id}`, { method: "GET" }).catch(e => ({ data: null }));
  return result.data || null;
}

// POST /api/v1/workflow/:submissionId/remind/:signatoryId
export async function remindSignatory(submissionId: string, signatoryId: string) {
  try {
    const result = await apiClient(`/workflow/${submissionId}/remind/${signatoryId}`, {
      method: "POST",
    });
    return result;
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// POST /api/v1/workflow/:submissionId/generate-pdf
export async function regeneratePdf(submissionId: string) {
  try {
    const result = await apiClient(`/workflow/${submissionId}/generate-pdf`, {
      method: "POST",
    });
    revalidatePath("/dashboard/forms");
    revalidatePath("/dashboard/action");
    return result;
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
