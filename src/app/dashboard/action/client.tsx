"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileDown, ChevronRight, CheckSquare, X, User, RefreshCw, AlertTriangle, Loader2, Eye, EyeOff, BookOpen } from "lucide-react";
import { assignToSelf, revertAssignment, completeProcessWithApprover, searchActiveWorkflowUsers, regeneratePdf, getSubmissionDetail } from "@/app/actions/workflow";
import { getActionItems } from "@/app/actions/form";
import { useSmartFetch } from "@/hooks/useSmartFetch";
import { FormReferenceLink, isFormReferenceField } from "@/components/FormReferenceLink";
import { JournalModal } from "@/components/JournalModal";

type ActionItem = {
  id: string;
  reference?: string | null;
  formName: string;
  status: string;
  treatedBy?: string | null;
  treaterEmail?: string | null;
  approvedBy?: string | null;
  formResponses: Record<string, any>;
  signingType: string;
  createdAt: string;
  template: { name: string; formOwner: string; formTreater: string; fields?: any };
  signatories: Array<{ userName: string; email: string; status: string; signedAt: string; position: number }>;
  submittedBy: { user_name: string; finca_email: string; branch: string } | null;
  documents?: Array<{ id: string; fieldName: string; originalName: string }>;
};

export default function ActionClient({ items }: { items: ActionItem[] }) {
  const { data: session } = useSession();
  const token = (session?.user as any)?.backendToken ?? "";
  const currentUserEmail = (session?.user as any)?.email?.toLowerCase() ?? "";

  const rolesStr = (session?.user as any)?.roles;
  const roles = typeof rolesStr === "string" ? JSON.parse(rolesStr) : rolesStr || [];
  const activeId = (session?.user as any)?.activeRoleId;
  const activeRole = roles.find((r: any) => String(r.id) === String(activeId)) || roles[0];
  const isAccountant = activeRole?.specialAccess?.toLowerCase().includes("accountant");

  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";
  const [selected, setSelected] = useState<ActionItem | null>(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  const {
    data: fetchedItems,
    lastUpdated,
    isFetching,
    timeAgoStr,
    forceRefresh
  } = useSmartFetch<ActionItem[]>(async () => {
    const data = await getActionItems();
    return data as ActionItem[];
  }, []);

  const localItems = fetchedItems || items;

  // Sync a status change across both the list and the detail view
  const updateItemStatus = (id: string, newStatus: string) => {
    // Relying on native revalidation/fetch rather than tight local mutating,
    // but we update the selected manually to show immediate visual feedback
    setSelected(prev => prev?.id === id ? { ...prev, status: newStatus } : prev);
    forceRefresh(); // Trigger a background refresh to resync
  };

  useEffect(() => {
    if (!hasAutoSelected && typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const reference = searchParams.get("reference");
      if (reference && localItems.length > 0) {
        const match = localItems.find(i => i.reference === reference || i.id === reference);
        if (match) setSelected(match);
        setHasAutoSelected(true);
      } else if (localItems.length > 0) {
        setHasAutoSelected(true);
      }
    }
  }, [localItems, hasAutoSelected]);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusMode, setStatusMode] = useState<"assign" | "complete" | "revert" | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedApprover, setSelectedApprover] = useState<any>(null);
  const [isChanging, setIsChanging] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError] = useState("");
  const [showTreaterTokenModal, setShowTreaterTokenModal] = useState(false);
  const [treaterToken, setTreaterToken] = useState("");
  const [treaterTokenError, setTreaterTokenError] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [showCheckPdfErrorModal, setShowCheckPdfErrorModal] = useState(false);

  // Keep the selected item in sync with fetched localItems to automatically receive new PDF/status updates
  useEffect(() => {
    if (selected) {
      const upToDate = localItems.find(item => item.id === selected.id);
      if (upToDate) {
        setSelected(upToDate);
      }
    }
  }, [localItems, selected?.id]);

  const handleCheckPdf = async (id: string) => {
    setIsRegenerating(true);
    setRegenError("");
    try {
      const res = await regeneratePdf(id);
      if (!res.success) {
        setShowCheckPdfErrorModal(true);
        return;
      }

      // Fetch up-to-date detail to see if PDF was generated successfully
      const freshDetail = await getSubmissionDetail(id);
      if (freshDetail?.formResponses?.["CompletedFormPDF"]?.[0]?.url) {
        await forceRefresh();
      } else {
        setShowCheckPdfErrorModal(true);
      }
    } catch {
      setShowCheckPdfErrorModal(true);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRegenerate = async (id: string) => {
    setIsRegenerating(true);
    setRegenError("");
    try {
      const res = await regeneratePdf(id);
      if (!res.success) {
        setRegenError(res.error || "Failed to regenerate.");
        setTimeout(() => setRegenError(""), 5000);
      } else {
        updateItemStatus(id, selected!.status);
      }
    } catch {
      setRegenError("Unexpected error. Please try again.");
      setTimeout(() => setRegenError(""), 5000);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Live search — fires on every keystroke
  useEffect(() => {
    if (statusMode !== "complete") return;
    const run = async () => {
      if (searchQuery.length < 1) {
        setSearchResults([{ _none: true }]);
        return;
      }
      const res = await searchActiveWorkflowUsers(searchQuery);
      setSearchResults([{ _none: true }, ...res]);
    };
    const t = setTimeout(run, 250);
    return () => clearTimeout(t);
  }, [searchQuery, statusMode]);

  // Reset complete-mode state when modal opens
  const openStatusModal = () => {
    setStatusMode("");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedApprover(null);
    setShowStatusModal(true);
  };

  const handleAssignSelf = async () => {
    setIsChanging(true);
    setAssignError("");
    try {
      const res = await assignToSelf(selected!.id);
      if (res.success && res.newStatus) {
        updateItemStatus(selected!.id, res.newStatus);
        setShowStatusModal(false);
        setStatusMode("");
      } else {
        setAssignError(res.error || "Failed to assign to yourself");
        setStatusMode("");
      }
    } finally {
      setIsChanging(false);
    }
  };

  const handleRevertAssignment = async () => {
    setIsChanging(true);
    try {
      const res = await revertAssignment(selected!.id);
      if (res.success) {
        updateItemStatus(selected!.id, "Processing");
        setShowStatusModal(false);
        setStatusMode("");
      }
    } finally {
      setIsChanging(false);
    }
  };

  const handleCompleteProcess = async (signatureToken?: string) => {
    setIsChanging(true);
    try {
      const isNone = selectedApprover?._none;
      const email = isNone ? undefined : selectedApprover?.finca_email;
      const name = isNone ? undefined : selectedApprover?.user_name;
      const res = await completeProcessWithApprover(selected!.id, email, name, signatureToken);
      if (res.success) {
        const newStatus = isNone ? "Completed" : "Awaiting Final Approval";
        updateItemStatus(selected!.id, newStatus);
        setSelected(null);
        setShowStatusModal(false);
        setShowTreaterTokenModal(false);
        setStatusMode("");
        setSelectedApprover(null);
        setSearchResults([]);
        setSearchQuery("");
        setTreaterToken("");
        setTreaterTokenError("");
      } else {
        setTreaterTokenError(res.error || "Failed. Please check your token.");
      }
    } catch {
      setTreaterTokenError("Unexpected error. Please try again.");
    } finally {
      setIsChanging(false);
    }
  };

  const handleConfirmAndSubmit = () => {
    // Token always required — open the modal regardless of approver selection
    setTreaterToken("");
    setTreaterTokenError("");
    setShowTreaterTokenModal(true);
  };

  const completedPdfArr = selected?.formResponses?.["CompletedFormPDF"] || [];
  const signedContractDocs: any[] = ((selected?.documents || []) as any[]).filter((d: any) => d.fieldName === "SignedContract");
  const prerequisiteDocs: any[] = ((selected?.documents || []) as any[]).filter((d: any) => d.fieldName?.startsWith("PrerequisitePDF:"));

  return (
    <div className="space-y-6 max-w-6xl print:space-y-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Action Center</h2>
          <p className="text-gray-500">Treat approved and signed forms. View submitted responses and generate documents.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            {isFetching ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Fetching updates…</>
            ) : (
              `Last updated: ${timeAgoStr}`
            )}
            <button onClick={forceRefresh} className="p-1 hover:bg-gray-200 rounded-full transition-colors ml-1" title="Refresh">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {!selected ? (
        <div className="grid gap-3">
          {localItems.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No completed forms to treat at the moment.</p>
            </div>
          ) : (
            localItems.map((item) => (
              <Card
                key={item.id}
                className="hover:shadow-md transition-all cursor-pointer group border-l-4 border-l-green-500"
                onClick={() => setSelected(item)}
              >
                <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start md:items-center gap-4 w-full md:w-auto">
                    <div className="bg-green-100 p-3 rounded-xl hidden sm:block shrink-0">
                      <CheckSquare className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900">{item.template.name}</h4>
                      <div className="text-xs text-gray-400 mt-1 flex gap-3 flex-wrap">
                        <span>Ref: {item.reference || item.id.slice(-8).toUpperCase()}</span>
                        <span>By: {item.submittedBy?.user_name ?? "Unknown"}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center w-full md:w-auto mt-2 md:mt-0 gap-4 shrink-0">
                    <Badge variant={
                      item.status === "Filed" ? "secondary" :
                        item.status === "Processing" ? "warning" :
                          item.status.startsWith("Assigned") ? "default" : "success"
                    }>
                      {item.status}
                    </Badge>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors hidden md:block" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
            <Button variant="outline" onClick={() => setSelected(null)} className="cursor-pointer">
              ← Back
            </Button>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 w-full sm:w-auto">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={openStatusModal} className="cursor-pointer">
                  Change Status
                </Button>

                {selected.status === "Completed" && (
                  <Button size="sm" variant="outline" onClick={() => handleRegenerate(selected.id)} disabled={isRegenerating} className="cursor-pointer border-amber-200 text-amber-700 hover:bg-amber-50">
                    <RefreshCw className={`w-4 h-4 mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
                    {isRegenerating ? "Regenerating..." : "Regenerate PDF"}
                  </Button>
                )}
                {selected?.formResponses?.["CompletedFormPDF"]?.[0]?.url ? (
                  <a href={selected.formResponses["CompletedFormPDF"][0].url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="cursor-pointer">
                      <FileDown className="w-4 h-4 mr-2" /> Open PDF
                    </Button>
                  </a>
                ) : (
                  <Button
                    size="sm"
                    disabled={isRegenerating}
                    onClick={() => handleCheckPdf(selected.id)}
                    className="cursor-pointer"
                  >
                    {isRegenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...
                      </>
                    ) : (
                      <>
                        <FileDown className="w-4 h-4 mr-2" /> Check PDF
                      </>
                    )}
                  </Button>
                )}
              </div>
              {regenError && (
                <span className="text-xs text-red-500 flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" /> {regenError}
                </span>
              )}
            </div>
          </div>


          <div className="max-w-[800px] mx-auto space-y-6">

            {/* Table */}
            <div className="mb-10">
              <div className="bg-gray-900 rounded-t-lg text-white px-4 py-2.5 text-[10px] font-bold flex">
                <div className="w-1/2">FORM FIELD</div>
                <div className="w-1/2">VALUE/RESPONSE</div>
              </div>
              <div className="border-x border-b rounded-b-lg border-gray-100 divide-y divide-gray-100">
                {(() => {
                  const templateFields = Array.isArray(selected.template.fields)
                    ? selected.template.fields
                    : typeof selected.template.fields === "string"
                      ? JSON.parse(selected.template.fields)
                      : [];

                  const orderedResponses: any[] = [];
                  const processedKeys = new Set<string>();

                  templateFields.forEach((field: any) => {
                    const valById = selected.formResponses[field.id];
                    const valByLabel = selected.formResponses[field.label];
                    
                    if (valById !== undefined || valByLabel !== undefined) {
                      const key = valById !== undefined ? field.id : field.label;
                      const value = valById !== undefined ? valById : valByLabel;
                      
                      orderedResponses.push({
                        label: field.label || key,
                        key,
                        value: value,
                        isPrerequisite: field.isPrerequisite,
                      });
                      if (field.id) processedKeys.add(field.id);
                      if (field.label) processedKeys.add(field.label);
                    }
                  });

                  Object.entries(selected.formResponses).forEach(([q, a]) => {
                    if (q !== "CompletedFormPDF" && !processedKeys.has(q)) {
                      const fallbackLabel = q.charAt(0).toUpperCase() + q.slice(1).replace(/([A-Z])/g, " $1");
                      orderedResponses.push({ label: fallbackLabel, key: q, value: a, isPrerequisite: false });
                    }
                  });

                  return orderedResponses.map(({ label, key, value, isPrerequisite }, i) => {
                    const isRef = isPrerequisite || isFormReferenceField(key);
                    return (
                      <div key={i} className="flex px-4 py-3 text-xs flex-col sm:flex-row gap-2 sm:gap-0">
                        <div className="w-full sm:w-1/2 font-semibold text-gray-700">{label}</div>
                        <div className="w-full sm:w-1/2 text-gray-600 break-words">
                          {isRef && typeof value === "string" ? (
                            <FormReferenceLink value={value} token={token} backendUrl={BASE_URL} />
                          ) : Array.isArray(value) && value.length > 0 && value[0]?.isAttachment
                            ? value.map((v: any, idx: number) => (
                              <a
                                key={idx}
                                href={v.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-[#b50938] underline hover:text-[#9a0730] transition-colors mb-1"
                              >
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                {v.name}
                              </a>
                            ))
                            : String(value)}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Generated PDFs */}
            {(completedPdfArr.length > 0 || signedContractDocs.length > 0 || prerequisiteDocs.length > 0) && (
              <div className="mb-10">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Completed Generated Document</h3>
                <div className="space-y-3">
                  {/* Legacy Auto-Generated PDF */}
                  {completedPdfArr.length > 0 && (
                    <div className="border border-gray-200 rounded-xl bg-gray-50 p-5 flex items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                          <FileDown className="w-5 h-5 text-[#b50938]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{selected.formResponses["CompletedFormPDF"][0].name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Generated PDF document</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={selected.formResponses["CompletedFormPDF"][0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-4 py-2 bg-[#b50938] text-white text-xs font-semibold rounded-lg hover:bg-[#9a0730] transition-colors shadow-sm"
                        >
                          <FileDown className="w-3.5 h-3.5" /> Open PDF
                        </a>
                        <a
                          href={selected.formResponses["CompletedFormPDF"][0].url}
                          download
                          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Signed Contract Document */}
                  {selected.documents && selected.documents.map((doc: any) => {
                    if (doc.fieldName === "SignedContract") {
                      const fileUrl = `/api/v1/file?docId=${doc.id}`;
                      const fileName = doc.originalName || "Signed_Contract.pdf";
                      const openDoc = async () => {
                        const newWindow = window.open("", "_blank");
                        if (newWindow) newWindow.document.write(`<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#666;">Loading ${fileName}...</div>`);
                        try {
                          const res = await fetch(fileUrl, { headers: { Authorization: `Bearer ${token}` } });
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          if (newWindow) newWindow.location.href = url;
                          setTimeout(() => URL.revokeObjectURL(url), 60000);
                        } catch { if (newWindow) newWindow.document.write(`<div style="color:red;padding:20px;">Failed to load file.</div>`); }
                      };
                      const downloadDoc = async () => {
                        const res = await fetch(fileUrl, { headers: { Authorization: `Bearer ${token}` } });
                        const blob = await res.blob();
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = fileName;
                        a.click();
                      };
                      return (
                        <div key={doc.id} className="border border-gray-200 rounded-xl bg-gray-50 p-5 flex items-center justify-between gap-4 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                              <FileDown className="w-5 h-5 text-[#b50938]" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{fileName}</p>
                              <p className="text-xs text-gray-400 mt-0.5">Signed Contract document</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={openDoc}
                              className="flex items-center gap-1.5 px-4 py-2 bg-[#b50938] text-white text-xs font-semibold rounded-lg hover:bg-[#9a0730] transition-colors shadow-sm cursor-pointer"
                            >
                              <FileDown className="w-3.5 h-3.5" /> Open PDF
                            </button>
                            <button
                              onClick={downloadDoc}
                              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition-colors shadow-sm cursor-pointer"
                            >
                              Download
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}

                  {/* Prerequisite PDFs */}
                  {prerequisiteDocs.map((doc: any) => {
                    const fileUrl = `/api/v1/file?docId=${doc.id}`;
                    const docName = doc.fieldName.replace("PrerequisitePDF:", "");
                    const fileName = doc.originalName || `${docName}.pdf`;
                    const openDoc = async () => {
                      const newWindow = window.open("", "_blank");
                      if (newWindow) newWindow.document.write(`<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#666;">Loading ${fileName}...</div>`);
                      try {
                        const res = await fetch(fileUrl, { headers: { Authorization: `Bearer ${token}` } });
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        if (newWindow) newWindow.location.href = url;
                        setTimeout(() => URL.revokeObjectURL(url), 60000);
                      } catch { if (newWindow) newWindow.document.write(`<div style="color:red;padding:20px;">Failed to load file.</div>`); }
                    };
                    const downloadDoc = async () => {
                      const res = await fetch(fileUrl, { headers: { Authorization: `Bearer ${token}` } });
                      const blob = await res.blob();
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = fileName;
                      a.click();
                    };
                    return (
                      <div key={doc.id} className="border border-gray-200 rounded-xl bg-gray-50 p-5 flex items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                            <FileDown className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{fileName}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Prerequisite: {docName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={openDoc}
                            className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700 transition-colors shadow-sm cursor-pointer"
                          >
                            <FileDown className="w-3.5 h-3.5" /> Open PDF
                          </button>
                          <button
                            onClick={downloadDoc}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition-colors shadow-sm cursor-pointer"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-800">Change Status</h3>
              <button onClick={() => { setShowStatusModal(false); setStatusMode(""); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {assignError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2 border border-red-100">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <p>{assignError}</p>
                </div>
              )}
              {!statusMode && (
                <div className="flex flex-col gap-3">
                  <Button
                    variant="outline"
                    className="h-14 justify-start px-6 cursor-pointer hover:bg-primary/5 hover:border-primary/50 disabled:opacity-40"
                    disabled={selected.status.startsWith("Assigned")}
                    onClick={() => { setStatusMode("assign"); handleAssignSelf(); }}
                  >
                    <User className="w-5 h-5 mr-3 text-primary" />
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">Assign to Self</div>
                      <div className="text-xs text-gray-500 font-normal">
                        {selected.status.startsWith("Assigned") ? `Already ${selected.status}` : "Take ownership of treating this form"}
                      </div>
                    </div>
                  </Button>

                  {/* Revert assignment — only visible to the current assignee */}
                  {selected.status.startsWith("Assigned") &&
                    currentUserEmail &&
                    selected.treaterEmail?.toLowerCase() === currentUserEmail && (
                      <Button
                        variant="outline"
                        className="h-14 justify-start px-6 cursor-pointer hover:bg-orange-50 hover:border-orange-300"
                        disabled={isChanging}
                        onClick={() => { setStatusMode("revert"); handleRevertAssignment(); }}
                      >
                        <RefreshCw className="w-5 h-5 mr-3 text-orange-500" />
                        <div className="text-left">
                          <div className="font-semibold text-gray-900">Revert Assignment</div>
                          <div className="text-xs text-gray-500 font-normal">Release your assignment and return to Processing</div>
                        </div>
                      </Button>
                    )}

                  {/* Complete Process — only visible to the current assignee (or if not yet assigned) */}
                  {(!selected.status.startsWith("Assigned") ||
                    (currentUserEmail && selected.treaterEmail?.toLowerCase() === currentUserEmail)) && (
                      <Button variant="outline" className="h-14 justify-start px-6 cursor-pointer hover:bg-green-50 hover:border-green-300" onClick={() => setStatusMode("complete")}>
                        <CheckSquare className="w-5 h-5 mr-3 text-green-600" />
                        <div className="text-left"><div className="font-semibold text-gray-900">Complete Process</div><div className="text-xs text-gray-500 font-normal">Finish treating and optionally route to an approver</div></div>
                      </Button>
                    )}
                </div>
              )}

              {(statusMode === "assign" || statusMode === "revert") && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-sm text-gray-500">{statusMode === "revert" ? "Reverting assignment..." : "Assigning to you..."}</p>
                </div>
              )}

              {statusMode === "complete" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <p className="text-sm text-gray-600">Search for a final approver, or choose <strong>None</strong> to complete without routing.</p>

                  <div>
                    <input
                      autoFocus
                      className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                      placeholder="Type a name or email to search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto bg-white divide-y divide-gray-100 shadow-sm">
                      {searchResults.map((u, idx) =>
                        u._none ? (
                          <button
                            key="none"
                            onClick={() => setSelectedApprover({ _none: true })}
                            className={`w-full text-left text-sm p-3 transition-colors cursor-pointer flex items-center gap-2 ${selectedApprover?._none ? "bg-primary text-white" : "hover:bg-gray-50 text-gray-700"
                              }`}
                          >
                            <span className="text-lg">🚫</span>
                            <div>
                              <div className="font-semibold">None</div>
                              <div className="text-xs opacity-70">Complete without routing to an approver</div>
                            </div>
                          </button>
                        ) : (
                          <button
                            key={u.finca_email}
                            onClick={() => setSelectedApprover(u)}
                            className={`w-full text-left text-sm p-3 transition-colors cursor-pointer ${selectedApprover?.finca_email === u.finca_email ? "bg-primary text-white" : "hover:bg-gray-50 text-gray-800"
                              }`}
                          >
                            <div className="font-medium">{u.user_name}</div>
                            <div className="text-xs opacity-70">{u.finca_email}</div>
                          </button>
                        )
                      )}
                    </div>
                  )}

                  {selectedApprover && (
                    <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                      Selected: <strong>{selectedApprover._none ? "None (complete without approver)" : `${selectedApprover.user_name} — ${selectedApprover.finca_email}`}</strong>
                    </div>
                  )}

                  <Button
                    className="w-full cursor-pointer"
                    disabled={!selectedApprover || isChanging}
                    onClick={handleConfirmAndSubmit}
                  >
                    {isChanging ? "Saving..." : "Confirm & Submit"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Treater Signature Token Modal */}
      {showTreaterTokenModal && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100">
                  <CheckSquare className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Sign &amp; Confirm</h3>
                  <p className="text-xs text-gray-400">{selected.formName} · {selected.reference || selected.id.slice(-8).toUpperCase()}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Enter your secure signature token to confirm this action.
              </p>
              <div className="relative">
                <input
                  autoFocus
                  type={showToken ? "text" : "password"}
                  minLength={8}
                  maxLength={32}
                  value={treaterToken}
                  onChange={(e) => { setTreaterToken(e.target.value); setTreaterTokenError(""); }}
                  placeholder="e.g. 1a2b3c4d"
                  className="w-full text-center tracking-widest font-mono text-lg h-12 border border-gray-300 rounded-xl px-3 pr-12 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {treaterTokenError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {treaterTokenError}
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setShowTreaterTokenModal(false); setTreaterTokenError(""); }} disabled={isChanging}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 text-white"
                  style={{ background: "#b50938" }}
                  disabled={treaterToken.length < 8 || isChanging}
                  onClick={() => handleCompleteProcess(treaterToken)}
                >
                  {isChanging ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Confirming…</> : "Confirm"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Unable to Check PDF Error Modal */}
      {showCheckPdfErrorModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-gray-900 text-lg">Unable to Check PDF</h3>
                <p className="text-sm text-gray-500">
                  We could not verify or generate a PDF document for this action item. Please try again or contact support.
                </p>
              </div>
              <Button
                onClick={() => setShowCheckPdfErrorModal(false)}
                className="w-full cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
