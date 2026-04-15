"use server";

import { apiClient } from "@/lib/apiClient";
import { revalidatePath } from "next/cache";

export async function getDistinctUsers() {
  const result = await apiClient("/teams", { method: "GET" }).catch(e => ({ data: [] }));
  return result.data || [];
}

export async function updateUserRoleStatus(id: number, status: string, lock_flag: boolean) {
  await apiClient(`/teams/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, lock_flag })
  });
  revalidatePath("/dashboard/teams");
}

export async function removeUserRole(id: number) {
  await apiClient(`/teams/${id}`, { method: "DELETE" });
  revalidatePath("/dashboard/teams");
}

export async function addUserRole(data: {
  user_name: string;
  finca_email: string;
  employee_id: string;
  login_id: string;
  user_no: string;
  user_role: string;
  branch: string;
}) {
  await apiClient("/teams", {
    method: "POST",
    body: JSON.stringify(data)
  });
  revalidatePath("/dashboard/teams");
}

export async function updateUserInformation(
  ids: number[],
  data: {
    user_name: string;
    finca_email: string;
    employee_id: string;
    login_id: string;
    user_no: string;
  }
) {
  await apiClient("/teams/bulk-info", {
    method: "PATCH",
    body: JSON.stringify({ ids, data })
  });
  revalidatePath("/dashboard/teams");
}
