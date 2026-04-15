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
  const result = await apiClient("/forms/templates", { method: "GET" });
  return result.data || [];
}

export async function getFormTemplate(id: string) {
  const result = await apiClient(`/forms/templates/${id}`, { method: "GET" });
  return result.data || null;
}

export async function isAdministrator() {
  // Let the client or middleware check session, or perform an API call
  return false;
}

export async function createFormTemplate(name: string, description: string, fields: any[], formOwner?: string, formTreater?: string, htmlTemplate?: string) {
  const result = await apiClient("/forms/templates", {
    method: "POST",
    body: JSON.stringify({ name, description, fields, formOwner, formTreater, htmlTemplate })
  });
  revalidatePath("/dashboard/forms");
  return result;
}

export async function updateFormTemplate(id: string, name: string, description: string, fields: any[], formOwner?: string, formTreater?: string, htmlTemplate?: string) {
  const result = await apiClient(`/forms/templates/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, description, fields, formOwner, formTreater, htmlTemplate })
  });
  revalidatePath("/dashboard/forms");
  return result;
}

export async function deleteFormTemplate(id: string) {
  const result = await apiClient(`/forms/templates/${id}`, { method: "DELETE" });
  revalidatePath("/dashboard/forms");
  return result;
}

export async function getBranches(): Promise<string[]> {
  const result = await apiClient("/forms/branches", { method: "GET" });
  return result.data || [];
}

export async function getActionItems() {
  const result = await apiClient("/forms/action-items", { method: "GET" });
  return result.data || [];
}

export async function submitForm(templateId: string, formName: string, formResponses: Record<string, any>, signatories: SignatoryInput[], signingType: "sequential" | "parallel" = "sequential", initiatorToken?: string) {
  const result = await apiClient("/submissions", {
    method: "POST",
    body: JSON.stringify({ templateId, formName, formResponses, signatories, signingType, initiatorToken })
  });
  revalidatePath("/dashboard/forms");
  return result;
}

export async function getMySubmissions() {
  const result = await apiClient("/submissions/me", { method: "GET" });
  return result.data || [];
}

export async function getSubmission(id: string) {
  const result = await apiClient(`/submissions/${id}`, { method: "GET" });
  return result.data || null;
}

export async function getAllSubmissions() {
  const result = await apiClient("/submissions", { method: "GET" });
  return result.data || [];
}

export async function searchUsers(query: string) {
  const result = await apiClient(`/forms/users/search?q=${encodeURIComponent(query)}`, { method: "GET" });
  return result.data || [];
}

export async function fileAttachments(submissionId: string) {
  const result = await apiClient(`/submissions/${submissionId}/file-attachments`, { method: "POST" });
  revalidatePath("/dashboard/action");
  return result;
}
