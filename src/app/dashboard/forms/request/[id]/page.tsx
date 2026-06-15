import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { RemindButton } from "./remind-button";
import { SoftDeleteRequestButton } from "./soft-delete-request-button";

export default async function FormRequestBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  const token = (session?.user as any)?.backendToken;

  if (!token) {
    return <div>Unauthenticated</div>;
  }

  // Fetch the batch data from the backend
  let batch = null;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app"}/api/v1/form-requests/${id}`, {
      headers: { "Authorization": `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      batch = json.data;
    }
  } catch (e) {
    console.error("Failed to fetch batch:", e);
  }

  if (!batch) {
    notFound();
  }

  const total = batch.requests?.length || 0;
  const completed = batch.requests?.filter((r: any) => r.status === "Completed") || [];
  const pending = batch.requests?.filter((r: any) => r.status === "Pending") || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/dashboard/forms" className="inline-flex items-center text-sm text-gray-500 hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to forms
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Request — {batch.template?.name || "Form"}</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Requested {new Date(batch.createdAt).toLocaleString()} · {completed.length} of {total} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          {batch.status !== "Completed" && (
            <SoftDeleteRequestButton batchId={batch.id} />
          )}
        </div>
      </div>

      {/* Message Section */}
      {batch.message && (
        <div>
          <h3 className="text-xs font-semibold text-primary uppercase tracking-widest border-b border-gray-200 pb-2 mb-3">
            Notification Message
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap border border-gray-200 shadow-sm">
            {batch.message}
          </div>
        </div>
      )}

      {/* Pending Recipients Section */}
      <div>
        <h3 className="text-xs font-semibold text-orange-700 uppercase tracking-widest border-b border-orange-100 pb-2 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Pending Recipients ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg border border-gray-200">
            No pending recipients.
          </p>
        ) : (
          <div className="space-y-2">
            {pending.map((req: any) => (
              <div key={req.id} className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{req.targetEmail}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-500" /> Pending
                  </span>
                  <RemindButton requestId={req.id} token={token} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Recipients Section */}
      {completed.length > 0 && (
        <div className="pt-4">
          <h3 className="text-xs font-semibold text-green-700 uppercase tracking-widest border-b border-green-100 pb-2 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Completed Recipients ({completed.length})
          </h3>
          <div className="space-y-2">
            {completed.map((req: any) => (
              <div key={req.id} className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm opacity-75">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{req.targetEmail}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Completed
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
