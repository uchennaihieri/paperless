import { getSubmissionByReference } from "@/app/actions/form";
import { notFound, redirect } from "next/navigation";

export default async function ViewByReferencePage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  
  const submission = await getSubmissionByReference(reference);

  if (!submission || !submission.id) {
    notFound();
  }

  // Redirect to the existing submission detail view
  redirect(`/dashboard/forms/submission/${submission.id}`);
}
