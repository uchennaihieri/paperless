"use client";

import React, { useState, useRef } from "react";
import { CheckCircle, AlertCircle, ChevronRight, CheckSquare, RefreshCw } from "lucide-react";
import SignatureCanvas from 'react-signature-canvas';

export default function ClientSignContract({ token, contractData }: { token: string, contractData: any }) {
  const [step, setStep] = useState<number>(0); // 0 = Preview, 1 = Signature, 2 = Agreement, 3 = Success
  
  const [drawnSignature, setDrawnSignature] = useState<string>("");
  const [isAgreed, setIsAgreed] = useState<boolean>(false);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sigCanvasRef = useRef<any>(null);

  const handleNextStep1 = () => {
    if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      setDrawnSignature(sigCanvasRef.current.getTrimmedCanvas().toDataURL("image/png"));
      setStep(2);
      setError("");
    } else {
      setError("Please draw your signature to proceed.");
    }
  };

  const handleFinishSigning = async () => {
    if (!isAgreed) {
      setError("You must agree to the terms to finish signing.");
      return;
    }
    if (!drawnSignature) {
      setError("Missing signature data.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/contracts/external-sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          drawnSignatureBase64: drawnSignature,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStep(3); // Success page
      } else {
        setError(data.error || "Failed to sign contract");
      }
    } catch (err: any) {
      setError("Network error occurred. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Contract Signed</h1>
          <p className="text-gray-500">Thank you! A fully signed copy of this contract has been sent to your email address.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pb-12">
      {/* Header */}
      <div className="w-full bg-white border-b border-gray-200 shadow-sm p-4 sticky top-0 z-10 flex justify-center">
        <div className="w-full max-w-4xl flex items-center justify-between">
          <div>
            <h1 className="font-bold text-xl text-[#B50938]">FINCALite</h1>
            <p className="text-xs text-gray-500 font-medium">Contract Signing</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-800">{contractData.contract.formName}</p>
            <p className="text-xs text-gray-500">For {contractData.contract.externalSignerName}</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl mt-6 px-4">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2 border border-red-100">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* STEP 0: Preview */}
        {step === 0 && (
          <div className="bg-white shadow-xl rounded-xl overflow-hidden flex flex-col border border-gray-200">
            <div className="bg-gray-50 border-b border-gray-100 p-4 text-center">
              <h2 className="text-lg font-bold text-gray-900">Review Document</h2>
              <p className="text-sm text-gray-500 mt-1">Please read the document below carefully before signing.</p>
            </div>
            <div className="w-full h-[60vh] sm:h-[70vh]">
              <iframe 
                srcDoc={contractData.html} 
                className="w-full h-full border-0"
                title="Contract Preview"
              />
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end shrink-0">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2.5 bg-[#B50938] text-white rounded-lg hover:bg-[#9a0730] transition-colors font-medium flex items-center gap-2 shadow-sm"
              >
                Proceed to Sign <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: Draw Signature */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200 max-w-2xl mx-auto mt-8">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">Step 1: Draw Your Signature</h3>
              <p className="text-sm text-gray-500 mt-1">Please draw your signature in the box below to sign the contract.</p>
            </div>
            <div className="p-6">
              <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                <SignatureCanvas 
                  ref={sigCanvasRef}
                  penColor="black"
                  canvasProps={{ className: "w-full h-64 rounded-xl cursor-crosshair" }}
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                <button 
                  onClick={() => sigCanvasRef.current?.clear()}
                  className="text-gray-500 hover:text-gray-800 text-sm font-medium flex items-center gap-2 px-4 py-2"
                >
                  <RefreshCw className="w-4 h-4" /> Clear Signature
                </button>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setStep(0)}
                    className="flex-1 sm:flex-none px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNextStep1}
                    className="flex-1 sm:flex-none px-6 py-2 bg-[#B50938] text-white rounded-lg hover:bg-[#9a0730] transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    Next Step <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Final Agreement */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-xl overflow-hidden border-2 border-[#B50938] max-w-2xl mx-auto mt-8">
            <div className="p-6 border-b border-gray-100 bg-red-50 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                <CheckSquare className="w-6 h-6 text-[#B50938]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#B50938]">Step 2: Final Agreement</h3>
                <p className="text-sm text-red-900 mt-1">Almost done! Review and agree to sign.</p>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col items-center mb-8">
                <span className="text-sm font-semibold text-gray-700 mb-3">Your Digital Signature</span>
                <img src={drawnSignature} alt="Signature" className="h-24 object-contain border border-gray-200 rounded-lg p-4 bg-white shadow-sm" />
              </div>

              <label className="flex items-start gap-3 p-5 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                <input 
                  type="checkbox" 
                  className="mt-1 w-5 h-5 text-[#B50938] rounded border-gray-300 focus:ring-[#B50938]" 
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  By checking this box, I confirm that the drawn signature above is my own, and I hereby legally bind myself to the terms of the contract: <strong>{contractData.contract.formName}</strong>. I understand that I will receive a copy of this signed contract via email.
                </span>
              </label>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="px-6 py-3.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50"
                >
                  Go Back
                </button>
                <button
                  onClick={handleFinishSigning}
                  disabled={loading || !isAgreed}
                  className="flex-1 px-6 py-3.5 bg-[#B50938] text-white rounded-xl hover:bg-[#9a0730] transition-colors font-bold disabled:opacity-50 flex justify-center items-center text-lg shadow-md"
                >
                  {loading ? (
                    <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    "Finish & Submit Signature"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
