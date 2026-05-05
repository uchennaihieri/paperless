"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X, Plus, Loader2, CheckCircle2, AlertCircle, Trash2,
  TrendingUp, TrendingDown, Scale, Download, Pencil, Save, XCircle
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
    }
  }, [isOpen, fetchEntries, fetchBalance]);

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
      const res = await fetch(`${baseUrl}/api/v1/journal/commit/${encodeURIComponent(sessionRef)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to commit entries");
      setCommitted(true);
      await fetchEntries();
      await fetchBalance();
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

  const canMarkComplete = balance && balance.balanced && parseFloat(balance.debits) > 0;

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
              {!loadingBalance && balance && (
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

        {/* Balance Banner */}
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

              {!readOnly && !committed && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowAddForm((v) => !v)}
                  className="cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Line
                </Button>
              )}
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

        {/* Add Line Form */}
        {showAddForm && (
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

        {/* Entries */}
        <div className="flex-1 overflow-y-auto">
          {loadingEntries ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Scale className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No journal entries yet</p>
              <p className="text-xs mt-1">Click "Add Line" to record a debit or credit.</p>
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

        {/* Footer totals */}
        {entries.length > 0 && (
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
      </div>
    </div>
  );
}
