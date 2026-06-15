"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Pen, Upload, KeyRound, AlertTriangle, X } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";

interface SignatureSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (base64Signature: string) => void;
  token?: string;
  allowToken?: boolean;
}

export function SignatureSelectionModal({
  isOpen,
  onClose,
  onSuccess,
  token,
  allowToken = true
}: SignatureSelectionModalProps) {
  const [activeTab, setActiveTab] = useState<"token" | "draw" | "upload">(allowToken ? "token" : "draw");
  const [signatureToken, setSignatureToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const sigCanvas = useRef<SignatureCanvas>(null);

  if (!isOpen) return null;

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signatureToken.length < 8) {
      setError("Token must be at least 8 characters long.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/security/verify-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: signatureToken }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to verify token.");
        return;
      }
      onSuccess(data.signatureData);
      setSignatureToken("");
    } catch (err: any) {
      setError("Network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearDraw = () => {
    sigCanvas.current?.clear();
  };

  const handleSaveDraw = () => {
    if (sigCanvas.current?.isEmpty()) {
      setError("Please draw a signature first.");
      return;
    }
    const base64Str = sigCanvas.current?.getTrimmedCanvas().toDataURL("image/png");
    if (base64Str) {
      onSuccess(base64Str);
      sigCanvas.current?.clear();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG/JPG).");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onSuccess(reader.result as string);
    };
    reader.onerror = () => {
      setError("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex flex-col justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold">Add Signature</h2>
              <p className="text-sm text-gray-500 mt-1">
                Choose how you want to place your signature.
              </p>
            </div>
            <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md flex items-center border border-red-200 mb-4">
              <AlertTriangle className="w-4 h-4 mr-2 shrink-0" />
              {error}
            </div>
          )}

          {/* Custom Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            {allowToken && (
              <button
                className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-2 border-b-2 ${activeTab === "token" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                onClick={() => { setActiveTab("token"); setError(""); }}
              >
                <KeyRound className="w-4 h-4" /> Token
              </button>
            )}
            <button
              className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-2 border-b-2 ${activeTab === "draw" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
              onClick={() => { setActiveTab("draw"); setError(""); }}
            >
              <Pen className="w-4 h-4" /> Draw
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-2 border-b-2 ${activeTab === "upload" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
              onClick={() => { setActiveTab("upload"); setError(""); }}
            >
              <Upload className="w-4 h-4" /> Upload
            </button>
          </div>

          <div className="pt-2">
            {allowToken && activeTab === "token" && (
              <form onSubmit={handleTokenSubmit} className="space-y-4">
                <p className="text-sm text-gray-500">
                  Enter your 8-character security token to use your saved profile signature.
                </p>
                <Input
                  type="password"
                  placeholder="Signature Token"
                  value={signatureToken}
                  onChange={(e) => setSignatureToken(e.target.value)}
                  className="font-mono tracking-widest text-center h-12"
                  autoFocus
                />
                <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90" disabled={isLoading || signatureToken.length < 8}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Verify & Sign
                </Button>
              </form>
            )}

            {activeTab === "draw" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Draw your signature below. This will be used only for this placement.
                </p>
                <div className="border border-gray-300 rounded-md bg-gray-50 overflow-hidden">
                  <SignatureCanvas
                    ref={sigCanvas}
                    penColor="black"
                    canvasProps={{ className: "w-full h-40 cursor-crosshair" }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleClearDraw}>Clear</Button>
                  <Button className="flex-1 bg-primary hover:bg-primary/90 text-white" onClick={handleSaveDraw}>Use Drawing</Button>
                </div>
              </div>
            )}

            {activeTab === "upload" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Upload an image of your signature (PNG or JPG). Transparent backgrounds work best.
                </p>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 border-gray-300">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 font-medium">Click to upload file</p>
                  </div>
                  <Input 
                    type="file" 
                    accept="image/png, image/jpeg" 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
