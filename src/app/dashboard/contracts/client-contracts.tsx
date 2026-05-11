"use client";

import React, { useState, useRef, useEffect } from "react";
import { PenTool, CheckCircle, FileText, AlertCircle, X, Camera, RefreshCw, ChevronRight, CheckSquare, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import SignatureCanvas from 'react-signature-canvas';

export default function ClientContractsPage({ initialContracts }: { initialContracts: any[] }) {
  const router = useRouter();
  const [contracts, setContracts] = useState(initialContracts);
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  
  // Signing Flow State
  const [step, setStep] = useState<number>(0); // 0 = Preview, 1 = Signature, 2 = Selfie, 3 = Agreement
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  
  const [drawnSignature, setDrawnSignature] = useState<string>("");
  const [selfie, setSelfie] = useState<string>("");
  const [isAgreed, setIsAgreed] = useState<boolean>(false);
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const sigCanvasRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Close everything and reset state
  const handleClose = () => {
    setSelectedContract(null);
    setStep(0);
    setPreviewHtml("");
    setDrawnSignature("");
    setSelfie("");
    setIsAgreed(false);
    setError("");
    setSuccess("");
    stopCamera();
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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Camera access denied or unavailable. Please check your browser permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const takeSelfie = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      setSelfie(canvas.toDataURL("image/jpeg", 0.8));
    }
    stopCamera();
  };

  const retakeSelfie = () => {
    setSelfie("");
    startCamera();
  };

  // Lifecycle for camera based on step
  useEffect(() => {
    if (step === 2 && !selfie) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step, selfie]);

  const handleNextStep1 = () => {
    if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      setDrawnSignature(sigCanvasRef.current.getTrimmedCanvas().toDataURL("image/png"));
      setStep(2);
      setError("");
    } else {
      setError("Please draw your signature to proceed.");
    }
  };

  const handleNextStep2 = () => {
    if (selfie) {
      setStep(3);
      setError("");
    } else {
      setError("Please take a selfie to proceed.");
    }
  };

  const handleFinishSigning = async () => {
    if (!isAgreed) {
      setError("You must agree to the terms to finish signing.");
      return;
    }
    if (!drawnSignature || !selfie) {
      setError("Missing signature or selfie data.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/contracts/${selectedContract.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          drawnSignatureBase64: drawnSignature,
          selfieBase64: selfie 
        }),
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

  return (
    <div className="w-full max-w-4xl mx-auto pb-12 space-y-6">
      <button
        onClick={() => router.push("/dashboard/account-services")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Extended Services
      </button>

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
                    <p className="text-sm text-gray-500">Please read the contract entirely before proceeding.</p>
                    <button
                      onClick={() => setStep(1)}
                      className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
                    >
                      Sign Now <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 1: Draw Signature */}
            {step === 1 && (
              <div className="w-full max-w-2xl mt-12">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                  <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-900">Step 1: Draw Your Signature</h3>
                    <p className="text-sm text-gray-500">Please draw your signature in the box below.</p>
                  </div>
                  <div className="p-6">
                    <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                      <SignatureCanvas 
                        ref={sigCanvasRef}
                        penColor="black"
                        canvasProps={{ className: "w-full h-64 rounded-xl cursor-crosshair" }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <button 
                        onClick={() => sigCanvasRef.current?.clear()}
                        className="text-gray-500 hover:text-gray-800 text-sm font-medium flex items-center gap-1"
                      >
                        <RefreshCw className="w-4 h-4" /> Clear Signature
                      </button>
                      <button
                        onClick={handleNextStep1}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
                      >
                        Next Step <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Take Selfie */}
            {step === 2 && (
              <div className="w-full max-w-2xl mt-12">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                  <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-900">Step 2: Verification Selfie</h3>
                    <p className="text-sm text-gray-500">Take a quick selfie to verify your identity.</p>
                  </div>
                  <div className="p-6 flex flex-col items-center">
                    {!selfie ? (
                      <>
                        <div className="relative w-full max-w-md aspect-video bg-black rounded-xl overflow-hidden shadow-inner mb-6">
                          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        </div>
                        <button
                          onClick={takeSelfie}
                          className="px-6 py-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors font-bold flex items-center gap-2 shadow-lg"
                        >
                          <Camera className="w-5 h-5" /> Take Selfie
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="relative w-full max-w-md aspect-video bg-black rounded-xl overflow-hidden shadow-inner mb-6">
                          <img src={selfie} alt="Selfie preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex gap-4 w-full justify-center">
                          <button
                            onClick={retakeSelfie}
                            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
                          >
                            <RefreshCw className="w-4 h-4" /> Retake
                          </button>
                          <button
                            onClick={handleNextStep2}
                            className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
                          >
                            Next Step <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Final Agreement */}
            {step === 3 && (
              <div className="w-full max-w-2xl mt-12">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden border-2 border-purple-500">
                  <div className="p-6 border-b border-gray-100 bg-purple-50 flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                      <CheckSquare className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-purple-900">Step 3: Final Agreement</h3>
                      <p className="text-sm text-purple-700">Almost done! Review and agree to sign.</p>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-center gap-6 mb-8 justify-center">
                      <div className="text-center">
                        <img src={drawnSignature} alt="Signature" className="h-16 object-contain border border-gray-200 rounded p-2 bg-white" />
                        <span className="text-xs text-gray-500 mt-1 block">Your Signature</span>
                      </div>
                      <div className="text-center">
                        <img src={selfie} alt="Selfie" className="h-16 w-16 object-cover border border-gray-200 rounded-full" />
                        <span className="text-xs text-gray-500 mt-1 block">Your Selfie</span>
                      </div>
                    </div>

                    <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                      <input 
                        type="checkbox" 
                        className="mt-1 w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500" 
                        checked={isAgreed}
                        onChange={(e) => setIsAgreed(e.target.checked)}
                      />
                      <span className="text-sm text-gray-700 leading-relaxed">
                        By checking this box, I confirm that I am the individual pictured in the selfie, that the drawn signature is my own, and I hereby legally bind myself to the terms of the contract: <strong>{selectedContract.submission.formName}</strong>.
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
          </div>
        </div>
      )}
    </div>
  );
}
