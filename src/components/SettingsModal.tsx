"use client";

import { useState, useRef, useTransition, useEffect, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { X, PenTool, Save, Eraser, CheckCircle2, Upload, ImageIcon, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSecuritySignature, getMySignature } from "@/app/actions/security";

type ActiveTab = "view" | "draw" | "upload";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const MAX_FILE_SIZE = 500 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg"];

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("view");
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [signatureToken, setSignatureToken] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  const [showTokenPrompt, setShowTokenPrompt] = useState(false);
  const [inputToken, setInputToken] = useState("");
  const [confirmToken, setConfirmToken] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [pendingBlob, setPendingBlob] = useState<string | null>(null);

  const [uploadedBlob, setUploadedBlob] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sigPad = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    getMySignature().then((res) => {
      if (res.success && res.signatureData) {
        setSavedSignature(res.signatureData);
        setSignatureToken("••••••••");
      }
      setIsLoading(false);
    });
    setActiveTab("view");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !showTokenPrompt) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, showTokenPrompt]);

  const handleClear = () => sigPad.current?.clear();

  const handleSaveDrawing = () => {
    if (!sigPad.current || sigPad.current.isEmpty()) return;
    setPendingBlob(sigPad.current.getTrimmedCanvas().toDataURL("image/png"));
    setShowTokenPrompt(true);
  };

  const processFile = useCallback(async (file: File) => {
    setUploadError("");
    if (!ACCEPTED_TYPES.includes(file.type)) { setUploadError("Only PNG and JPG files are accepted."); return; }
    if (file.size > MAX_FILE_SIZE) { setUploadError("File must be smaller than 500 KB."); return; }
    setUploadedBlob(await fileToBase64(file));
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const clearUpload = () => {
    setUploadedBlob(null);
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmAndSave = () => {
    setTokenError("");
    if (inputToken.length !== 8) { setTokenError("Token must be exactly 8 characters."); return; }
    if (inputToken !== confirmToken) { setTokenError("Tokens do not match."); return; }
    if (!pendingBlob) return;

    startSaving(async () => {
      const res = await saveSecuritySignature(inputToken, pendingBlob);
      if (res.success) {
        setSavedSignature(pendingBlob);
        setSignatureToken(inputToken);
        setActiveTab("view");
        setShowTokenPrompt(false);
        setInputToken("");
        setConfirmToken("");
        setPendingBlob(null);
        setUploadedBlob(null);
      } else {
        setTokenError(res.error || "Failed to save signature.");
      }
    });
  };

  const closeTokenModal = () => {
    setShowTokenPrompt(false);
    setInputToken("");
    setConfirmToken("");
    setTokenError("");
    setPendingBlob(null);
  };

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: "view",   label: "My Signature" },
    { id: "draw",   label: "Draw" },
    { id: "upload", label: "Upload" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Settings</h2>
            <p className="text-xs text-gray-400 mt-0.5">Manage your digital signature and security settings</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 px-6 border-b border-gray-100 shrink-0">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              className={`pb-3 pt-3 font-medium text-sm transition-colors relative ${
                activeTab === id ? "text-primary" : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab(id)}
            >
              {label}
              {activeTab === id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-md" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* VIEW */}
          {activeTab === "view" && (
            isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : savedSignature ? (
              <div className="flex flex-col items-center gap-6">
                <div className="border border-gray-200 p-8 rounded-xl bg-gray-50 w-full max-w-sm flex justify-center">
                  <img src={savedSignature} alt="Saved Signature" className="max-h-[100px] object-contain" />
                </div>
                <div className="bg-green-50 text-green-800 px-6 py-4 rounded-xl flex items-center justify-between w-full max-w-sm">
                  <div>
                    <p className="text-sm font-medium">Your Signature Token:</p>
                    <p className="font-mono text-xl tracking-widest font-bold text-green-600/70">
                      {signatureToken === "••••••••" ? <span>{signatureToken} (Hidden)</span> : signatureToken}
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("draw")}>
                    <PenTool className="w-4 h-4 mr-2" /> Replace (Draw)
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("upload")}>
                    <Upload className="w-4 h-4 mr-2" /> Replace (Upload)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                <PenTool className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="mb-4">You have not configured a signature yet.</p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => setActiveTab("draw")}><PenTool className="w-4 h-4 mr-2" /> Draw Signature</Button>
                  <Button variant="outline" onClick={() => setActiveTab("upload")}><Upload className="w-4 h-4 mr-2" /> Upload</Button>
                </div>
              </div>
            )
          )}

          {/* DRAW */}
          {activeTab === "draw" && (
            <Card>
              <CardHeader>
                <CardTitle>Draw your signature</CardTitle>
                <CardDescription>Sign smoothly on the canvas below, then save with a secure token.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-hidden">
                  <SignatureCanvas ref={sigPad} canvasProps={{ className: "w-full h-[200px]" }} penColor="#171717" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleClear}><Eraser className="w-4 h-4 mr-2" /> Clear</Button>
                <Button onClick={handleSaveDrawing}><Save className="w-4 h-4 mr-2" /> Save & Secure</Button>
              </CardFooter>
            </Card>
          )}

          {/* UPLOAD */}
          {activeTab === "upload" && (
            <Card>
              <CardHeader>
                <CardTitle>Upload your signature</CardTitle>
                <CardDescription>Upload a PNG or JPG image of your signature (max 500 KB).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!uploadedBlob ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center gap-3 h-40 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                      isDragging ? "border-primary bg-primary/5" : "border-gray-300 bg-gray-50 hover:border-primary/50"
                    }`}
                  >
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                    <p className="text-sm text-gray-500">Drag & drop or <span className="text-primary underline">browse</span></p>
                    <p className="text-xs text-gray-400">PNG, JPG — max 500 KB</p>
                    <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg" className="hidden" onChange={handleFileInput} />
                  </div>
                ) : (
                  <div className="relative border border-gray-200 rounded-xl bg-gray-50 p-6 flex flex-col items-center gap-3">
                    <button onClick={clearUpload} className="absolute top-2 right-2 p-1.5 rounded-full bg-white border border-gray-200 hover:bg-gray-100">
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                    <img src={uploadedBlob} alt="Preview" className="max-h-[100px] object-contain border border-gray-100 rounded-lg bg-white p-2" />
                    <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Ready to save</p>
                  </div>
                )}
                {uploadError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {uploadError}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={clearUpload} disabled={!uploadedBlob}><Eraser className="w-4 h-4 mr-2" /> Clear</Button>
                <Button disabled={!uploadedBlob} onClick={() => { setPendingBlob(uploadedBlob!); setShowTokenPrompt(true); }}>
                  <Save className="w-4 h-4 mr-2" /> Save & Secure
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>

      {/* Token Modal */}
      {showTokenPrompt && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/40">
          <Card className="w-full max-w-md bg-white shadow-2xl">
            <CardHeader>
              <CardTitle>Secure Your Signature</CardTitle>
              <CardDescription>Choose an 8-character token. <strong>You must remember this</strong> — it cannot be recovered.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="settings-token-input">Token (8 characters)</Label>
                <Input
                  id="settings-token-input"
                  value={inputToken}
                  onChange={(e) => { setInputToken(e.target.value); setTokenError(""); }}
                  maxLength={8}
                  placeholder="e.g. A1b2C3d4"
                  className="text-center tracking-[0.4em] font-mono text-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-token-confirm">Confirm Token</Label>
                <Input
                  id="settings-token-confirm"
                  value={confirmToken}
                  onChange={(e) => { setConfirmToken(e.target.value); setTokenError(""); }}
                  maxLength={8}
                  placeholder="Re-enter token"
                  className="text-center tracking-[0.4em] font-mono text-lg"
                />
              </div>
              {tokenError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {tokenError}
                </div>
              )}
              <p className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded-lg p-3">
                ⚠️ This token is hashed and cannot be retrieved later. Store it somewhere safe.
              </p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="ghost" onClick={closeTokenModal} disabled={isSaving}>Cancel</Button>
              <Button
                disabled={inputToken.length !== 8 || confirmToken.length !== 8 || isSaving}
                onClick={confirmAndSave}
              >
                {isSaving ? "Encrypting…" : "Encrypt & Save"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
