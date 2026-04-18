"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  signSubmission, declineSubmission,
  approveSubmission, remindSignatory, getMyQueue,
} from "@/app/actions/workflow";
import { getMySignature } from "@/app/actions/security";

import { useSmartFetch } from "@/hooks/useSmartFetch";

import {
  Clock, CheckCircle2, XCircle, ChevronRight, X,
  GitBranch, Layers, User, FileText, AlertTriangle,
  Pen, Bell, Loader2, RefreshCw
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Signatory = {
  id: string;
  position: number;
  userName: string;
  email: string;
  status: "Pending" | "Signed" | "Declined";
  signedAt: string | null;
  signatureData: string | null;
  declineReason: string | null;
};

type QueueItem = {
  id: string;
  formName: string;
  signingType: string;
  status: string;
  createdAt: string;
  reference: string | null;
  approverEmail?: string | null;
  formResponses: Record<string, any>;
  signatories: Signatory[];
  submittedBy: { user_name: string | null; finca_email: string | null; branch: string | null } | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

async function openFile(url: string, fileName: string, token: string) {
  const newWindow = window.open("", "_blank");
  if (newWindow) {
    newWindow.document.write(`<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#666;">Loading ${fileName}...</div>`);
  }

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("File fetch failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    if (newWindow) {
      newWindow.location.href = objectUrl;
    } else {
      // Fallback if popup blocked
      const link = document.createElement("a");
      link.href = objectUrl;
      link.target = "_blank";
      link.click();
    }
    
    // Revoke object URL after a while so it has time to load
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  } catch (err) {
    if (newWindow) {
      newWindow.document.write(`<div style="color:red;padding:20px;">Failed to load file.</div>`);
    }
  }
}

// ─── Detail Panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  item,
  onClose,
  onSigned,
  onDeclined,
}: {
  item: QueueItem;
  onClose: () => void;
  onSigned: (id: string) => void;
  onDeclined: (id: string) => void;
}) {
  const { data: session } = useSession();
  const token = (session?.user as any)?.backendToken ?? "";
  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";

  const [isPendingSig, startSignTransition]     = useTransition();
  const [isPendingDec, startDeclineTransition]  = useTransition();
  const [isPendingApp, startApproveTransition]  = useTransition();
  const [error, setError]                        = useState("");

  // Decline modal state
  const [showDeclineModal, setShowDeclineModal]  = useState(false);
  const [declineReason, setDeclineReason]        = useState("");

  // Remind state: track which signatoryId is being reminded
  const [remindingId, setRemindingId]            = useState<string | null>(null);
  const [remindFeedback, setRemindFeedback]      = useState<Record<string, string>>({}); // signatoryId → "sent" | error

  // Sign modal state
  const [showSignModal, setShowSignModal]        = useState(false);
  const [signatureToken, setSignatureToken]      = useState("");

  const responses = item.formResponses || {};

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSignConfirm = () => {
    setError("");
    startSignTransition(async () => {
      const sigRes = await getMySignature();
      if (!sigRes.success || !sigRes.signatureData) {
        setError("You must set up your signature in your profile before signing.");
        return;
      }

      let payload: { signatureToken?: string } = {};
      if (signatureToken.length !== 8) { setError("Token must be exactly 8 characters."); return; }
      payload.signatureToken = signatureToken;

      const res = await signSubmission(item.id, payload);
      if (res.success) { onSigned(item.id); onClose(); }
      else { setError(res.error ?? "Failed to sign."); }
    });
  };

  const handleDeclineConfirm = () => {
    setError("");
    startDeclineTransition(async () => {
      const res = await declineSubmission(item.id, declineReason);
      if (res.success) { onDeclined(item.id); onClose(); }
      else { setError(res.error ?? "Failed to decline."); }
    });
  };

  const handleRemind = async (signatoryId: string) => {
    setRemindingId(signatoryId);
    try {
      const res = await remindSignatory(item.id, signatoryId);
      setRemindFeedback((prev) => ({
        ...prev,
        [signatoryId]: res.success ? "✓ Reminder sent" : (res.error || "Failed"),
      }));
    } finally {
      setRemindingId(null);
      // Clear feedback after 4s
      setTimeout(() => setRemindFeedback((prev) => { const n = { ...prev }; delete n[signatoryId]; return n; }), 4000);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 border-b border-gray-100 shrink-0 gap-4">
          <div className="w-full sm:w-auto">
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-bold text-gray-900 pr-4">{item.formName}</h2>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors sm:hidden">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-400 mt-0.5 break-words">
              Ref: {item.reference || item.id.slice(-8).toUpperCase()} <br className="sm:hidden" />
              <span className="hidden sm:inline">· </span>
              <span title={item.createdAt}>{formatDateTime(item.createdAt)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
              item.signingType === "sequential" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
            }`}>
              {item.signingType === "sequential" ? <GitBranch className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
              {item.signingType}
            </span>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors ml-1 hidden sm:block">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Submitted by */}
          {item.submittedBy && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-sm">
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <span className="text-gray-500">Submitted by </span>
                <span className="font-medium text-gray-900">{item.submittedBy.user_name}</span>
                <span className="text-gray-400"> · {item.submittedBy.branch}</span>
              </div>
            </div>
          )}

          {/* Form Responses */}
          <div>
            <h3 className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Form Responses
            </h3>
            <div className="rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm min-w-[350px]">
                <thead>
                  <tr className="bg-gray-900 text-white text-xs">
                    <th className="px-4 py-2.5 text-left font-semibold w-1/2">Question</th>
                    <th className="px-4 py-2.5 text-left font-semibold w-1/2">Response</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(responses).map(([q, a], i) => {
                    const isAttachmentArray = Array.isArray(a) && a.every(v => v && v.isAttachment);
                    return (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-4 py-2.5 font-medium text-gray-700 align-top">{q}</td>
                        <td className="px-4 py-2.5 text-gray-600 align-top">
                          {isAttachmentArray ? (
                            <div className="flex flex-col gap-2">
                              {(a as any[]).map((file, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => openFile(`${BASE_URL}${file.url}`, file.name, token)}
                                  className="flex items-center gap-2 text-primary hover:underline text-left cursor-pointer"
                                >
                                  <FileText className="w-4 h-4 shrink-0" /> {file.name}
                                </button>
                              ))}
                            </div>
                          ) : (
                            String(a) || <span className="italic text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Signatories ── */}
          <div>
            <h3 className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
              Signatories
            </h3>
            <div className="space-y-3">
              {item.signatories.map((s) => (
                <div
                  key={s.id}
                  className={`bg-white border rounded-xl px-4 py-3 space-y-2 ${
                    s.status === "Declined" ? "border-red-200 bg-red-50/30"
                    : s.status === "Signed" ? "border-green-200 bg-green-50/20"
                    : "border-gray-200"
                  }`}
                >
                  {/* Top row: position, name, email, badge */}
                  <div className="flex items-center gap-3">
                    {item.signingType === "sequential" && (
                      <div className={`h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                        s.status === "Signed" ? "bg-green-100 text-green-700"
                        : s.status === "Declined" ? "bg-red-100 text-red-600"
                        : "bg-primary/10 text-primary"
                      }`}>
                        {s.position}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.userName}</p>
                      <p className="text-xs text-gray-400 truncate">{s.email}</p>
                    </div>
                    <Badge variant={
                      s.status === "Signed" ? "success"
                      : s.status === "Declined" ? "destructive"
                      : "secondary"
                    }>
                      {s.status}
                    </Badge>
                  </div>

                  {/* Signed/declined timestamp */}
                  {s.signedAt && (
                    <p className="text-xs text-gray-400 pl-9">
                      {s.status === "Declined" ? "Declined" : "Signed"}: {formatDateTime(s.signedAt)}
                    </p>
                  )}

                  {/* Signature image (Signed only) */}
                  {s.status === "Signed" && s.signatureData && (
                    <div className="mt-1 pl-9">
                      <p className="text-xs text-gray-400 mb-1">Signature</p>
                      <div className="p-2 bg-white rounded-lg border border-gray-100 inline-block">
                        <img
                          src={s.signatureData}
                          alt={`${s.userName}'s signature`}
                          className="max-h-14 max-w-[200px] object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* Decline reason (Declined only) */}
                  {s.status === "Declined" && s.declineReason && (
                    <div className="pl-9">
                      <p className="text-xs font-semibold text-red-600 mb-0.5">Reason</p>
                      <p className="text-xs text-red-700">{s.declineReason}</p>
                    </div>
                  )}

                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0">
          {item.status === "Awaiting Final Approval" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                This document is awaiting your final approval.
              </div>
              <Button
                className="w-full cursor-pointer bg-green-600 hover:bg-green-700 text-white"
                disabled={isPendingApp}
                onClick={() => {
                  startApproveTransition(async () => {
                    const res = await approveSubmission(item.id);
                    if (res.success) onSigned(item.id);
                    else setError(res.error || "Failed to approve.");
                  });
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isPendingApp ? "Approving…" : "Approve & Complete"}
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                onClick={() => { setDeclineReason(""); setShowDeclineModal(true); }}
                disabled={isPendingDec || isPendingSig}
              >
                <XCircle className="w-4 h-4 mr-2" /> Decline
              </Button>
              <Button
                className="flex-1 cursor-pointer"
                onClick={async () => {
                  setError("");
                  const res = await getMySignature();
                  if (!res.success || !res.signatureData) {
                    setError("You need to have saved your signature before you start approving.");
                    return;
                  }
                  setShowSignModal(true);
                }}
                disabled={isPendingSig || isPendingDec}
              >
                <Pen className="w-4 h-4 mr-2" /> Sign & Approve
              </Button>
            </div>
          )}
        </div>

        {/* ── Decline Reason Modal ── */}
        {showDeclineModal && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-100">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Decline Submission</h3>
                    <p className="text-xs text-gray-400">{item.formName} · {item.reference || item.id.slice(-8).toUpperCase()}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Reason <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    id="decline-reason-input"
                    rows={4}
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="e.g. Supporting documents are missing or account number is incorrect."
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                  />
                  <p className="text-xs text-gray-400">
                    If provided, the submitter will be able to see this reason on their submission.
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowDeclineModal(false)} disabled={isPendingDec}>
                    Cancel
                  </Button>
                  <Button
                    id="confirm-decline-btn"
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleDeclineConfirm}
                    disabled={isPendingDec}
                  >
                    {isPendingDec
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Declining…</>
                      : "Confirm Decline"
                    }
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Sign Modal ── */}
        {showSignModal && (
          <div className="absolute inset-0 bg-white z-50 flex flex-col p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Sign Document</h3>
              <button onClick={() => setShowSignModal(false)} className="p-1 hover:bg-gray-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 mb-6">
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Enter your 8-character secure signature token.</p>
                <Input
                  value={signatureToken}
                  onChange={(e) => setSignatureToken(e.target.value)}
                  maxLength={8}
                  placeholder="e.g. 1a2b3c4d"
                  className="text-center tracking-widest font-mono text-lg h-12"
                />
              </div>
              {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
            </div>

            <div className="flex gap-3 mt-auto shrink-0 border-t border-gray-100 pt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowSignModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary text-white" disabled={isPendingSig} onClick={handleSignConfirm}>
                {isPendingSig ? "Signing…" : "Confirm Signature"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Live badge ──────────────────────────────────────────────────────────────

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkflowClient({ initialQueue }: { initialQueue: QueueItem[] }) {
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Always derive selected item from live queue so the panel reflects updates
  const selected = selectedId ? queue.find((q) => q.id === selectedId) ?? null : null;

  const { 
    data: fetchedQueue, 
    lastUpdated, 
    isFetching, 
    timeAgoStr, 
    forceRefresh 
  } = useSmartFetch<QueueItem[]>(async () => {
    const data = await getMyQueue();
    return data as QueueItem[];
  }, []);

  useEffect(() => {
    if (fetchedQueue) setQueue(fetchedQueue);
  }, [fetchedQueue]);

  // After sign/decline, close panel and immediately refresh
  const removeFromQueue = useCallback(async (_id: string) => {
    setSelectedId(null);
    await forceRefresh();
  }, [forceRefresh]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Your Queue</h2>
          <p className="text-gray-500">Items pending your review and signature.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            {isFetching ? (
              <><Loader2 className="w-3 h-3 animate-spin"/> Fetching updates…</>
            ) : (
              `Last updated: ${timeAgoStr}`
            )}
            <button onClick={forceRefresh} className="p-1 hover:bg-gray-200 rounded-full transition-colors ml-1" title="Refresh">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
          {queue.length > 0 && (
            <span className="text-sm font-semibold bg-amber-100 text-amber-700 px-3 py-1 rounded-full hidden sm:inline-block">
              {queue.length} pending
            </span>
          )}
        </div>
      </div>

      {queue.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle2 className="h-14 w-14 text-green-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">All caught up!</h3>
            <p className="text-gray-400 mt-1">You have no pending items in your queue.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {queue.map((item) => (
            <Card
              key={item.id}
              className="hover:shadow-md transition-all cursor-pointer group border-l-4 border-l-amber-400"
              onClick={() => setSelectedId(item.id)}
            >
              <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex gap-3 sm:gap-4 items-start md:items-center min-w-0 w-full md:w-auto">
                  <div className="bg-amber-100 text-amber-600 p-2 sm:p-2.5 rounded-xl shrink-0 mt-1 md:mt-0 hidden sm:block">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start sm:items-center gap-2 flex-col sm:flex-row">
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate w-full sm:w-auto">{item.formName}</h3>
                      <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${
                        item.signingType === "sequential" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      }`}>
                        {item.signingType === "sequential" ? <GitBranch className="w-2.5 h-2.5 shrink-0" /> : <Layers className="w-2.5 h-2.5 shrink-0" />}
                        {item.signingType}
                      </span>
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-400 mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                      <span>Ref: {item.reference || item.id.slice(-8).toUpperCase()}</span>
                      {item.submittedBy && (
                        <span>By: {item.submittedBy.user_name ?? item.submittedBy.finca_email}</span>
                      )}
                      <span>{formatDateTime(item.createdAt)}</span>
                      <span className="font-medium text-amber-600">
                        {item.signatories.filter((s) => s.status === "Signed").length}/
                        {item.signatories.length} signed
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end w-full md:w-auto items-center gap-2 shrink-0 border-t md:border-t-0 border-gray-100 pt-3 md:pt-0">
                  <span className="text-xs text-primary font-medium md:hidden md:group-hover:block">Review & Sign</span>
                  <ChevronRight className="w-5 h-5 text-gray-300 md:group-hover:text-primary transition-colors hover:text-primary cursor-pointer" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <DetailPanel
          item={selected}
          onClose={() => setSelectedId(null)}
          onSigned={removeFromQueue}
          onDeclined={removeFromQueue}
        />
      )}
    </div>
  );
}
