import { getFormTemplate, getSubmission } from "@/app/actions/form";
import FormFillerClient from "./client-form";
import { notFound } from "next/navigation";
import { auth } from "@/auth";

export default async function FillFormPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ requestToken?: string, correctionId?: string }>;
}) {
  const resolvedParams = await params;
  let template = null;
  let prefilledData = null;
  let requestTokenStr = null;
  let correctionIdStr = null;
  let correctionRequests = null;

  const session = await auth();
  const userName = session?.user?.name || "Unknown";
  const email = session?.user?.email || "";
  const token = (session?.user as any)?.backendToken ?? "";

  try {
    const sp = await searchParams;
    if (sp.requestToken) {
      requestTokenStr = sp.requestToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app"}/api/v1/public-forms/token/${sp.requestToken}`, {
        cache: "no-store",
      });
      const data = await res.json();
      
      if (!data.success && data.code === "REQUEST_CANCELLED") {
        return (
          <div className="p-8 text-center text-red-500 max-w-lg mx-auto mt-10 bg-red-50 rounded-lg">
            This request has been cancelled by the sender and is no longer active.
          </div>
        );
      }

      if (data.success && data.data) {
        if (data.data.targetEmail && data.data.targetEmail.toLowerCase() !== email.toLowerCase()) {
          return (
            <div className="min-h-[50vh] flex items-center justify-center px-4 mt-12">
              <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-red-100 text-center">
                <h1 className="text-xl font-bold text-gray-900 mb-2">Account Mismatch</h1>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">
                  This request was sent to a different account, but you are currently logged in as <strong className="text-gray-800">{email}</strong>.
                </p>
                <p className="text-sm text-gray-500">
                  Please log in with the correct account that received the request link.
                </p>
              </div>
            </div>
          );
        }

        if (data.data.template) {
          template = data.data.template;
        }

        if (data.data.prefilledData) {
          prefilledData = data.data.prefilledData;
        }
      }
    } else if (sp.correctionId) {
      correctionIdStr = sp.correctionId;
      const sub = await getSubmission(sp.correctionId);
      if (sub && sub.status === "Awaiting Correction") {
        prefilledData = sub.formResponses;
        correctionRequests = sub.correctionRequests;
      }
    }
  } catch(e) {}

  if (!template) {
    template = await getFormTemplate(resolvedParams.id);
  }

  if (!template) {
    notFound();
  }

  return <FormFillerClient template={template} currentUser={{ userName, email, token }} prefilledData={prefilledData} requestToken={requestTokenStr} correctionId={correctionIdStr || undefined} correctionRequests={correctionRequests || undefined} />;
}
