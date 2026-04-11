"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SignatoryInput = {
  position: number;
  userName: string;
  email: string;
};

export type SigningType = "sequential" | "parallel";

// ─── Templates ────────────────────────────────────────────────────────────────

export async function getFormTemplates() {
  return prisma.formTemplate.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getFormTemplate(id: string) {
  return prisma.formTemplate.findUnique({ where: { id } });
}

export async function isAdministrator() {
  const session = await auth();
  const roles: any[] = JSON.parse((session?.user as any)?.roles ?? "[]");
  const activeId = (session?.user as any)?.activeRoleId;
  const active = roles.find((r: any) => r.id === activeId) ?? roles[0];
  return active?.user_role?.toLowerCase() === "administrator";
}


export async function createFormTemplate(
  name: string,
  description: string,
  fields: any[],
  formOwner?: string,
  formTreater?: string,
  htmlTemplate?: string
) {
  const session = await auth();
  const roles: any[] = JSON.parse((session?.user as any)?.roles ?? "[]");
  const activeId = (session?.user as any)?.activeRoleId;
  const active = roles.find((r: any) => r.id === activeId) ?? roles[0];

  if (!active || active.user_role?.toLowerCase() !== "administrator") {
    return { success: false, error: "Only Administrators can create forms." };
  }

  try {
    const template = await prisma.formTemplate.create({
      data: { 
        name, 
        description, 
        fields, 
        formOwner: formOwner ?? null, 
        formTreater: formTreater ?? null,
        htmlTemplate: htmlTemplate ?? null 
      },
    });
    revalidatePath("/dashboard/forms");
    return { success: true, data: template };
  } catch (error: any) {
    if (error?.code === "P2002")
      return { success: false, error: "A form with this name already exists." };
    return { success: false, error: "Failed to create form." };
  }
}

// ─── Fetch distinct branches from users table ─────────────────────────────────

export async function getBranches(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { branch: { not: null }, status: { equals: "active", mode: "insensitive" } },
    select: { branch: true },
    distinct: ["branch"],
    orderBy: { branch: "asc" },
  });
  return rows.map((r) => r.branch!).filter(Boolean);
}

// ─── Action Center: completed forms where template.formTreater === user's branch ─

export async function getActionItems() {
  const session = await auth();
  const roles: any[] = JSON.parse((session?.user as any)?.roles ?? "[]");
  const activeId = (session?.user as any)?.activeRoleId;
  const active = roles.find((r: any) => r.id === activeId) ?? roles[0];
  const userBranch: string | null = active?.branch ?? null;

  if (!userBranch) return [];

  return prisma.formSubmission.findMany({
    where: {
      status: { in: ["Completed", "Filed"] },
      template: {
        formTreater: { equals: userBranch, mode: "insensitive" },
      },
    },
    include: {
      template: { select: { name: true, formOwner: true, formTreater: true } },
      signatories: { orderBy: { position: "asc" } },
      submittedBy: { select: { user_name: true, finca_email: true, branch: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Submissions ──────────────────────────────────────────────────────────────

export async function submitForm(
  templateId: string,
  formName: string,
  formResponses: Record<string, any>,
  signatories: SignatoryInput[],
  signingType: "sequential" | "parallel" = "sequential"
) {
  const session = await auth();
  const roles: any[] = JSON.parse((session?.user as any)?.roles ?? "[]");
  const activeId = (session?.user as any)?.activeRoleId;
  const active = roles.find((r: any) => r.id === activeId) ?? roles[0];

  try {
    const submission = await prisma.formSubmission.create({
      data: {
        formName,
        formResponses,
        signingType,
        submittedById: active?.id ?? null,
        templateId,
        signatories: {
          create: signatories.map((s) => ({
            position: s.position,
            userName: s.userName,
            email: s.email,
          })),
        },
      },
      include: { signatories: true },
    });
    revalidatePath("/dashboard/forms");
    return { success: true, data: submission };
  } catch (error) {
    console.error("Failed to submit form", error);
    return { success: false, error: "Failed to submit form." };
  }
}

export async function getMySubmissions() {
  const session = await auth();
  if (!session?.user) return [];
  
  const roles: any[] = JSON.parse((session?.user as any)?.roles ?? "[]");
  const activeId = (session?.user as any)?.activeRoleId;
  const active = roles.find((r: any) => r.id === activeId) ?? roles[0];

  if (!active?.id) return [];

  return prisma.formSubmission.findMany({
    where: { submittedById: active.id },
    orderBy: { createdAt: "desc" },
    include: { signatories: { orderBy: { position: "asc" } } },
  });
}

export async function getSubmission(id: string) {
  return prisma.formSubmission.findUnique({
    where: { id },
    include: {
      signatories: { orderBy: { position: "asc" } },
      template: true,
    },
  });
}

export async function getAllSubmissions() {
  return prisma.formSubmission.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      signatories: { orderBy: { position: "asc" } },
      submittedBy: { select: { user_name: true, finca_email: true, branch: true } },
    },
  });
}

// ─── User search for signatories ──────────────────────────────────────────────

export async function searchUsers(query: string) {
  if (!query || query.length < 2) return [];
  return prisma.user.findMany({
    where: {
      status: { equals: "active", mode: "insensitive" },
      OR: [
        { user_name: { contains: query, mode: "insensitive" } },
        { finca_email: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, user_name: true, finca_email: true, branch: true, user_role: true },
    take: 15,
  });
}

import fs from "fs/promises";
import path from "path";

export async function fileAttachments(submissionId: string) {
  try {
    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: { template: true },
    });

    if (!submission) return { success: false, error: "Submission not found" };

    // Create a local folder for the attachments
    const folderPath = path.join(process.cwd(), "filed_attachments", submissionId);
    await fs.mkdir(folderPath, { recursive: true });

    // Simulate saving attachments
    const content = `Form: ${submission.formName}\nDate: ${submission.createdAt}\n\nResponses:\n${JSON.stringify(submission.formResponses, null, 2)}`;
    await fs.writeFile(path.join(folderPath, "form_data_and_attachments.txt"), content);

    // Update status to 'Filed'
    await prisma.formSubmission.update({
      where: { id: submissionId },
      data: { status: "Filed" },
    });

    // Revalidate Action Center
    revalidatePath("/dashboard/action");
    return { success: true };
  } catch (error) {
    console.error("Failed to file attachments", error);
    return { success: false, error: "Failed to file attachments" };
  }
}
