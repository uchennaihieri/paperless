"use server";

import prisma from "@/lib/prisma";
import { isAdministrator } from "./form";
import { revalidatePath } from "next/cache";

export async function getDistinctUsers() {
  const isAdmin = await isAdministrator();
  if (!isAdmin) {
    throw new Error("Unauthorized: Only administrators can view teams");
  }

  const users = await prisma.user.findMany({
    where: {
      status: { equals: 'active', mode: 'insensitive' },
      OR: [
        { lock_flag: false },
        { lock_flag: null }
      ]
    },
    orderBy: { user_name: 'asc' }
  });

  const grouped = users.reduce((acc, user) => {
    // Group primarily by email, fallback to employee_id or stringified id
    const key = user.finca_email || user.employee_id || user.id.toString();
    if (!acc[key]) {
      acc[key] = {
        key,
        email: user.finca_email,
        employee_id: user.employee_id,
        user_name: user.user_name,
        login_id: user.login_id,
        user_no: user.user_no,
        roles: []
      };
    }
    acc[key].roles.push(user);
    return acc;
  }, {} as Record<string, any>);

  return Object.values(grouped);
}

export async function updateUserRoleStatus(id: number, status: string, lock_flag: boolean) {
  const isAdmin = await isAdministrator();
  if (!isAdmin) throw new Error("Unauthorized");

  await prisma.user.update({
    where: { id },
    data: { status, lock_flag }
  });
  revalidatePath("/dashboard/teams");
}

export async function removeUserRole(id: number) {
  const isAdmin = await isAdministrator();
  if (!isAdmin) throw new Error("Unauthorized");

  await prisma.user.delete({
    where: { id }
  });
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
  const isAdmin = await isAdministrator();
  if (!isAdmin) throw new Error("Unauthorized");

  const maxUser = await prisma.user.aggregate({ _max: { id: true } });
  const nextId = (maxUser._max.id || 0) + 1;

  await prisma.user.create({
    data: {
      ...data,
      id: nextId,
      status: 'active',
      lock_flag: false,
      creation_date: new Date()
    }
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
  const isAdmin = await isAdministrator();
  if (!isAdmin) throw new Error("Unauthorized");

  await prisma.user.updateMany({
    where: {
      id: { in: ids }
    },
    data: {
      user_name: data.user_name,
      finca_email: data.finca_email,
      employee_id: data.employee_id,
      login_id: data.login_id,
      user_no: data.user_no,
    }
  });

  revalidatePath("/dashboard/teams");
}
