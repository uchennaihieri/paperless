"use client";

import { useState, useRef, useTransition, useEffect, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { X, PenTool, Save, Eraser, CheckCircle2, Upload, ImageIcon, AlertCircle, Bell, Mail, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSecuritySignature, getMySignature, getNotificationPreferences, saveNotificationPreferences } from "@/app/actions/security";

type SettingsTab = "signature" | "notifications";
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

function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${checked ? 'bg-primary' : 'bg-gray-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'
          }`}
      />
    </button>
  );
}

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("signature");
  const [activeTab, setActiveTab] = useState<ActiveTab>("view");
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [signatureToken, setSignatureToken] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  // Notification Preferences State
  const [preferences, setPreferences] = useState<any>(null);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState("");
  const [prefsError, setPrefsError] = useState("");

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
    setPrefsMessage("");
    setPrefsError("");

    // Load signature
    getMySignature().then((res) => {
      if (res.success && res.signatureData) {
        setSavedSignature(res.signatureData);
        setSignatureToken("••••••••");
      }
    });

    // Load notification preferences
    getNotificationPreferences().then((res) => {
      if (res.success && res.preferences) {
        setPreferences(res.preferences);
      }
      setIsLoading(false);
    });

    setActiveTab("view");
    setSettingsTab("signature");
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

  // Preference Handlers (Atomic Auto-Save)
  const savePreferences = async (updated: any) => {
    setIsSavingPrefs(true);
    setPrefsMessage("");
    setPrefsError("");
    const res = await saveNotificationPreferences(updated);
    setIsSavingPrefs(false);
    if (res.success) {
      setPrefsMessage("Settings auto-saved successfully.");
      setTimeout(() => setPrefsMessage(""), 3000);
    } else {
      setPrefsError(res.error || "Failed to save notification preferences.");
    }
  };

  const toggleChannel = (channel: string) => {
    if (!preferences) return;
    const updated = {
      ...preferences,
      channels: {
        ...preferences.channels,
        [channel]: !preferences.channels[channel]
      }
    };
    setPreferences(updated);
    savePreferences(updated);
  };

  const togglePattern = (pattern: string) => {
    if (!preferences) return;
    const updated = {
      ...preferences,
      patterns: {
        ...preferences.patterns,
        [pattern]: !preferences.patterns[pattern]
      }
    };
    setPreferences(updated);
    savePreferences(updated);
  };

  const signatureTabs: { id: ActiveTab; label: string }[] = [
    { id: "view", label: "My Signature" },
    { id: "draw", label: "Draw" },
    { id: "upload", label: "Upload" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] sm:h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Settings</h2>
            <p className="text-xs text-gray-400 mt-0.5">Configure your digital signature and application settings</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Auto-Save Indicators in Header */}
            {settingsTab === "notifications" && (
              <div className="flex items-center justify-end shrink-0">
                {isSavingPrefs && (
                  <p className="text-xs text-primary font-semibold flex items-center gap-1.5 animate-pulse bg-primary/5 px-3 py-1.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" /> Saving settings...
                  </p>
                )}
                {prefsMessage && (
                  <p className="text-xs text-green-600 font-semibold flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {prefsMessage}
                  </p>
                )}
                {prefsError && (
                  <p className="text-xs text-red-600 font-semibold flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-full">
                    <AlertCircle className="w-3.5 h-3.5" /> {prefsError}
                  </p>
                )}
              </div>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Split Layout */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

          {/* Left Navigation Sidebar */}
          <div className="w-full md:w-60 bg-gray-50/50 border-b md:border-b-0 md:border-r border-gray-100 p-4 shrink-0 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible">
            <button
              onClick={() => setSettingsTab("signature")}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shrink-0 md:w-full text-left cursor-pointer ${settingsTab === "signature"
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
            >
              <PenTool className="w-4 h-4 shrink-0" />
              <span>Signature</span>
            </button>
            <button
              onClick={() => setSettingsTab("notifications")}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shrink-0 md:w-full text-left cursor-pointer ${settingsTab === "notifications"
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
            >
              <Bell className="w-4 h-4 shrink-0" />
              <span>Notifications</span>
            </button>
          </div>

          {/* Right Details Content Pane */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col">

            {/* TAB: SIGNATURE */}
            {settingsTab === "signature" && (
              <div className="flex flex-col flex-1">
                {/* Horizontal signature action sub-tabs */}
                <div className="flex gap-6 border-b border-gray-100 shrink-0 mb-6">
                  {signatureTabs.map(({ id, label }) => (
                    <button
                      key={id}
                      className={`pb-3 font-semibold text-sm transition-colors relative cursor-pointer ${activeTab === id ? "text-primary" : "text-gray-500 hover:text-gray-700"
                        }`}
                      onClick={() => setActiveTab(id)}
                    >
                      {label}
                      {activeTab === id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-md" />}
                    </button>
                  ))}
                </div>

                {/* Sub Tab View: My Signature */}
                {activeTab === "view" && (
                  isLoading ? (
                    <div className="flex items-center justify-center py-16 flex-1">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : savedSignature ? (
                    <div className="flex flex-col items-center gap-6 my-auto">
                      <div className="border border-gray-200 p-8 rounded-xl bg-gray-50 w-full max-w-sm flex justify-center shadow-inner">
                        <img src={savedSignature} alt="Saved Signature" className="max-h-[100px] object-contain" />
                      </div>
                      <div className="bg-green-50 text-green-800 px-6 py-4 rounded-xl flex items-center justify-between w-full max-w-sm border border-green-100">
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
                    <div className="text-center text-gray-500 py-12 my-auto">
                      <PenTool className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-bounce" />
                      <p className="mb-4">You have not configured a signature yet.</p>
                      <div className="flex gap-3 justify-center">
                        <Button onClick={() => setActiveTab("draw")}><PenTool className="w-4 h-4 mr-2" /> Draw Signature</Button>
                        <Button variant="outline" onClick={() => setActiveTab("upload")}><Upload className="w-4 h-4 mr-2" /> Upload</Button>
                      </div>
                    </div>
                  )
                )}

                {/* Sub Tab View: Draw Signature */}
                {activeTab === "draw" && (
                  <Card className="border-gray-100 shadow-sm flex flex-col flex-1">
                    <CardHeader className="py-4">
                      <CardTitle className="text-base font-bold">Draw your signature</CardTitle>
                      <CardDescription>Sign smoothly on the canvas below, then save with a secure token.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[220px]">
                      <div className="border border-dashed border-gray-200 rounded-lg bg-gray-50 overflow-hidden h-full min-h-[200px]">
                        <SignatureCanvas ref={sigPad} canvasProps={{ className: "w-full h-full min-h-[200px]" }} penColor="#171717" />
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between py-4 border-t border-gray-50 shrink-0">
                      <Button variant="outline" onClick={handleClear}><Eraser className="w-4 h-4 mr-2" /> Clear</Button>
                      <Button onClick={handleSaveDrawing}><Save className="w-4 h-4 mr-2" /> Save & Secure</Button>
                    </CardFooter>
                  </Card>
                )}

                {/* Sub Tab View: Upload Signature */}
                {activeTab === "upload" && (
                  <Card className="border-gray-100 shadow-sm">
                    <CardHeader className="py-4">
                      <CardTitle className="text-base font-bold">Upload your signature</CardTitle>
                      <CardDescription>Upload a PNG or JPG image of your signature (max 500 KB).</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!uploadedBlob ? (
                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`relative flex flex-col items-center justify-center gap-3 h-40 rounded-xl border-2 border-dashed cursor-pointer transition-all ${isDragging ? "border-primary bg-primary/5" : "border-gray-200 bg-gray-50 hover:border-primary/50"
                            }`}
                        >
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                          <p className="text-sm text-gray-500">Drag & drop or <span className="text-primary underline">browse</span></p>
                          <p className="text-xs text-gray-400">PNG, JPG — max 500 KB</p>
                          <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg" className="hidden" onChange={handleFileInput} />
                        </div>
                      ) : (
                        <div className="relative border border-gray-200 rounded-xl bg-gray-50 p-6 flex flex-col items-center gap-3">
                          <button onClick={clearUpload} className="absolute top-2 right-2 p-1.5 rounded-full bg-white border border-gray-200 hover:bg-gray-100 cursor-pointer">
                            <X className="w-4 h-4 text-gray-500" />
                          </button>
                          <img src={uploadedBlob} alt="Preview" className="max-h-[100px] object-contain border border-gray-100 rounded-lg bg-white p-2" />
                          <p className="text-xs text-green-600 flex items-center gap-1 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Ready to save</p>
                        </div>
                      )}
                      {uploadError && (
                        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">
                          <AlertCircle className="w-4 h-4 shrink-0" /> {uploadError}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-between py-4 border-t border-gray-50">
                      <Button variant="outline" onClick={clearUpload} disabled={!uploadedBlob}><Eraser className="w-4 h-4 mr-2" /> Clear</Button>
                      <Button disabled={!uploadedBlob} onClick={() => { setPendingBlob(uploadedBlob!); setShowTokenPrompt(true); }}>
                        <Save className="w-4 h-4 mr-2" /> Save & Secure
                      </Button>
                    </CardFooter>
                  </Card>
                )}
              </div>
            )}

            {/* TAB: NOTIFICATIONS */}
            {settingsTab === "notifications" && (
              <div className="flex flex-col flex-1 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Notification Preferences</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Control where and when you receive application notifications.</p>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-16 flex-1">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : preferences ? (
                  <div className="space-y-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-6">

                      {/* Section: Channels */}
                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
                        <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-primary" />
                          Notification Channels
                        </h4>
                        <div className="flex flex-wrap gap-6">
                          <label className="flex items-center gap-3 cursor-pointer group select-none">
                            <input
                              type="checkbox"
                              checked={preferences?.channels?.email ?? true}
                              onChange={() => toggleChannel("email")}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-2 cursor-pointer"
                            />
                            <div>
                              <p className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-gray-400" /> Email Notifications
                              </p>
                              <p className="text-xs text-gray-400">Receive standard alerts on your registered FINCA email.</p>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer group select-none">
                            <input
                              type="checkbox"
                              checked={preferences?.channels?.teams ?? false}
                              onChange={() => toggleChannel("teams")}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-2 cursor-pointer"
                            />
                            <div>
                              <p className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
                                Microsoft Teams Notifications <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded ml-1">Coming Soon</span>
                              </p>
                              <p className="text-xs text-gray-400">Receive instant chat alerts inside Microsoft Teams channel.</p>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Section: Patterns/Triggers */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 px-1">
                          <Bell className="w-4 h-4 text-primary" />
                          Notification Triggers
                        </h4>

                        <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 bg-white overflow-hidden shadow-sm">

                          {/* Trigger 1 */}
                          <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium text-gray-800">When I submit a form</p>
                              <p className="text-xs text-gray-400">Receive a confirmation email with a reference ID immediately upon submitting a form.</p>
                            </div>
                            <Switch
                              checked={preferences?.patterns?.onSubmitForm ?? false}
                              onChange={() => togglePattern("onSubmitForm")}
                            />
                          </div>

                          {/* Trigger 2 */}
                          <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium text-gray-800">When I am to sign</p>
                              <p className="text-xs text-gray-400">Get notified when a form is awaiting your review and signature in the queue.</p>
                            </div>
                            <Switch
                              checked={preferences?.patterns?.onToSign ?? true}
                              onChange={() => togglePattern("onToSign")}
                            />
                          </div>

                          {/* Trigger 3 */}
                          <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium text-gray-800">When I am the form final approver</p>
                              <p className="text-xs text-gray-400">Receive a notification when a fully signed form is routed to your queue for final signoff.</p>
                            </div>
                            <Switch
                              checked={preferences?.patterns?.onFinalApprover ?? false}
                              onChange={() => togglePattern("onFinalApprover")}
                            />
                          </div>

                          {/* Trigger 4 */}
                          <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium text-gray-800">When my form submission has been signed</p>
                              <p className="text-xs text-gray-400">Get signature updates as each designated signatory signs off on your submitted form.</p>
                            </div>
                            <Switch
                              checked={preferences?.patterns?.onMyFormSigned ?? false}
                              onChange={() => togglePattern("onMyFormSigned")}
                            />
                          </div>

                          {/* Trigger 5 */}
                          <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium text-gray-800">When my form submission is processing</p>
                              <p className="text-xs text-gray-400">Get notified when all required signatories have signed and the form transitions to processing.</p>
                            </div>
                            <Switch
                              checked={preferences?.patterns?.onMyFormProcessing ?? false}
                              onChange={() => togglePattern("onMyFormProcessing")}
                            />
                          </div>

                          {/* Trigger 6 */}
                          <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium text-gray-800">When the form status is completed</p>
                              <p className="text-xs text-gray-400">Receive an email immediately upon successful final approval and completion of your form.</p>
                            </div>
                            <Switch
                              checked={preferences?.patterns?.onMyFormCompleted ?? true}
                              onChange={() => togglePattern("onMyFormCompleted")}
                            />
                          </div>

                          {/* Trigger 7 */}
                          <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium text-gray-800">When a form needs to be treated in my business unit</p>
                              <p className="text-xs text-gray-400">Receive alerts when a form is assigned for processing or treatment by your branch / unit.</p>
                            </div>
                            <Switch
                              checked={preferences?.patterns?.onBusinessUnitTreat ?? false}
                              onChange={() => togglePattern("onBusinessUnitTreat")}
                            />
                          </div>

                          {/* Trigger 8 */}
                          <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium text-gray-800">When my form submission is declined/rejected</p>
                              <p className="text-xs text-gray-400">Get an instant notification if any signatory declines or disapproves your form submission.</p>
                            </div>
                            <Switch
                              checked={preferences?.patterns?.onMyFormDeclined ?? true}
                              onChange={() => togglePattern("onMyFormDeclined")}
                            />
                          </div>

                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-12 flex-1 my-auto">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>Failed to load notification settings. Please contact your administrator.</p>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Token Modal */}
      {showTokenPrompt && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-150">
          <Card className="w-full max-w-md bg-white shadow-2xl border-gray-100 animate-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle className="text-base font-bold">Secure Your Signature</CardTitle>
              <CardDescription>Choose an 8-character token. <strong>You must remember this</strong> — it cannot be recovered.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="settings-token-input" className="text-xs font-semibold text-gray-700">Token (8 characters)</Label>
                <Input
                  id="settings-token-input"
                  value={inputToken}
                  onChange={(e) => { setInputToken(e.target.value); setTokenError(""); }}
                  maxLength={8}
                  placeholder="e.g. A1b2C3d4"
                  className="text-center tracking-[0.4em] font-mono text-lg border-gray-200 focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-token-confirm" className="text-xs font-semibold text-gray-700">Confirm Token</Label>
                <Input
                  id="settings-token-confirm"
                  value={confirmToken}
                  onChange={(e) => { setConfirmToken(e.target.value); setTokenError(""); }}
                  maxLength={8}
                  placeholder="Re-enter token"
                  className="text-center tracking-[0.4em] font-mono text-lg border-gray-200 focus:border-primary"
                />
              </div>
              {tokenError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {tokenError}
                </div>
              )}
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3 leading-relaxed">
                ⚠️ This token is hashed and cannot be retrieved later. Store it somewhere safe.
              </p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t border-gray-50 pt-4">
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
