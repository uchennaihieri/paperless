"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X, Plus, Loader2, CheckCircle2, AlertCircle, Trash2,
  TrendingUp, TrendingDown, Scale, Download, Pencil, Save, XCircle,
  FileSpreadsheet, Link2, Unlink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────

type JournalEntry = {
  id: string;
  entryId: string;
  journalId?: string;
  sessionRef: string;
  type: "debit" | "credit";
  accountCode: string;
  accountName: string;
  batchNumber?: string;
  branch?: string;
  description: string;
  amount: string;
  createdBy: string;
  date: string;
  committed: boolean;
};

type Balance = {
  debits: string;
  credits: string;
  balanced: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function fmtAmount(amount: string) {
  return new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(amount));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JournalModal({
  isOpen,
  onClose,
  sessionRef,
  formName,
  token,
  baseUrl,
  readOnly = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  sessionRef: string;
  formName: string;
  token: string;
  baseUrl: string;
  readOnly?: boolean;
}) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [commitError, setCommitError] = useState("");
  const [committed, setCommitted] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<JournalEntry & { amount: string }>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Add form state
  const [type, setType] = useState<"debit" | "credit">("debit");
  const [accountCode, setAccountCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Uploaded journal state
  type UploadedJournalItem = {
    id: string;
    uploadId: string;
    fileName: string;
    totalDebit: string;
    totalCredit: string;
    uploadedBy: string;
    uploadedAt: string;
    linkedSessionRef?: string | null;
  };
  const [showSelectJournal, setShowSelectJournal] = useState(false);
  const [availableUploads, setAvailableUploads] = useState<UploadedJournalItem[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [linkedUpload, setLinkedUpload] = useState<UploadedJournalItem | null>(null);
  const [linkedContent, setLinkedContent] = useState<{ sheets: Record<string, any[]>; fileName: string } | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  // Fetch available uploads for the selector (latest 10)
  const fetchUploads = useCallback(async () => {
    if (!token) return;
    setLoadingUploads(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/journal/uploads`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setAvailableUploads(data.data || []);
    } catch { /* silent */ } finally {
      setLoadingUploads(false);
    }
  }, [token, baseUrl]);

  // Fetch the upload linked to this session (for approver auto-display)
  const fetchLinkedUpload = useCallback(async () => {
    if (!sessionRef || !token) return;
    try {
      const res = await fetch(`${baseUrl}/api/v1/journal/uploads/linked/${encodeURIComponent(sessionRef)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setLinkedUpload(data.data);
        // Auto-fetch content
        fetchUploadContent(data.data.id);
      } else {
        setLinkedUpload(null);
        setLinkedContent(null);
      }
    } catch { /* silent */ }
  }, [sessionRef, token, baseUrl]);

  // Fetch parsed Excel content for a given upload
  const fetchUploadContent = async (uploadId: string) => {
    setLoadingContent(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/journal/uploads/content/${uploadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data?.sheets) {
        setLinkedContent({ sheets: data.data.sheets, fileName: data.data.fileName });
      }
    } catch { /* silent */ } finally {
      setLoadingContent(false);
    }
  };

  // Link an uploaded journal to this session
  const handleLinkUpload = async (uploadId: string) => {
    setLinkingId(uploadId);
    try {
      const res = await fetch(`${baseUrl}/api/v1/journal/uploads/${uploadId}/link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionRef }),
      });
      const data = await res.json();
      if (data.success) {
        setLinkedUpload(data.data);
        setShowSelectJournal(false);
        fetchUploadContent(uploadId);
      }
    } catch { /* silent */ } finally {
      setLinkingId(null);
    }
  };

  // Unlink the currently linked upload
  const handleUnlinkUpload = async () => {
    if (!linkedUpload) return;
    setLinkingId(linkedUpload.id);
    try {
      const res = await fetch(`${baseUrl}/api/v1/journal/uploads/${linkedUpload.id}/link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionRef: null }),
      });
      const data = await res.json();
      if (data.success) {
        setLinkedUpload(null);
        setLinkedContent(null);
      }
    } catch { /* silent */ } finally {
      setLinkingId(null);
    }
  };

  const fetchEntries = useCallback(async () => {
    if (!sessionRef || !token) return;
    setLoadingEntries(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/journal/session/${encodeURIComponent(sessionRef)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setEntries(data.data || []);
        if (data.data?.some((e: JournalEntry) => e.committed)) {
          setCommitted(true);
        } else {
          setCommitted(false);
        }
      }
    } catch {
      // silent
    } finally {
      setLoadingEntries(false);
    }
  }, [sessionRef, token, baseUrl]);

  const fetchBalance = useCallback(async () => {
    if (!sessionRef || !token) return;
    setLoadingBalance(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/journal/balance/${encodeURIComponent(sessionRef)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setBalance(data.data);
    } catch {
      // silent
    } finally {
      setLoadingBalance(false);
    }
  }, [sessionRef, token, baseUrl]);

  useEffect(() => {
    if (isOpen) {
      fetchEntries();
      fetchBalance();
      fetchLinkedUpload();
    }
  }, [isOpen, fetchEntries, fetchBalance, fetchLinkedUpload]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");
    try {
      const res = await fetch(`${baseUrl}/api/v1/journal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionRef,
          formName,
          type,
          accountCode,
          accountName,
          batchNumber: batchNumber || undefined,
          branch: branch || undefined,
          description,
          amount: parseFloat(amount),
          journalId: entries.find(e => e.journalId)?.journalId,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to add entry");

      setSubmitSuccess("Entry added successfully.");
      // reset form
      setType("debit");
      setAccountCode("");
      setAccountName("");
      setBatchNumber("");
      setBranch("");
      setDescription("");
      setAmount("");
      setShowAddForm(false);
      await fetchEntries();
      await fetchBalance();
    } catch (err: any) {
      setSubmitError(err.message || "Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!canMarkComplete) return;
    setIsMarkingComplete(true);
    setCommitError("");
    try {
      // If an uploaded journal is linked, entries are already committed at upload time.
      // Just mark as complete locally — no need to call the commit endpoint.
      if (linkedUpload) {
        setCommitted(true);
      } else {
        const res = await fetch(`${baseUrl}/api/v1/journal/commit/${encodeURIComponent(sessionRef)}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to commit entries");
        setCommitted(true);
        await fetchEntries();
        await fetchBalance();
      }
    } catch (err: any) {
      setCommitError(err.message || "Unexpected error");
    } finally {
      setIsMarkingComplete(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeletingId(id);
    try {
      const res = await fetch(`${baseUrl}/api/v1/journal/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to delete");
      await fetchEntries();
      await fetchBalance();
    } catch {
      // silent
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleEditSave = async (id: string) => {
    setIsSavingEdit(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/journal/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editFields),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to update");
      setEditingId(null);
      await fetchEntries();
      await fetchBalance();
    } catch {
      // silent
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (!isOpen) return null;

  const hasLinkedUpload = !!linkedUpload;
  const canMarkComplete = hasLinkedUpload || (balance && balance.balanced && parseFloat(balance.debits) > 0);

  const debits = entries.filter((e) => e.type === "debit");
  const credits = entries.filter((e) => e.type === "credit");

  const handleDownload = () => {
    if (entries.length === 0) return;

    const rows = entries.map((e) => ({
      "Form Reference": e.sessionRef,
      "Journal ID":     e.journalId || "",
      "Date":           new Date(e.date).toLocaleString(),
      "Type":           e.type.charAt(0).toUpperCase() + e.type.slice(1),
      "Account Code":   e.accountCode,
      "Account Name":   e.accountName,
      "Description":    e.description,
      "Batch Number":   e.batchNumber || "",
      "Branch":         e.branch || "",
      "Amount (₦)":     parseFloat(e.amount),
      "Status":         e.committed ? "Committed" : "Pending",
      "Officer":        e.createdBy,
    }));

    // Summary rows
    rows.push({} as any);
    rows.push({ "Journal ID": "TOTAL DEBITS",  "Amount (₦)": parseFloat(balance?.debits  ?? "0") } as any);
    rows.push({ "Journal ID": "TOTAL CREDITS", "Amount (₦)": parseFloat(balance?.credits ?? "0") } as any);
    rows.push({ "Journal ID": "BALANCED",      "Account Code": balance?.balanced ? "YES" : "NO" } as any);

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0] || {}).map((k) => ({ wch: Math.max(k.length + 2, 16) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Journal Entries");
    XLSX.writeFile(wb, `Journal_${sessionRef}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Journal Entries</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-xs text-gray-500">
                Reference: <span className="font-semibold text-primary">{sessionRef}</span>
                &nbsp;·&nbsp;{formName}
              </p>
              {/* Balance status pill */}
              {hasLinkedUpload ? (
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  linkedUpload.totalDebit === linkedUpload.totalCredit
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-600"
                }`}>
                  <Scale className="w-3 h-3" />
                  {linkedUpload.totalDebit === linkedUpload.totalCredit ? "Balanced" : "Unbalanced"}
                </span>
              ) : !loadingBalance && balance && (
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  balance.balanced
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-600"
                }`}>
                  <Scale className="w-3 h-3" />
                  {balance.balanced ? "Balanced" : "Unbalanced"}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDownload}
              disabled={entries.length === 0}
              className="cursor-pointer text-xs h-8"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Download Excel
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Balance Banner — only show when NOT using an uploaded journal */}
        {!hasLinkedUpload && (
        <div className={`border-b shrink-0 ${balance?.balanced ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
          <div className="flex items-center gap-4 px-5 py-3">
            <div className="flex items-center gap-4 ml-2 text-sm">
              <span className="flex items-center gap-1 text-blue-700">
                <TrendingUp className="w-3.5 h-3.5" />
                Dr: ₦{balance ? fmtAmount(balance.debits) : "0.00"}
              </span>
              <span className="flex items-center gap-1 text-purple-700">
                <TrendingDown className="w-3.5 h-3.5" />
                Cr: ₦{balance ? fmtAmount(balance.credits) : "0.00"}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {commitError && (
                <span className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{commitError}
                </span>
              )}
              {committed && (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Committed to ledger
                </span>
              )}

              {/* Add Line — only when no linked upload */}
              {!readOnly && !committed && !hasLinkedUpload && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowAddForm((v) => !v)}
                  className="cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Line
                </Button>
              )}
              {/* Select Journal — only when no manual entries */}
              {!readOnly && !committed && entries.length === 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => { setShowSelectJournal((v) => !v); if (!showSelectJournal) fetchUploads(); }}
                  className="cursor-pointer border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-1" /> Select Journal
                </Button>
              )}
              {/* Mark Complete — always visible when not readOnly/committed */}
              {!readOnly && !committed && (
                <Button
                  type="button"
                  size="sm"
                  disabled={!canMarkComplete || isMarkingComplete}
                  onClick={handleMarkComplete}
                  className={`cursor-pointer ${canMarkComplete
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-red-100 text-red-500 border border-red-200 cursor-not-allowed"}`}
                >
                  {isMarkingComplete ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Committing…</>
                  ) : canMarkComplete ? (
                    <><CheckCircle2 className="w-4 h-4 mr-1" /> Mark Complete</>
                  ) : (
                    <><AlertCircle className="w-4 h-4 mr-1" /> Mark Complete</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Linked upload banner — replaces balance banner when upload is linked */}
        {hasLinkedUpload && (
        <div className="border-b shrink-0 bg-indigo-50 border-indigo-100">
          <div className="flex items-center gap-4 px-5 py-3">
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold text-indigo-800">{linkedUpload.uploadId} — {linkedUpload.fileName}</span>
              <span className="text-indigo-500 text-xs">
                Dr: ₦{fmtAmount(linkedUpload.totalDebit)} · Cr: ₦{fmtAmount(linkedUpload.totalCredit)}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {commitError && (
                <span className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{commitError}
                </span>
              )}
              {committed && (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Committed to ledger
                </span>
              )}
              {!readOnly && !committed && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleUnlinkUpload}
                  disabled={!!linkingId}
                  className="cursor-pointer text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100"
                >
                  <Unlink className="w-3.5 h-3.5 mr-1" /> Unlink
                </Button>
              )}
              {!readOnly && !committed && (
                <Button
                  type="button"
                  size="sm"
                  disabled={!canMarkComplete || isMarkingComplete}
                  onClick={handleMarkComplete}
                  className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isMarkingComplete ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Committing…</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4 mr-1" /> Mark Complete</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Add Line Form — only when no linked upload */}
        {showAddForm && !hasLinkedUpload && (
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-4 shrink-0">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">New Journal Line</h3>
            <form onSubmit={handleAdd} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Type */}
              <div className="col-span-2 sm:col-span-3 flex gap-2">
                {(["debit", "credit"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold capitalize transition-all ${
                      type === t
                        ? t === "debit"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-purple-500 bg-purple-50 text-purple-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Auto-filled Form Reference */}
              <div className="col-span-2 sm:col-span-3">
                <Label className="text-xs mb-1 block">Form Reference</Label>
                <Input
                  value={sessionRef}
                  readOnly
                  className="bg-gray-100 text-gray-500 cursor-not-allowed font-mono text-sm"
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Account Code *</Label>
                <Input required value={accountCode} onChange={(e) => setAccountCode(e.target.value)} placeholder="1-0-002-2-211" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Account Name *</Label>
                <Input required value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Mobile Banking" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Amount (₦) *</Label>
                <Input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Batch Number</Label>
                <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="BATCH001" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Branch</Label>
                <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Lagos" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Description *</Label>
                <Input required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Transfer reversal" />
              </div>

              <div className="col-span-2 sm:col-span-3 flex items-center gap-3">
                <Button type="submit" disabled={isSubmitting} size="sm" className="cursor-pointer">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving…</> : "Save Entry"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                {submitError && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{submitError}</p>}
                {submitSuccess && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{submitSuccess}</p>}
              </div>
            </form>
          </div>
        )}

        {/* Entries — only when no linked upload */}
        {!hasLinkedUpload && (
        <div className="flex-1 overflow-y-auto">
          {loadingEntries ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Scale className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No journal entries yet</p>
              <p className="text-xs mt-1">Click "Add Line" to record a debit or credit, or use "Select Journal" to link an uploaded Excel.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Journal ID</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Form Ref</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Type</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Account</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Description</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Batch</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-gray-600 text-xs">Amount (₦)</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Status</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Date</th>
                  {!readOnly && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry) => {
                  const isEditing = editingId === entry.id;
                  const canEdit = !readOnly && !entry.committed;

                  if (isEditing) {
                    return (
                      <tr key={entry.id} className="bg-blue-50">
                        <td className="px-4 py-2 font-mono text-xs text-gray-500">{entry.journalId || "—"}</td>
                        <td className="px-4 py-2">
                          <select
                            value={editFields.type ?? entry.type}
                            onChange={(e) => setEditFields(p => ({ ...p, type: e.target.value as any }))}
                            className="text-xs border rounded px-1.5 py-1 w-20"
                          >
                            <option value="debit">Debit</option>
                            <option value="credit">Credit</option>
                          </select>
                        </td>
                        <td className="px-4 py-2 space-y-1">
                          <input className="text-xs border rounded px-1.5 py-1 w-full" value={editFields.accountCode ?? entry.accountCode} onChange={(e) => setEditFields(p => ({ ...p, accountCode: e.target.value }))} placeholder="Code" />
                          <input className="text-xs border rounded px-1.5 py-1 w-full" value={editFields.accountName ?? entry.accountName} onChange={(e) => setEditFields(p => ({ ...p, accountName: e.target.value }))} placeholder="Name" />
                        </td>
                        <td className="px-4 py-2">
                          <input className="text-xs border rounded px-1.5 py-1 w-full" value={editFields.description ?? entry.description} onChange={(e) => setEditFields(p => ({ ...p, description: e.target.value }))} placeholder="Description" />
                        </td>
                        <td className="px-4 py-2">
                          <input className="text-xs border rounded px-1.5 py-1 w-24" value={editFields.batchNumber ?? (entry.batchNumber || "")} onChange={(e) => setEditFields(p => ({ ...p, batchNumber: e.target.value }))} placeholder="Batch" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" min="0.01" step="0.01" className="text-xs border rounded px-1.5 py-1 w-28 text-right" value={editFields.amount ?? entry.amount} onChange={(e) => setEditFields(p => ({ ...p, amount: e.target.value }))} />
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Pending</Badge>
                        </td>
                        <td className="px-4 py-2 text-gray-400 text-xs">{fmt(entry.date)}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => handleEditSave(entry.id)} disabled={isSavingEdit} className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition-colors" title="Save">
                              {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1 rounded text-gray-400 hover:bg-gray-100 transition-colors" title="Cancel">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{entry.journalId || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-primary font-semibold hover:underline">
                        <Link href={`/dashboard/view/${entry.sessionRef}`} target="_blank" rel="noopener noreferrer">
                          {entry.sessionRef}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={entry.type === "debit" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-purple-200 bg-purple-50 text-purple-700"}>
                          {entry.type === "debit" ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                          {entry.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 text-xs">{entry.accountName}</div>
                        <div className="text-gray-400 text-xs font-mono">{entry.accountCode}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-pre-wrap">{entry.description}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{entry.batchNumber || "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">{fmtAmount(entry.amount)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={entry.committed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                          {entry.committed ? "Committed" : "Pending"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{fmt(entry.date)}</td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => { setEditingId(entry.id); setEditFields({}); }}
                              className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              disabled={isDeletingId === entry.id}
                              className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              {isDeletingId === entry.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      )}
                      {!readOnly && !canEdit && <td className="px-4 py-3" />}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        )}

        {/* Footer totals — only when no linked upload */}
        {!hasLinkedUpload && entries.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-end gap-6 text-sm shrink-0">
            <span className="text-gray-500">{entries.length} line{entries.length !== 1 ? "s" : ""}</span>
            <span className="font-semibold text-blue-700">
              Dr total: ₦{fmtAmount(balance?.debits ?? "0")}
            </span>
            <span className="font-semibold text-purple-700">
              Cr total: ₦{fmtAmount(balance?.credits ?? "0")}
            </span>
          </div>
        )}

        {/* ── Select Journal Dropdown (treater only) ── */}
        {showSelectJournal && !readOnly && (
          <div className="border-t border-gray-100 bg-indigo-50 px-5 py-4 shrink-0 max-h-[250px] overflow-y-auto">
            <h3 className="text-sm font-semibold text-indigo-800 mb-3 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Select an Uploaded Journal
            </h3>
            {loadingUploads ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              </div>
            ) : availableUploads.length === 0 ? (
              <p className="text-xs text-indigo-500 py-4 text-center">No uploaded journals found. Upload one from the General Ledger first.</p>
            ) : (
              <div className="space-y-2">
                {availableUploads.map((u) => (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all text-xs ${
                      linkedUpload?.id === u.id
                        ? "border-indigo-400 bg-indigo-100"
                        : "border-indigo-200 bg-white hover:border-indigo-300"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{u.uploadId} — {u.fileName}</div>
                      <div className="text-gray-500 mt-0.5">
                        Dr: ₦{fmtAmount(u.totalDebit)} · Cr: ₦{fmtAmount(u.totalCredit)} · by {u.uploadedBy} · {new Date(u.uploadedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={linkedUpload?.id === u.id ? "default" : "outline"}
                      disabled={linkingId === u.id}
                      onClick={() => linkedUpload?.id === u.id ? handleUnlinkUpload() : handleLinkUpload(u.id)}
                      className={`cursor-pointer ml-3 shrink-0 ${linkedUpload?.id === u.id ? "bg-indigo-600 text-white" : ""}`}
                    >
                      {linkingId === u.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : linkedUpload?.id === u.id ? (
                        <><Unlink className="w-3.5 h-3.5 mr-1" /> Unlink</>
                      ) : (
                        <><Link2 className="w-3.5 h-3.5 mr-1" /> Link</>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Linked Uploaded Journal Content (both treater & approver) ── */}
        {linkedUpload && (
          <div className="flex-1 overflow-y-auto">
            {loadingContent ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              </div>
            ) : linkedContent && Object.keys(linkedContent.sheets).length > 0 ? (
              <div>
                {Object.entries(linkedContent.sheets).map(([sheetName, rows]) => {
                  if (rows.length === 0) return null;
                  const headers = Object.keys(rows[0]);
                  return (
                    <div key={sheetName}>
                      {Object.keys(linkedContent.sheets).length > 1 && (
                        <div className="px-5 py-1.5 bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          Sheet: {sheetName}
                        </div>
                      )}
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-gray-100 border-b border-gray-200">
                          <tr>
                            {headers.map((h) => (
                              <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {rows.map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              {headers.map((h) => (
                                <td key={h} className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{String(row[h] ?? "")}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <FileSpreadsheet className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Excel content will appear here</p>
                <p className="text-xs mt-1">The file content from SharePoint is loading or unavailable.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
