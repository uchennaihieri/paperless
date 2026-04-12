"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

import { verifySignatureToken } from "./security";

// ─── Add Action Center operations ─────────────────────────────────────────────

export async function searchActiveWorkflowUsers(query: string) {
  if (!query || query.length < 2) return [];
  return prisma.user.findMany({
    where: {
      status: { equals: "active", mode: "insensitive" },
      OR: [
        { user_name: { contains: query, mode: "insensitive" } },
        { finca_email: { contains: query, mode: "insensitive" } },
      ]
    },
    select: { user_name: true, finca_email: true },
    take: 10,
    distinct: ["finca_email"]
  });
}

export async function assignToSelf(submissionId: string) {
  const session = await auth();
  const roles: any[] = JSON.parse((session?.user as any)?.roles ?? "[]");
  const activeId = (session?.user as any)?.activeRoleId;
  const active = roles.find((r: any) => r.id === activeId) ?? roles[0];
  const userName: string = active?.user_name || (session?.user as any)?.user_name || "Unknown";
  const firstName = userName.split(" ")[0];
  const newStatus = `Assigned to ${firstName}`;
  try {
    await prisma.formSubmission.update({
      where: { id: submissionId },
      data: { status: newStatus }
    });
    revalidatePath("/dashboard/action");
    return { success: true, newStatus };
  } catch (err) {
    return { success: false, error: "Failed to assign." };
  }
}

export async function completeProcessWithApprover(submissionId: string, approverEmail?: string, approverName?: string) {
  try {
    if (!approverEmail) {
      await prisma.formSubmission.update({
        where: { id: submissionId },
        data: { status: "Completed" }
      });
    } else {
      const existingSigs = await prisma.submissionSignatory.findMany({
        where: { submissionId }
      });
      const maxPos = existingSigs.length > 0 ? Math.max(...existingSigs.map(s => s.position)) : 0;
      
      await prisma.submissionSignatory.create({
        data: {
          submissionId,
          userName: approverName!,
          email: approverEmail,
          position: maxPos + 1,
          status: "Pending"
        }
      });
      await prisma.formSubmission.update({
        where: { id: submissionId },
        data: { status: "In-review" }
      });
    }
    revalidatePath("/dashboard/action");
    return { success: true };
  } catch (err) {
    return { success: false, error: "Failed to complete process." };
  }
}

// ─── Get the active user's email from session ──────────────────────────────

async function getActiveEmail(): Promise<string | null> {
  const session = await auth();
  const roles: any[] = JSON.parse((session?.user as any)?.roles ?? "[]");
  const activeId = (session?.user as any)?.activeRoleId;
  const active = roles.find((r: any) => r.id === activeId) ?? roles[0];
  return active?.finca_email ?? session?.user?.email ?? null;
}

// ─── Fetch items in the user's queue ──────────────────────────────────────────
//
// Rules:
//  - Sequential: the user's signatory row is Pending AND no lower-position
//    row for the same submission is also Pending (i.e. all positions before
//    theirs are already Signed).
//  - Parallel:   the user's signatory row is Pending (order doesn't matter).
//

export async function getMyQueue() {
  const email = await getActiveEmail();
  if (!email) return [];

  // Fetch all submissions where this user is a Pending signatory
  const candidates = await prisma.formSubmission.findMany({
    where: {
      signatories: {
        some: {
          email: { equals: email, mode: "insensitive" },
          status: "Pending",
        },
      },
    },
    include: {
      signatories: { orderBy: { position: "asc" } },
      submittedBy: {
        select: { user_name: true, finca_email: true, branch: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Apply per-submission queue eligibility filter
  return candidates.filter((submission) => {
    const myRow = submission.signatories.find(
      (s) => s.email.toLowerCase() === email.toLowerCase()
    );
    if (!myRow || myRow.status !== "Pending") return false;

    if (submission.signingType === "parallel") {
      // Parallel: eligible as long as own row is Pending
      return true;
    }

    // Sequential: eligible only if every signatory with a LOWER position
    // has already Signed (no one ahead is still Pending)
    const blockedByPrior = submission.signatories.some(
      (s) => s.position < myRow.position && s.status === "Pending"
    );
    return !blockedByPrior;
  });
}

// ─── Sign a submission ────────────────────────────────────────────────────────

export async function signSubmission(
  submissionId: string,
  payload?: { signatureData?: string; signatureToken?: string }
) {
  const email = await getActiveEmail();
  if (!email) return { success: false, error: "Not authenticated." };

  try {
    let finalSignatureData = payload?.signatureData ?? null;

    // If using Token to sign
    if (payload?.signatureToken) {
      const v = await verifySignatureToken(payload.signatureToken);
      if (!v.success) return { success: false, error: v.error };
      finalSignatureData = v.signatureData ?? null;
    }

    if (!finalSignatureData) {
      return { success: false, error: "No signature provided." };
    }

    // Find user's signatory row
    const signatoryRow = await prisma.submissionSignatory.findFirst({
      where: {
        submissionId,
        email: { equals: email, mode: "insensitive" },
        status: "Pending",
      },
    });

    if (!signatoryRow) {
      return { success: false, error: "Signatory record not found or already signed." };
    }

    // Mark as Signed
    await prisma.submissionSignatory.update({
      where: { id: signatoryRow.id },
      data: { 
        status: "Signed", 
        signedAt: new Date(),
        signatureData: finalSignatureData
      },
    });

    // Check if ALL signatories for this submission have now Signed
    const unsigned = await prisma.submissionSignatory.count({
      where: { submissionId, status: { not: "Signed" } },
    });

    if (unsigned === 0) {
      // All signed — advance the overall submission status
      await prisma.formSubmission.update({
        where: { id: submissionId },
        data: { status: "Processing" },
      });
    } else {
      // At least one still pending — move to In-review
      await prisma.formSubmission.update({
        where: { id: submissionId },
        data: { status: "In-review" },
      });
    }

    revalidatePath("/dashboard/workflow");
    return { success: true };
  } catch (error) {
    console.error("Sign error:", error);
    return { success: false, error: "Failed to record signature." };
  }
}

// ─── Decline a submission ─────────────────────────────────────────────────────

export async function declineSubmission(submissionId: string) {
  const email = await getActiveEmail();
  if (!email) return { success: false, error: "Not authenticated." };

  try {
    const signatoryRow = await prisma.submissionSignatory.findFirst({
      where: {
        submissionId,
        email: { equals: email, mode: "insensitive" },
        status: "Pending",
      },
    });

    if (!signatoryRow) {
      return { success: false, error: "Signatory record not found." };
    }

    await prisma.submissionSignatory.update({
      where: { id: signatoryRow.id },
      data: { status: "Declined", signedAt: new Date() },
    });

    // Mark the whole submission as Rejected
    await prisma.formSubmission.update({
      where: { id: submissionId },
      data: { status: "Rejected" },
    });

    revalidatePath("/dashboard/workflow");
    return { success: true };
  } catch (error) {
    console.error("Decline error:", error);
    return { success: false, error: "Failed to decline." };
  }
}

// ─── Get full submission detail (for the review drawer) ───────────────────────

export async function getSubmissionDetail(id: string) {
  return prisma.formSubmission.findUnique({
    where: { id },
    include: {
      signatories: { orderBy: { position: "asc" } },
      template: true,
      submittedBy: { select: { user_name: true, finca_email: true, branch: true } },
    },
  });
}
