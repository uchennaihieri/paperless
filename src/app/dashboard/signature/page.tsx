"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PenTool, Save, Eraser, CheckCircle2 } from "lucide-react";
import { saveSecuritySignature, getMySignature } from "@/app/actions/security";

export default function SignaturePage() {
  const [activeTab, setActiveTab] = useState<"draw" | "view">("view");
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [signatureToken, setSignatureToken] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [inputToken, setInputToken] = useState("");
  const [showTokenPrompt, setShowTokenPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sigPad = useRef<any>(null);

  useEffect(() => {
    async function loadSignature() {
      const res = await getMySignature();
      if (res.success && res.signatureData) {
        setSavedSignature(res.signatureData);
        setSignatureToken("••••••••"); // Re-hide securely computed PIN
      }
      setIsLoading(false);
    }
    loadSignature();
  }, []);

  const generateToken = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleClear = () => {
    if (sigPad.current) {
      sigPad.current.clear();
    }
  };

  const handleSaveDrawing = () => {
    if (sigPad.current && !sigPad.current.isEmpty()) {
      setShowTokenPrompt(true);
    }
  };

  const confirmAndSave = () => {
    if (inputToken.length !== 8) {
      alert("Token must be exactly 8 characters long.");
      return;
    }
    startSaving(async () => {
      const dataUrl = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
      const res = await saveSecuritySignature(inputToken, dataUrl);
      if (res.success) {
        setSavedSignature(dataUrl);
        setSignatureToken(inputToken);
        setActiveTab("view");
        setShowTokenPrompt(false);
      } else {
        alert(res.error || "Failed to save signature");
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Signature Management</h2>
        <p className="text-gray-500">Create, upload, and view your digital signature.</p>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button
          className={`pb-3 font-medium text-sm transition-colors relative ${activeTab === 'view' ? 'text-primary' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('view')}
        >
          My Signature
          {activeTab === 'view' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-md" />}
        </button>
        <button
          className={`pb-3 font-medium text-sm transition-colors relative ${activeTab === 'draw' ? 'text-primary' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('draw')}
        >
          Draw Signature
          {activeTab === 'draw' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-md" />}
        </button>
      </div>

      {activeTab === 'view' && (
        <Card>
          <CardHeader>
            <CardTitle>Current Signature</CardTitle>
            <CardDescription>Use your 8-character token to sign forms seamlessly.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            {savedSignature ? (
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
              </div>
            ) : isLoading ? (
              <div className="text-center text-gray-500 flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p>Loading your secure signature...</p>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <PenTool className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>You have not configured a signature yet.</p>
                <Button className="mt-4" onClick={() => setActiveTab("draw")}>Create Signature</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'draw' && (
        <Card>
          <CardHeader>
            <CardTitle>Draw your signature</CardTitle>
            <CardDescription>Sign smoothly on the canvas below.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-hidden">
              <SignatureCanvas
                ref={sigPad}
                canvasProps={{
                  className: 'w-full h-[300px]'
                }}
                penColor="#171717"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleClear}>
              <Eraser className="w-4 h-4 mr-2" /> Clear
            </Button>
            <Button onClick={handleSaveDrawing}>
              <Save className="w-4 h-4 mr-2" /> Save & Generate Token
            </Button>
          </CardFooter>
        </Card>
      )}

      {showTokenPrompt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white">
            <CardHeader>
              <CardTitle>Secure Your Signature</CardTitle>
              <CardDescription>Enter an 8-character token to securely encrypt your signature.</CardDescription>
            </CardHeader>
            <CardContent>
              <Label>8-Character Token</Label>
              <Input
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                maxLength={8}
                placeholder="e.g. 1a2b3c4d"
                className="mt-2 text-center tracking-widest font-mono"
              />
            </CardContent>
            <CardFooter className="flex justify-end gap-2 text-sm">
              <Button variant="ghost" onClick={() => setShowTokenPrompt(false)}>Cancel</Button>
              <Button disabled={inputToken.length !== 8 || isSaving} onClick={confirmAndSave}>
                {isSaving ? "Saving..." : "Encrypt & Save"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

    </div>
  );
}
