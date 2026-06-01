"use client";

import React, { useState, useRef, useEffect } from "react";
import { PenTool, CheckCircle, FileText, AlertCircle, X, Camera, RefreshCw, ChevronRight, CheckSquare, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ClientContractsPage({ initialContracts }: { initialContracts: any[] }) {
  const router = useRouter();
  const [contracts, setContracts] = useState(initialContracts);
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  
  // Auto-open contract if contractId is in the URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const contractId = urlParams.get("contractId");
      if (contractId && !selectedContract) {
        const contractToOpen = contracts.find((c: any) => c.id === contractId);
        if (contractToOpen) {
          openContract(contractToOpen);
          
          // Optionally clear the query string so it doesn't reopen on refresh
          window.history.replaceState({}, '', '/dashboard/contracts');
        }
      }
    }
  }, [contracts, selectedContract]);

  // Signing Flow State
  const [step, setStep] = useState<number>(0); // 0 = Preview, 1 = Agreement
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  
  const [isAgreed, setIsAgreed] = useState<boolean>(false);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // External Signer State
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [externalName, setExternalName] = useState("");
  const [externalEmail, setExternalEmail] = useState("");
  const [sendingExternal, setSendingExternal] = useState(false);

  // Close everything and reset state
  const handleClose = () => {
    setSelectedContract(null);
    setStep(0);
    setPreviewHtml("");
    setIsAgreed(false);
    setSuccess("");
    setShowExternalModal(false);
    setExternalName("");
    setExternalEmail("");
    setTokenModalOpen(false);
    setTokenInput("");
  };

  const openContract = async (contract: any) => {
    setSelectedContract(contract);
    setStep(0);
    setLoadingPreview(true);
    setError("");
    
    try {
      const res = await fetch(`/api/v1/contracts/${contract.id}/preview`);
      const data = await res.json();
      if (data.success && data.html) {
        setPreviewHtml(data.html);
      } else {
        setError(data.error || "Failed to load contract preview");
      }
    } catch (err) {
      setError("Network error while loading contract preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleFinishSigning = async () => {
    if (!isAgreed) {
      setError("You must agree to the terms to finish signing.");
      return;
    }
    if (!tokenInput || tokenInput.length < 8) {
      setError("Please enter a valid token (min 8 chars).");
      return;
    }

    setTokenModalOpen(false);

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/contracts/${selectedContract.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenInput }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Contract signed successfully!");
        setContracts(contracts.filter(c => c.id !== selectedContract.id));
        setTimeout(() => {
          handleClose();
          router.refresh();
        }, 2000);
      } else {
        setError(data.error || "Failed to sign contract");
      }
    } catch (err: any) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSendExternal = async () => {
    if (!externalName || !externalEmail) {
      setError("Name and Email are required.");
      return;
    }
    setError("");
    setSuccess("");
    setSendingExternal(true);

    try {
      const res = await fetch(`/api/v1/contracts/${selectedContract.id}/send-external`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalSignerName: externalName,
          externalSignerEmail: externalEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Contract sent to external signer successfully!");
        setShowExternalModal(false);
        setContracts(contracts.filter(c => c.id !== selectedContract.id));
        setTimeout(() => {
          handleClose();
          router.refresh();
        }, 2000);
      } else {
        setError(data.error || "Failed to send contract");
      }
    } catch (err: any) {
      setError("Network error occurred");
    } finally {
      setSendingExternal(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-12 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
          <PenTool className="w-5 h-5 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Pending Contracts</h2>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-500">You don't have any pending contracts to sign right now.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {contracts.map((contract) => (
            <div key={contract.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center justify-between hover:border-purple-300 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{contract.submission.formName}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                    <span>Ref: {contract.submission.reference || contract.submissionId.slice(-6).toUpperCase()}</span>
                    <span>•</span>
                    <span>{new Date(contract.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => openContract(contract)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                Sign Contract
              </button>
            </div>
          ))}
        </div>
      )}

      {/* FULL SCREEN OVERLAY */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-100 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm shrink-0">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{selectedContract.submission.formName}</h3>
              <p className="text-sm text-gray-500">Ref: {selectedContract.submission.reference || selectedContract.submissionId.slice(-6).toUpperCase()}</p>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Error / Success Banners */}
          {error && (
            <div className="m-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2 border border-red-100 shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          {success && (
            <div className="m-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm flex items-center gap-2 border border-green-100 shrink-0">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <p>{success}</p>
            </div>
          )}

          {/* Dynamic Content Body */}
          <div className="flex-1 overflow-auto flex justify-center p-4">
            
            {/* STEP 0: Preview Contract */}
            {step === 0 && (
              <div className="w-full max-w-4xl bg-white shadow-xl rounded-xl overflow-hidden flex flex-col">
                {loadingPreview ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12">
                    <span className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></span>
                    <p className="text-gray-500">Generating contract preview...</p>
                  </div>
                ) : (
                  <iframe 
                    srcDoc={previewHtml} 
                    className="w-full flex-1 border-0"
                    title="Contract Preview"
                  />
                )}
                
                {!loadingPreview && previewHtml && (
                  <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="agree"
                        className="w-4 h-4 text-purple-600"
                        checked={isAgreed}
                        onChange={(e) => setIsAgreed(e.target.checked)}
                      />
                      <label htmlFor="agree" className="text-sm text-gray-700">I have read and agree to the terms.</label>
                    </div>
                    <button
                      disabled={loading || !isAgreed}
                      onClick={() => setTokenModalOpen(true)}
                      className={`px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors ${
                        loading || !isAgreed
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-purple-600 text-white hover:bg-purple-700"
                      }`}
                    >
                      {loading ? "Signing..." : "Sign with Token"} <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {!loadingPreview && previewHtml && (
                   <div className="p-4 border-t border-gray-200 bg-white flex justify-end shrink-0">
                     <button
                       onClick={() => setShowExternalModal(true)}
                       className="px-4 py-2 border border-purple-200 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium text-sm"
                     >
                       Send to External Signer
                     </button>
                   </div>
                )}
              </div>
            )}

            {/* STEP 1: Final Agreement */}
            {step === 1 && (
              <div className="w-full max-w-2xl mt-12">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden border-2 border-purple-500">
                  <div className="p-6 border-b border-gray-100 bg-purple-50 flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                      <CheckSquare className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-purple-900">Step 1: Final Agreement</h3>
                      <p className="text-sm text-purple-700">Almost done! Review and agree to sign.</p>
                    </div>
                  </div>
                  
                  <div className="p-6">

                    <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                      <input 
                        type="checkbox" 
                        className="mt-1 w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500" 
                        checked={isAgreed}
                        onChange={(e) => setIsAgreed(e.target.checked)}
                      />
                      <span className="text-sm text-gray-700 leading-relaxed">
                        By checking this box, I confirm that I agree to the terms of the contract: <strong>{selectedContract.submission.formName}</strong>.
                      </span>
                    </label>

                    <button
                      onClick={handleFinishSigning}
                      disabled={loading || !isAgreed}
                      className="w-full mt-6 px-6 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-bold disabled:opacity-50 flex justify-center items-center text-lg shadow-lg"
                    >
                      {loading ? (
                        <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      ) : (
                        "Finish Signing"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* EXTERNAL SIGNER MODAL */}
            {showExternalModal && (
              <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-900">Send to External Signer</h3>
                    <button onClick={() => setShowExternalModal(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500">
                      The external signer will receive an email with a secure link to review and sign the contract.
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Signer Name</label>
                      <input 
                        type="text" 
                        value={externalName}
                        onChange={(e) => setExternalName(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Signer Email</label>
                      <input 
                        type="email" 
                        value={externalEmail}
                        onChange={(e) => setExternalEmail(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button onClick={() => setShowExternalModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
                      Cancel
                    </button>
                    <button 
                      onClick={handleSendExternal}
                      disabled={sendingExternal || !externalName || !externalEmail}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center"
                    >
                      {sendingExternal ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span> : null}
                      Send Email
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tokenModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900">Sign Contract</h3>
              <button onClick={() => { setTokenModalOpen(false); setTokenInput(""); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 text-center">
                Please enter your signature token to authorize this signature.
              </p>
              <input
                autoFocus
                type="password"
                minLength={8}
                maxLength={32}
                value={tokenInput}
                onChange={(e) => { setTokenInput(e.target.value); setError(""); }}
                placeholder="Token..."
                className="w-full text-center tracking-widest font-mono text-lg h-12 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
              />
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => { setTokenModalOpen(false); setTokenInput(""); }} 
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                onClick={handleFinishSigning}
                disabled={loading || tokenInput.length < 8}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : "Sign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
