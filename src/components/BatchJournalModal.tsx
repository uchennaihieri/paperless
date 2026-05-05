"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Save, AlertCircle, CheckCircle2, Plus, TrendingUp, TrendingDown, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ActionItem = {
  id: string;
  reference?: string | null;
  formName: string;
  template: { name: string; formOwner: string; formTreater: string };
};

function fmtAmount(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

type DraftEntry = {
  tempId: string;
  originalId?: string;
  isCommitted?: boolean;
  sessionRef: string;
  formName: string;
  type: "debit" | "credit";
  accountCode: string;
  accountName: string;
  batchNumber: string;
  branch: string;
  description: string;
  amount: string;
  status: "pending" | "saving" | "success" | "error";
  errorMsg?: string;
};

export function BatchJournalModal({
  isOpen,
  onClose,
  items,
  token,
  baseUrl,
  onComplete
}: {
  isOpen: boolean;
  onClose: () => void;
  items: ActionItem[];
  token: string;
  baseUrl: string;
  onComplete?: () => void;
}) {
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);

  // Initialize drafts when modal opens
  useEffect(() => {
    async function fetchEntries() {
      if (isOpen && items.length > 0) {
        setLoadingEntries(true);
        const allFetched = await Promise.all(
          items.map(async (item) => {
            const sessionRef = item.reference || item.id;
            try {
              const res = await fetch(`${baseUrl}/api/v1/journal/session/${encodeURIComponent(sessionRef)}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              const data = await res.json();
              return { item, entries: data.success ? data.data : [] };
            } catch {
              return { item, entries: [] };
            }
          })
        );

        const newDrafts: DraftEntry[] = [];
        allFetched.forEach(({ item, entries }) => {
          if (entries && entries.length > 0) {
            entries.forEach((entry: any) => {
              newDrafts.push({
                tempId: Math.random().toString(36).substring(2, 9),
                originalId: entry.id,
                isCommitted: entry.committed,
                sessionRef: entry.sessionRef,
                formName: item.template?.name || item.formName,
                type: entry.type as "debit" | "credit",
                accountCode: entry.accountCode,
                accountName: entry.accountName,
                batchNumber: entry.batchNumber || "",
                branch: entry.branch || "",
                description: entry.description,
                amount: entry.amount.toString(),
                status: "pending",
              });
            });
          } else {
            // Default blank draft
            newDrafts.push({
              tempId: Math.random().toString(36).substring(2, 9),
              sessionRef: item.reference || item.id,
              formName: item.template?.name || item.formName,
              type: "debit" as const,
              accountCode: "",
              accountName: "",
              batchNumber: "",
              branch: "",
              description: `Processing ${item.template?.name || item.formName}`,
              amount: "",
              status: "pending",
            });
          }
        });
        setDrafts(newDrafts);
        setLoadingEntries(false);
      } else {
        setDrafts([]);
      }
    }
    fetchEntries();
  }, [isOpen, items, baseUrl, token]);

  if (!isOpen) return null;

  const updateDraft = (tempId: string, field: keyof DraftEntry, value: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.tempId === tempId ? { ...d, [field]: value, status: "pending", errorMsg: undefined } : d))
    );
  };

  const removeDraft = async (tempId: string) => {
    const draft = drafts.find((d) => d.tempId === tempId);
    if (!draft) return;
    if (draft.originalId) {
      try {
        await fetch(`${baseUrl}/api/v1/journal/${draft.originalId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        console.error("Failed to delete", e);
      }
    }
    setDrafts((prev) => prev.filter((d) => d.tempId !== tempId));
  };

  const duplicateDraft = (tempId: string) => {
    setDrafts((prev) => {
      const index = prev.findIndex((d) => d.tempId === tempId);
      if (index === -1) return prev;
      const original = prev[index];
      const newDraft: DraftEntry = {
        ...original,
        tempId: Math.random().toString(36).substring(2, 9),
        type: original.type === "debit" ? "credit" : "debit",
        accountCode: "",
        accountName: "",
        amount: "",
        status: "pending",
        errorMsg: undefined,
      };
      const nextDrafts = [...prev];
      nextDrafts.splice(index + 1, 0, newDraft);
      return nextDrafts;
    });
  };

  const lockedRefs = new Set(drafts.filter(d => d.originalId || d.isCommitted).map(d => d.sessionRef));

  const handleSaveAll = async () => {
    setIsSubmitting(true);
    
    const newDrafts = [...drafts];
    const draftsToSubmit = newDrafts.filter(draft => draft.status !== "success" && !lockedRefs.has(draft.sessionRef));

    if (draftsToSubmit.length === 0) {
      setIsSubmitting(false);
      return;
    }

    // Basic validation
    let hasError = false;
    draftsToSubmit.forEach(draft => {
      if (!draft.accountCode || !draft.accountName || !draft.description || !draft.amount) {
        const idx = newDrafts.findIndex(d => d.tempId === draft.tempId);
        newDrafts[idx] = { ...draft, status: "error", errorMsg: "Missing required fields" };
        hasError = true;
      } else {
        const idx = newDrafts.findIndex(d => d.tempId === draft.tempId);
        newDrafts[idx] = { ...draft, status: "saving" };
      }
    });

    setDrafts([...newDrafts]);

    if (hasError) {
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/api/v1/journal/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ drafts: draftsToSubmit }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to batch save entries");
      }

      // Mark as success
      draftsToSubmit.forEach(draft => {
        const idx = newDrafts.findIndex(d => d.tempId === draft.tempId);
        newDrafts[idx] = { ...newDrafts[idx], status: "success", errorMsg: undefined };
      });
      setDrafts([...newDrafts]);

      if (onComplete) {
        setTimeout(() => {
          onComplete();
        }, 1000);
      }
    } catch (err: any) {
      draftsToSubmit.forEach(draft => {
        const idx = newDrafts.findIndex(d => d.tempId === draft.tempId);
        newDrafts[idx] = { ...newDrafts[idx], status: "error", errorMsg: err.message || "Error" };
      });
      setDrafts([...newDrafts]);
    }

    setIsSubmitting(false);
  };

  const pendingCount = drafts.filter(d => d.status !== 'success').length;
  const totalDebits = drafts.filter(d => d.type === "debit").reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const totalCredits = drafts.filter(d => d.type === "credit").reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Batch Journal Entry</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-xs text-gray-500">
                Edit and save journal entries for your selected items.
              </p>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                isBalanced
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-600"
              }`}>
                <Scale className="w-3 h-3" />
                {isBalanced ? "Balanced" : "Unbalanced"}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Banner */}
        <div className={`border-b shrink-0 ${isBalanced ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
          <div className="flex items-center gap-4 px-5 py-3">
            <div className="flex items-center gap-4 ml-2 text-sm">
              <span className="flex items-center gap-1 text-blue-700">
                <TrendingUp className="w-3.5 h-3.5" />
                Dr: ₦{fmtAmount(totalDebits)}
              </span>
              <span className="flex items-center gap-1 text-purple-700">
                <TrendingDown className="w-3.5 h-3.5" />
                Cr: ₦{fmtAmount(totalCredits)}
              </span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-100 border-b border-gray-200 text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-semibold text-xs w-28">Ref / Form</th>
                  <th className="px-3 py-2 font-semibold text-xs w-24">Type</th>
                  <th className="px-3 py-2 font-semibold text-xs">Account Code *</th>
                  <th className="px-3 py-2 font-semibold text-xs">Account Name *</th>
                  <th className="px-3 py-2 font-semibold text-xs">Description *</th>
                  <th className="px-3 py-2 font-semibold text-xs w-28">Amount (₦) *</th>
                  <th className="px-3 py-2 font-semibold text-xs w-24">Batch</th>
                  <th className="px-3 py-2 font-semibold text-xs w-20">Status</th>
                  <th className="px-3 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {drafts.map((draft) => {
                  const isLocked = lockedRefs.has(draft.sessionRef);
                  const isDisabled = draft.status === "saving" || draft.status === "success" || isLocked;
                  return (
                  <tr key={draft.tempId} className={`transition-colors ${draft.status === 'success' ? 'bg-emerald-50/50' : 'hover:bg-blue-50/30'} ${isLocked ? 'opacity-80 bg-gray-50/50' : ''}`}>
                    <td className="px-3 py-2">
                      <div className="text-xs font-mono font-semibold text-primary break-all">{draft.sessionRef}</div>
                      <div className="text-[10px] text-gray-500 break-words">{draft.formName}</div>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        disabled={isDisabled}
                        className="text-xs border border-gray-200 rounded px-2 py-1.5 w-full focus:ring-1 focus:ring-primary outline-none disabled:bg-gray-50"
                        value={draft.type}
                        onChange={(e) => updateDraft(draft.tempId, "type", e.target.value)}
                      >
                        <option value="debit">Debit</option>
                        <option value="credit">Credit</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        placeholder="1-0-002"
                        disabled={isDisabled}
                        className="text-xs border border-gray-200 rounded px-2 py-1.5 w-full focus:ring-1 focus:ring-primary outline-none disabled:bg-gray-50"
                        value={draft.accountCode}
                        onChange={(e) => updateDraft(draft.tempId, "accountCode", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        placeholder="Name"
                        disabled={isDisabled}
                        className="text-xs border border-gray-200 rounded px-2 py-1.5 w-full focus:ring-1 focus:ring-primary outline-none disabled:bg-gray-50"
                        value={draft.accountName}
                        onChange={(e) => updateDraft(draft.tempId, "accountName", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        placeholder="Desc"
                        disabled={isDisabled}
                        className="text-xs border border-gray-200 rounded px-2 py-1.5 w-full focus:ring-1 focus:ring-primary outline-none disabled:bg-gray-50"
                        value={draft.description}
                        onChange={(e) => updateDraft(draft.tempId, "description", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        disabled={isDisabled}
                        className="text-xs border border-gray-200 rounded px-2 py-1.5 w-full text-right focus:ring-1 focus:ring-primary outline-none disabled:bg-gray-50"
                        value={draft.amount}
                        onChange={(e) => updateDraft(draft.tempId, "amount", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        placeholder="Batch"
                        disabled={isDisabled}
                        className="text-xs border border-gray-200 rounded px-2 py-1.5 w-full focus:ring-1 focus:ring-primary outline-none disabled:bg-gray-50"
                        value={draft.batchNumber}
                        onChange={(e) => updateDraft(draft.tempId, "batchNumber", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isLocked ? (
                        <Badge variant="outline" className={draft.isCommitted ? "border-emerald-200 bg-emerald-50 text-emerald-700 font-medium" : "border-amber-200 bg-amber-50 text-amber-700 font-medium"}>
                          {draft.isCommitted ? "Committed" : "Existing"}
                        </Badge>
                      ) : (
                        <>
                          {draft.status === "saving" && <Loader2 className="w-4 h-4 text-blue-500 animate-spin mx-auto" />}
                          {draft.status === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />}
                          {draft.status === "error" && (
                            <div className="flex flex-col items-center group relative cursor-help">
                              <AlertCircle className="w-4 h-4 text-red-500" />
                              <div className="hidden group-hover:block absolute bottom-full mb-1 bg-gray-900 text-white text-[10px] p-1 rounded whitespace-nowrap z-10">
                                {draft.errorMsg}
                              </div>
                            </div>
                          )}
                          {draft.status === "pending" && <span className="text-[10px] text-gray-400 font-medium uppercase">Pending</span>}
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {!isLocked && draft.status !== "success" && draft.status !== "saving" && (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => duplicateDraft(draft.tempId)}
                            className="text-gray-400 hover:text-primary transition-colors p-1 rounded"
                            title="Add line for this form"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeDraft(draft.tempId)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                            title="Remove item"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )})}
                {drafts.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">
                      No items to process
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-100 shrink-0 bg-white">
          <div className="text-sm text-gray-500 font-medium">
            {pendingCount} item{pendingCount !== 1 && 's'} pending
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="cursor-pointer">
              {drafts.every(d => d.status === 'success') ? 'Close' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleSaveAll} 
              disabled={isSubmitting || pendingCount === 0 || !isBalanced} 
              className="cursor-pointer bg-primary text-white hover:bg-primary/90"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save Pending Entries</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
