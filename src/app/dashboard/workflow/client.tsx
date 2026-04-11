"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SignatureCanvas from "react-signature-canvas";
import { signSubmission, declineSubmission, getSubmissionDetail } from "@/app/actions/workflow";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  X,
  GitBranch,
  Layers,
  User,
  Calendar,
  FileText,
  AlertTriangle,
  Pen,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Signatory = {
  id: string;
  position: number;
  userName: string;
  email: string;
  status: string;
  signedAt: string | null;
};

type QueueItem = {
  id: string;
  formName: string;
  signingType: string;
  status: string;
  createdAt: string;
  formResponses: Record<string, any>;
  signatories: Signatory[];
  submittedBy: { user_name: string | null; finca_email: string | null; branch: string | null } | null;
};

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
  const [isPendingSig, startSignTransition] = useTransition();
  const [isPendingDec, startDeclineTransition] = useTransition();
  const [error, setError] = useState("");
  const [confirmDecline, setConfirmDecline] = useState(false);

  const responses = item.formResponses || {};

  const [showSignModal, setShowSignModal] = useState(false);
  const [signMethod, setSignMethod] = useState<"token" | "draw">("token");
  const [signatureToken, setSignatureToken] = useState("");
  const sigPad = useRef<any>(null);

  const handleSignConfirm = () => {
    setError("");
    let payload: { signatureToken?: string, signatureData?: string } = {};

    if (signMethod === "token") {
      if (signatureToken.length !== 8) {
        setError("Token must be exactly 8 characters.");
        return;
      }
      payload.signatureToken = signatureToken;
    } else {
      if (!sigPad.current || sigPad.current.isEmpty()) {
        setError("Please draw your signature.");
        return;
      }
      payload.signatureData = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
    }

    startSignTransition(async () => {
      const res = await signSubmission(item.id, payload);
      if (res.success) {
        onSigned(item.id);
        onClose();
      } else {
        setError(res.error ?? "Failed to sign.");
      }
    });
  };

  const handleDecline = () => {
    setError("");
    startDeclineTransition(async () => {
      const res = await declineSubmission(item.id);
      if (res.success) {
        onDeclined(item.id);
        onClose();
      } else {
        setError(res.error ?? "Failed to decline.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{item.formName}</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Ref: {item.id.slice(-8).toUpperCase()} ·{" "}
              {new Date(item.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${item.signingType === "sequential"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-purple-100 text-purple-700"
                }`}
            >
              {item.signingType === "sequential" ? (
                <GitBranch className="w-3 h-3" />
              ) : (
                <Layers className="w-3 h-3" />
              )}
              {item.signingType}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer ml-1"
            >
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
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900 text-white text-xs">
                    <th className="px-4 py-2.5 text-left font-semibold w-1/2">Question</th>
                    <th className="px-4 py-2.5 text-left font-semibold w-1/2">Response</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(responses).map(([q, a], i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-2.5 font-medium text-gray-700 align-top">{q}</td>
                      <td className="px-4 py-2.5 text-gray-600 align-top">
                        {String(a) || <span className="italic text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatories */}
          <div>
            <h3 className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
              Signatories
            </h3>
            <div className="space-y-2">
              {item.signatories.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3"
                >
                  {item.signingType === "sequential" && (
                    <div
                      className={`h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${s.status === "Signed"
                          ? "bg-green-100 text-green-700"
                          : s.status === "Declined"
                            ? "bg-red-100 text-red-600"
                            : "bg-primary/10 text-primary"
                        }`}
                    >
                      {s.position}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.userName}</p>
                    <p className="text-xs text-gray-400 truncate">{s.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.signedAt && (
                      <span className="text-xs text-gray-400">
                        {new Date(s.signedAt).toLocaleDateString()}
                      </span>
                    )}
                    <Badge
                      variant={
                        s.status === "Signed"
                          ? "success"
                          : s.status === "Declined"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {s.status}
                    </Badge>
                  </div>
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
        <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0 space-y-3">
          {!confirmDecline ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                onClick={() => setConfirmDecline(true)}
                disabled={isPendingDec || isPendingSig}
              >
                <XCircle className="w-4 h-4 mr-2" /> Decline
              </Button>
              <Button
                className="flex-1 cursor-pointer"
                onClick={() => setShowSignModal(true)}
                disabled={isPendingSig || isPendingDec}
              >
                <Pen className="w-4 h-4 mr-2" /> Sign & Approve
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Confirm decline? This will reject the entire document.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 cursor-pointer"
                  onClick={() => setConfirmDecline(false)}
                  disabled={isPendingDec}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 cursor-pointer"
                  onClick={handleDecline}
                  disabled={isPendingDec}
                >
                  {isPendingDec ? "Declining…" : "Yes, Decline"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Signature Modal Overlay */}
      {showSignModal && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Sign Document</h3>
            <button onClick={() => setShowSignModal(false)} className="p-1 hover:bg-gray-100 rounded-full cursor-pointer">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex gap-4 border-b border-gray-200 mb-6">
            <button
              className={`pb-3 font-medium text-sm transition-colors relative ${signMethod === 'token' ? 'text-primary' : 'text-gray-500'}`}
              onClick={() => setSignMethod('token')}
            >
              Use Token
              {signMethod === 'token' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-md" />}
            </button>
            <button
              className={`pb-3 font-medium text-sm transition-colors relative ${signMethod === 'draw' ? 'text-primary' : 'text-gray-500'}`}
              onClick={() => setSignMethod('draw')}
            >
              Draw Fresh
              {signMethod === 'draw' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-md" />}
            </button>
          </div>

          <div className="flex-1 mb-6">
            {signMethod === "token" ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Enter your 8-character secure signature token to automatically apply your registered signature securely.</p>
                <Input
                  value={signatureToken}
                  onChange={(e) => setSignatureToken(e.target.value.toUpperCase())}
                  maxLength={8}
                  placeholder="e.g. 1A2B3C4D"
                  className="mt-2 text-center tracking-widest font-mono uppercase text-lg h-12"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Draw your signature smoothly below.</p>
                <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-hidden">
                  <SignatureCanvas
                    ref={sigPad}
                    canvasProps={{ className: 'w-full h-[250px] cursor-crosshair' }}
                    penColor="#171717"
                  />
                </div>
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => sigPad.current?.clear()}>Clear Canvas</Button>
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
          </div>

          <div className="flex gap-3 mt-auto shrink-0 border-t border-gray-100 pt-6">
            <Button variant="outline" className="flex-1" onClick={() => setShowSignModal(false)}>Cancel</Button>
            <Button className="flex-1 bg-primary text-white" disabled={isPendingSig} onClick={handleSignConfirm}>
              {isPendingSig ? "Authenticating & Signing..." : "Confirm Signature"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkflowClient({ initialQueue }: { initialQueue: QueueItem[] }) {
  const router = useRouter();
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [selected, setSelected] = useState<QueueItem | null>(null);

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Your Queue</h2>
          <p className="text-gray-500">Items pending your review and signature.</p>
        </div>
        {queue.length > 0 && (
          <span className="text-sm font-semibold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
            {queue.length} pending
          </span>
        )}
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
              onClick={() => setSelected(item)}
            >
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="flex gap-4 items-center min-w-0">
                  <div className="bg-amber-100 text-amber-600 p-2.5 rounded-xl shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{item.formName}</h3>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${item.signingType === "sequential"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-purple-100 text-purple-700"
                          }`}
                      >
                        {item.signingType === "sequential" ? (
                          <GitBranch className="w-2.5 h-2.5" />
                        ) : (
                          <Layers className="w-2.5 h-2.5" />
                        )}
                        {item.signingType}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-3">
                      <span>Ref: {item.id.slice(-8).toUpperCase()}</span>
                      {item.submittedBy && (
                        <span>
                          By: {item.submittedBy.user_name ?? item.submittedBy.finca_email}
                        </span>
                      )}
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      <span>
                        {item.signatories.filter((s) => s.status === "Signed").length}/
                        {item.signatories.length} signed
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-primary font-medium hidden group-hover:block transition-all">
                    Review & Sign
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <DetailPanel
          item={selected}
          onClose={() => setSelected(null)}
          onSigned={removeFromQueue}
          onDeclined={removeFromQueue}
        />
      )}
    </div>
  );
}
