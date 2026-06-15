import { notFound } from "next/navigation";
import { Metadata } from "next";
import PublicClientForm from "../../[slug]/public-client-form";

import { CheckCircle2, XCircle } from "lucide-react";

async function getRequestTemplate(token: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app"}/api/v1/public-forms/token/${token}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (data.success && data.data) {
      return { success: true, data: data.data };
    }
    return { success: false, error: data.error, code: data.code };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Network error" };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const result = await getRequestTemplate(resolvedParams.token);
  if (!result.success || !result.data?.template) return { title: "Request Not Found" };
  return { title: `Requested: ${result.data.template.name}` };
}

export default async function RequestFormPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = await params;
  const result = await getRequestTemplate(resolvedParams.token);

  if (!result.success) {
    if (result.code === "REQUEST_ALREADY_COMPLETED") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Already Submitted</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Thank you! You have already successfully filled and submitted this form. No further action is required.
            </p>
          </div>
        </div>
      );
    } else if (result.code === "REQUEST_CANCELLED") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Cancelled</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              This request has been cancelled by the sender and is no longer active.
            </p>
          </div>
        </div>
      );
    }
    return notFound();
  }

  const data = result.data;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="bg-[#59000a] px-6 py-5">
            <h1 className="text-2xl font-bold text-white text-center mb-1">
              {data.template.name}
            </h1>
            <p className="text-primary-foreground/80 text-center text-sm">
              You have been requested to fill out this form
            </p>
          </div>
          <div className="p-8">
            <PublicClientForm 
              template={data.template} 
              token={resolvedParams.token} 
              targetEmail={data.targetEmail} 
              prefilledData={data.prefilledData}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
