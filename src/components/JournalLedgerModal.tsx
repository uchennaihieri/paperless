"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X, Search, ChevronLeft, ChevronRight, Loader2,
  TrendingUp, TrendingDown, BookOpen, Filter, Plus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";
import { AddActionItemsModal } from "./AddActionItemsModal";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type LedgerEntry = {
  id: string;
  entryId: string;
  journalId?: string;
  sessionRef: string;
  formName: string;
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

type Meta = {
  total: number;
  page: number;
  limit: number;
  pages: number;
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

const PAGE_SIZE = 25;

// ─── Component ────────────────────────────────────────────────────────────────

export function JournalLedgerModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const token = (session?.user as any)?.backendToken ?? "";
  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";

  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: PAGE_SIZE, pages: 0 });
  const [loading, setLoading] = useState(false);

  // Filters
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [account, setAccount] = useState("");
  const [description, setDescription] = useState("");
  const [form, setForm] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddItems, setShowAddItems] = useState(false);

  const fetchLedger = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (account) params.set("account", account);
      if (description) params.set("description", description);
      if (form) params.set("form", form);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`${BASE_URL}/api/v1/journal?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setEntries(data.data || []);
        setMeta(data.meta || { total: 0, page: 1, limit: PAGE_SIZE, pages: 0 });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, BASE_URL, from, to, account, description, form, page]);

  useEffect(() => {
    if (isOpen) fetchLedger();
  }, [isOpen, fetchLedger]);

  const handleFilter = () => {
    setPage(1);
    fetchLedger();
  };

  const handleClear = () => {
    setFrom(""); setTo(""); setAccount(""); setDescription(""); setForm("");
    setPage(1);
  };

  if (!isOpen) return null;

  const totalDebits = entries
    .filter((e) => e.type === "debit")
    .reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalCredits = entries
    .filter((e) => e.type === "credit")
    .reduce((s, e) => s + parseFloat(e.amount), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">General Ledger</h2>
              <p className="text-xs text-gray-500">Global journal entries</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddItems(true)}
              className="cursor-pointer bg-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add items
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowFilters((v) => !v)}
              className="cursor-pointer"
            >
              <Filter className="w-4 h-4 mr-1" />
              {showFilters ? "Hide Filters" : "Filters"}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-4 shrink-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <Label className="text-xs mb-1 block">From Date</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">To Date</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Account Code/Name</Label>
                <Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Search account…" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Search description…" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Form Name</Label>
                <Input value={form} onChange={(e) => setForm(e.target.value)} placeholder="Search form…" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleFilter} className="cursor-pointer">
                <Search className="w-4 h-4 mr-1" /> Apply
              </Button>
              <Button size="sm" variant="ghost" onClick={handleClear} className="cursor-pointer">
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Summary bar */}
        <div className="flex items-center gap-6 px-5 py-2.5 bg-gray-50 border-b border-gray-100 shrink-0 text-sm">
          <span className="text-gray-500">{meta.total.toLocaleString()} entries</span>
          <span className="flex items-center gap-1 text-blue-700 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            Dr: ₦{fmtAmount(String(totalDebits))}
          </span>
          <span className="flex items-center gap-1 text-purple-700 font-semibold">
            <TrendingDown className="w-3.5 h-3.5" />
            Cr: ₦{fmtAmount(String(totalCredits))}
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <BookOpen className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No committed entries found</p>
              <p className="text-xs mt-1">Entries appear here after a submission is completed.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Journal ID</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Date</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Reference</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Form</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Type</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Account</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Description</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Batch</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Branch</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Status</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-gray-600 text-xs">Amount (₦)</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Officer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{entry.journalId || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(entry.date)}</td>
                    <td className="px-4 py-3 font-semibold text-primary text-xs hover:underline hover:text-blue-600 transition-colors">
                      <Link href={`/dashboard/view/${entry.sessionRef}`} target="_blank" rel="noopener noreferrer">
                        {entry.sessionRef}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs max-w-[120px] truncate">{entry.formName}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={
                          entry.type === "debit"
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-purple-200 bg-purple-50 text-purple-700"
                        }
                      >
                        {entry.type === "debit" ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        {entry.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium text-gray-900">{entry.accountName}</div>
                      <div className="text-xs text-gray-400 font-mono">{entry.accountCode}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-pre-wrap">{entry.description}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{entry.batchNumber || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{entry.branch || "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      <Badge variant="outline" className={entry.committed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                        {entry.committed ? "Committed" : "Pending"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">
                      {fmtAmount(entry.amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[120px] truncate">{entry.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {meta.pages > 1 && (
          <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between shrink-0">
            <span className="text-xs text-gray-500">
              Page {meta.page} of {meta.pages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                className="cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= meta.pages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AddActionItemsModal
        isOpen={showAddItems}
        onClose={() => {
          setShowAddItems(false);
          fetchLedger();
        }}
      />
    </div>
  );
}
