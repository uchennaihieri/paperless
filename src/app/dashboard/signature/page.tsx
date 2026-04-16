"use client";

import { useState, useRef, useTransition, useEffect, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PenTool, Save, Eraser, CheckCircle2, Upload, ImageIcon, AlertCircle, X } from "lucide-react";
import { saveSecuritySignature, getMySignature } from "@/app/actions/security";

type ActiveTab = "view" | "draw" | "upload";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const MAX_FILE_SIZE = 500 * 1024; // 500 KB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg"];

// ── Component ─────────────────────────────────────────────────────────────────

export default function SignaturePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("view");
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [signatureToken, setSignatureToken] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  // Token prompt (shared by draw + upload)
  const [showTokenPrompt, setShowTokenPrompt] = useState(false);
  const [inputToken, setInputToken] = useState("");
  const [confirmToken, setConfirmToken] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [pendingBlob, setPendingBlob] = useState<string | null>(null);

  // Upload-specific state
  const [uploadedBlob, setUploadedBlob] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Draw-specific
  const sigPad = useRef<any>(null);

  // ── Load existing signature on mount ─────────────────────────────────────
  useEffect(() => {
    async function loadSignature() {
      const res = await getMySignature();
      if (res.success && res.signatureData) {
        setSavedSignature(res.signatureData);
        setSignatureToken("••••••••");
      }
      setIsLoading(false);
    }
    loadSignature();
  }, []);

  // ── Draw handlers ─────────────────────────────────────────────────────────
  const handleClear = () => sigPad.current?.clear();

  const handleSaveDrawing = () => {
    if (!sigPad.current || sigPad.current.isEmpty()) return;
    const blob = sigPad.current.getTrimmedCanvas().toDataURL("image/png");
    setPendingBlob(blob);
    setShowTokenPrompt(true);
  };

  // ── Upload handlers ───────────────────────────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    setUploadError("");
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError("Only PNG and JPG files are accepted.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File must be smaller than 500 KB.");
      return;
    }
    const blob = await fileToBase64(file);
    setUploadedBlob(blob);
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

  const handleSaveUpload = () => {
    if (!uploadedBlob) return;
    setPendingBlob(uploadedBlob);
    setShowTokenPrompt(true);
  };

  const clearUpload = () => {
    setUploadedBlob(null);
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Token modal confirm ───────────────────────────────────────────────────
  const confirmAndSave = () => {
    setTokenError("");
    if (inputToken.length !== 8) {
      setTokenError("Token must be exactly 8 characters.");
      return;
    }
    if (inputToken !== confirmToken) {
      setTokenError("Tokens do not match.");
      return;
    }
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

  const closeModal = () => {
    setShowTokenPrompt(false);
    setInputToken("");
    setConfirmToken("");
    setTokenError("");
    setPendingBlob(null);
  };

  // ── Tab config ────────────────────────────────────────────────────────────
  const tabs: { id: ActiveTab; label: string }[] = [
    { id: "view",   label: "My Signature" },
    { id: "draw",   label: "Draw Signature" },
    { id: "upload", label: "Upload Signature" },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Signature Management</h2>
        <p className="text-gray-500">Create, upload, and manage your digital signature.</p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-6 border-b border-gray-200">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            id={`sig-tab-${id}`}
            className={`pb-3 font-medium text-sm transition-colors relative ${
              activeTab === id ? "text-primary" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab(id)}
          >
            {label}
            {activeTab === id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-md" />
            )}
          </button>
        ))}
      </div>

      {/* ── VIEW tab ── */}
      {activeTab === "view" && (
        <Card>
          <CardHeader>
            <CardTitle>Current Signature</CardTitle>
            <CardDescription>Use your 8-character token to sign forms seamlessly.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            {isLoading ? (
              <div className="text-center text-gray-500 flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
                <p>Loading your secure signature...</p>
              </div>
            ) : savedSignature ? (
              <div className="space-y-6 flex flex-col items-center">
                <div className="border border-gray-200 p-8 rounded-lg bg-gray-50 max-w-[400px]">
                  <img src={savedSignature} alt="Saved Signature" className="max-h-[100px] object-contain" />
                </div>
                <div className="bg-green-50 text-green-800 px-6 py-4 rounded-lg flex items-center justify-between min-w-[300px]">
                  <div>
                    <p className="text-sm font-medium">Your Signature Token:</p>
                    <p className="font-mono text-xl tracking-widest font-bold">
                      {signatureToken === "••••••••" ? (
                        <span className="text-green-600/70">{signatureToken}  (Hidden)</span>
                      ) : (
                        signatureToken
                      )}
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <div className="flex gap-3 mt-2">
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("draw")}>
                    <PenTool className="w-4 h-4 mr-2" /> Replace (Draw)
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("upload")}>
                    <Upload className="w-4 h-4 mr-2" /> Replace (Upload)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <PenTool className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>You have not configured a signature yet.</p>
                <div className="flex gap-3 justify-center mt-4">
                  <Button onClick={() => setActiveTab("draw")}>
                    <PenTool className="w-4 h-4 mr-2" /> Draw Signature
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab("upload")}>
                    <Upload className="w-4 h-4 mr-2" /> Upload Signature
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── DRAW tab ── */}
      {activeTab === "draw" && (
        <Card>
          <CardHeader>
            <CardTitle>Draw your signature</CardTitle>
            <CardDescription>Sign smoothly on the canvas below, then save with a secure token.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-hidden">
              <SignatureCanvas
                ref={sigPad}
                canvasProps={{ className: "w-full h-[300px]" }}
                penColor="#171717"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleClear}>
              <Eraser className="w-4 h-4 mr-2" /> Clear
            </Button>
            <Button id="save-drawn-signature-btn" onClick={handleSaveDrawing}>
              <Save className="w-4 h-4 mr-2" /> Save & Secure
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ── UPLOAD tab ── */}
      {activeTab === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload your signature</CardTitle>
            <CardDescription>Upload a PNG or JPG image of your signature (max 500 KB).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!uploadedBlob ? (
              // Drop zone
              <div
                id="signature-upload-dropzone"
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 h-52 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                  isDragging
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : "border-gray-300 bg-gray-50 hover:border-primary/50 hover:bg-gray-100"
                }`}
              >
                <div className="p-4 rounded-full bg-white shadow-sm">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">
                    Drag &amp; drop or <span className="text-primary underline">browse</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG — max 500 KB</p>
                </div>
                <input
                  ref={fileInputRef}
                  id="signature-file-input"
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>
            ) : (
              // Preview
              <div className="relative border border-gray-200 rounded-xl bg-gray-50 p-6 flex flex-col items-center gap-4">
                <button
                  onClick={clearUpload}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-white border border-gray-200 hover:bg-gray-100 transition-colors"
                  title="Remove"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preview</p>
                <img
                  src={uploadedBlob}
                  alt="Uploaded signature preview"
                  className="max-h-[120px] max-w-full object-contain border border-gray-100 rounded-lg shadow-sm bg-white p-2"
                />
                <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Image loaded — ready to save
                </p>
              </div>
            )}

            {uploadError && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {uploadError}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={clearUpload} disabled={!uploadedBlob}>
              <Eraser className="w-4 h-4 mr-2" /> Clear
            </Button>
            <Button
              id="save-uploaded-signature-btn"
              disabled={!uploadedBlob}
              onClick={handleSaveUpload}
            >
              <Save className="w-4 h-4 mr-2" /> Save &amp; Secure
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ── Shared Token Prompt Modal ── */}
      {showTokenPrompt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white shadow-2xl">
            <CardHeader>
              <CardTitle>Secure Your Signature</CardTitle>
              <CardDescription>
                Choose an 8-character token to encrypt your signature. You{" "}
                <strong>must remember this token</strong> — it cannot be recovered.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="token-input">Token (8 characters)</Label>
                <Input
                  id="token-input"
                  value={inputToken}
                  onChange={(e) => { setInputToken(e.target.value.toUpperCase()); setTokenError(""); }}
                  maxLength={8}
                  placeholder="e.g. A1B2C3D4"
                  className="text-center tracking-[0.4em] font-mono text-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="token-confirm-input">Confirm Token</Label>
                <Input
                  id="token-confirm-input"
                  value={confirmToken}
                  onChange={(e) => { setConfirmToken(e.target.value.toUpperCase()); setTokenError(""); }}
                  maxLength={8}
                  placeholder="Re-enter your token"
                  className="text-center tracking-[0.4em] font-mono text-lg"
                />
              </div>
              {tokenError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {tokenError}
                </div>
              )}
              <p className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded-lg p-3">
                ⚠️ This token is hashed and cannot be retrieved later. Store it somewhere safe.
              </p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="ghost" onClick={closeModal} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                id="confirm-save-signature-btn"
                disabled={inputToken.length !== 8 || confirmToken.length !== 8 || isSaving}
                onClick={confirmAndSave}
              >
                {isSaving ? "Encrypting & Saving..." : "Encrypt & Save"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
