"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { deleteFormRequestBatch } from "@/app/actions/form";

export function SoftDeleteRequestButton({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");

    try {
      const res = await deleteFormRequestBatch(batchId);
      if (res.success === false) throw new Error(res.error || "Failed to delete request batch");
      
      setIsOpen(false);
      router.refresh();
      router.push("/dashboard/forms");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
        title="Delete Request Batch"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Delete Request Batch</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete this group request? Pending requests will be canceled and no longer accessible.
              </p>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 flex gap-2 items-start">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete Request
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
