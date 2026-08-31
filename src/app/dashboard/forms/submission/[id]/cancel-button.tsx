"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, EyeOff, Eye } from "lucide-react";
import { useSession } from "next-auth/react";

export function CancelSubmissionButton({ submission }: { submission: any }) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"warning" | "token">("warning");
  const [reason, setReason] = useState("");
  const [signatureToken, setSignatureToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [error, setError] = useState("");

  const currentUser = session?.user as any;
  if (!currentUser) return null;

  // Only show to the submitter
  const isSubmitter = submission.submittedBy?.finca_email?.toLowerCase() === currentUser.email?.toLowerCase();
  if (!isSubmitter) return null;

  // Only show if status is In Review or Processing
  if (submission.status !== "In Review" && submission.status !== "Processing") return null;

  const handleCancel = async () => {
    setIsCanceling(true);
    setError("");

    try {
      const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      const res = await fetch(`${BASE_URL}/api/v1/workflow/${submission.id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(currentUser.backendToken ? { Authorization: `Bearer ${currentUser.backendToken}` } : {})
        },
        body: JSON.stringify({ token: signatureToken, reason })
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to cancel submission.");
        setIsCanceling(false);
      } else {
        // Success - reload the page to reflect canceled status
        window.location.reload();
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
      setIsCanceling(false);
    }
  };

  return (
    <>
      <Button 
        onClick={() => {
          setIsOpen(true);
          setStep("warning");
          setReason("");
          setSignatureToken("");
          setError("");
        }} 
        variant="outline" 
        size="sm" 
        className="cursor-pointer border-red-200 text-red-700 hover:bg-red-50 flex items-center"
      >
        <X className="w-4 h-4 mr-2" />
        Cancel Submission
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Cancel Submission</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {step === "warning" && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-red-50 text-red-800 rounded-lg border border-red-100">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm">
                      You are about to cancel the processing of this submission which has been fully signed (or is still in review). Do you wish to proceed?
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Reason for cancellation <span className="text-red-500">*</span></label>
                    <textarea 
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Please provide a reason..."
                      className="w-full min-h-[100px] p-3 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Back</Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => setStep("token")}
                      disabled={!reason.trim()}
                    >
                      Proceed
                    </Button>
                  </div>
                </div>
              )}

              {step === "token" && (
                <div className="space-y-6">
                  <div className="text-sm text-gray-600">
                    To securely confirm this cancellation, please enter your signature token.
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type={showToken ? "text" : "password"}
                        placeholder="Token (e.g. 1a2b3c4d)"
                        value={signatureToken}
                        onChange={(e) => {
                          setSignatureToken(e.target.value);
                          setError("");
                        }}
                        className="w-full px-4 py-2 border rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <Button 
                      variant="ghost" 
                      onClick={() => setStep("warning")} 
                      disabled={isCanceling}
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={handleCancel}
                      disabled={signatureToken.length < 1 || isCanceling}
                      variant="destructive"
                    >
                      {isCanceling ? "Canceling..." : "Confirm Cancellation"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
