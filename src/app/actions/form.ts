"use server";

import { apiClient } from "@/lib/apiClient";
import { revalidatePath } from "next/cache";

export type SignatoryInput = {
  position: number;
  userName: string;
  email: string;
};

export type SigningType = "sequential" | "parallel";

export async function getFormTemplates() {
  const result = await apiClient("/forms", { method: "GET" }).catch(e => ({ data: [] }));
  return result.data || [];
}

export async function getFormTemplate(id: string) {
  const result = await apiClient(`/forms/${id}`, { method: "GET" }).catch(e => ({ data: null }));
  return result.data || null;
}

import { auth } from "@/auth";

export async function isAdministrator() {
  const session = await auth().catch(() => null);
  if (!session?.user) return false;
  
  try {
    const rolesStr = (session.user as any).roles;
    if (!rolesStr) return false;
    const roles = typeof rolesStr === "string" ? JSON.parse(rolesStr) : rolesStr;
    const activeId = (session.user as any).activeRoleId;
    const activeRole = roles.find((r: any) => String(r.id) === String(activeId)) || roles[0];
    return activeRole?.user_role?.toLowerCase() === "administrator";
  } catch (e) {
    return false;
  }
}

export async function createFormTemplate(name: string, description: string, fields: any[], formOwner?: string, formTreater?: string, pdfTemplateId?: string, mobileEnabled: boolean = false, accountServicesEnabled: boolean = false, isInternal: boolean = false) {
  const result = await apiClient("/forms", {
    method: "POST",
    body: JSON.stringify({ name, description, fields, formOwner, formTreater, pdfTemplateId, mobileEnabled, accountServicesEnabled, isInternal })
  });
  revalidatePath("/dashboard/forms");
  return result;
}

export async function updateFormTemplate(id: string, name: string, description: string, fields: any[], formOwner?: string, formTreater?: string, pdfTemplateId?: string, mobileEnabled: boolean = false, accountServicesEnabled: boolean = false, isInternal: boolean = false) {
  const result = await apiClient(`/forms/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name, description, fields, formOwner, formTreater, pdfTemplateId, mobileEnabled, accountServicesEnabled, isInternal })
  });
  revalidatePath("/dashboard/forms");
  return result;
}

export async function deleteFormTemplate(id: string) {
  const result = await apiClient(`/forms/${id}`, { method: "DELETE" });
  revalidatePath("/dashboard/forms");
  return result;
}

export async function getBranches(): Promise<string[]> {
  const result = await apiClient("/forms/branches", { method: "GET" }).catch(e => ({ data: [] }));
  return result.data || [];
}

export async function getActionItems() {
  const result = await apiClient("/submissions/action-items", { method: "GET" }).catch(e => ({ data: [] }));
  return result.data || [];
}

export async function submitForm(formData: FormData) {
  const result = await apiClient("/submissions", {
    method: "POST",
    body: formData
  });
  revalidatePath("/dashboard/forms");
  return result;
}

export async function getMySubmissions() {
  const result = await apiClient("/submissions/my", { method: "GET" }).catch(e => ({ data: [] }));
  return result.data || [];
}

export async function getSubmission(id: string) {
  const result = await apiClient(`/submissions/${id}`, { method: "GET" }).catch(e => ({ data: null }));
  return result.data || null;
}

export async function getAllSubmissions() {
  const result = await apiClient("/submissions", { method: "GET" }).catch(e => ({ data: [] }));
  return result.data || [];
}

export async function searchUsers(query: string) {
  const result = await apiClient(`/forms/search-users?q=${encodeURIComponent(query)}`, { method: "GET" }).catch(e => ({ data: [] }));
  return result.data || [];
}

export async function fileAttachments(submissionId: string) {
  const result = await apiClient(`/submissions/${submissionId}/file-attachments`, { method: "POST" });
  revalidatePath("/dashboard/action");
  return result;
}

// ── PUT /api/v1/submissions/:id — edit & resubmit ─────────────────────────────
export async function editSubmission(
  id: string,
  body: {
    formResponses: Record<string, any>;
    signatories?: SignatoryInput[];
    signingType?: SigningType;
  }
) {
  try {
    const result = await apiClient(`/submissions/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    revalidatePath("/dashboard/forms");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to edit submission" };
  }
}

// ── DELETE /api/v1/submissions/:id ────────────────────────────────────────────
export async function deleteSubmission(id: string) {
  const result = await apiClient(`/submissions/${id}`, { method: "DELETE" });
  revalidatePath("/dashboard/forms");
  return result;
}
