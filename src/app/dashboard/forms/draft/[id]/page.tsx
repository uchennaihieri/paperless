import { getSubmission } from "@/app/actions/form";
import FormFillerClient from "../../[id]/client-form";
import { notFound } from "next/navigation";
import { auth } from "@/auth";

export default async function DraftFillFormPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  // 1. Fetch the draft submission
  const submission = await getSubmission(resolvedParams.id);
  
  if (!submission) {
    notFound();
  }

  if (submission.status !== "Draft") {
    // If it's already submitted, we shouldn't let them fill it as a draft again.
    // They should go to the submission detail view.
    return (
      <div className="max-w-3xl mx-auto p-8 text-center space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Form Already Submitted</h2>
        <p className="text-gray-600">This form has already been completed and cannot be modified.</p>
        <a href={`/dashboard/forms/submission/${submission.id}`} className="inline-block mt-4 text-primary hover:underline">
          View Submission
        </a>
      </div>
    );
  }

  // 2. The template is already included in the submission
  const template = submission.template;
  
  if (!template) {
    notFound();
  }

  // 3. Get the current user
  const session = await auth();
  const userName = session?.user?.name || "Unknown";
  const email = session?.user?.email || "";
  const token = (session?.user as any)?.backendToken ?? "";

  return (
    <FormFillerClient 
      template={template} 
      currentUser={{ userName, email, token }} 
      draftId={submission.id}
      initialFormData={submission.formResponses}
      prerequisiteInfo={submission.prerequisiteFor || undefined}
    />
  );
}
