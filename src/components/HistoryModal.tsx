"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  X, Search, ChevronLeft, ChevronRight, Loader2,
  FileText, Clock, CheckCircle2, XCircle, PenTool, ShieldCheck, AlertTriangle,
  ExternalLink, Link2, Users, Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────

type MyRole = "submitted" | "signed" | "declined" | "treated" | "approved" | "shared" | "branch_treated" | "requested";

type HistoryItem = {
  id: string;
  formName: string;
  reference: string | null;
  status: string;
  signingType: string;
  treatedBy: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  myRoles: MyRole[];
  mySignatory: { status: string; signedAt: string } | null;
  submittedBy: { user_name: string; finca_email: string; branch: string } | null;
  template: { name: string; formTreater: string };
  signatories: Array<{ userName: string; email: string; status: string; signedAt: string | null; position: number }>;
};

type Meta = { page: number; limit: number; total: number; totalPages: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  "Submitted", "In-review", "Processing",
  "Awaiting Final Approval", "Completed", "Rejected", "Filed",
];

const ROLE_OPTIONS: { value: MyRole; label: string; icon: React.ReactNode }[] = [
  { value: "submitted", label: "I Submitted",      icon: <FileText className="w-3 h-3" /> },
  { value: "requested", label: "I Requested",      icon: <Send className="w-3 h-3" /> },
  { value: "signed",    label: "I Signed",         icon: <PenTool className="w-3 h-3" /> },
  { value: "declined",  label: "I Declined",       icon: <XCircle className="w-3 h-3" /> },
  { value: "treated",   label: "I Treated",        icon: <CheckCircle2 className="w-3 h-3" /> },
  { value: "approved",  label: "I Approved",       icon: <ShieldCheck className="w-3 h-3" /> },
  { value: "shared",   label: "Shared with me",   icon: <Link2 className="w-3 h-3" /> },
  { value: "branch_treated", label: "Branch Treated", icon: <Users className="w-3 h-3" /> },
];

function statusVariant(status: string) {
  switch (status) {
    case "Completed":               return "success";
    case "Processing":              return "warning";
    case "In-review":               return "secondary";
    case "Rejected":                return "destructive";
    case "Awaiting Final Approval": return "outline";
    case "Filed":                   return "secondary";
    default:                        return "default";
  }
}

const ROLE_COLORS: Record<MyRole, string> = {
  submitted: "bg-blue-100 text-blue-700",
  requested: "bg-indigo-100 text-indigo-700",
  signed:    "bg-green-100 text-green-700",
  declined:  "bg-red-100 text-red-600",
  treated:   "bg-purple-100 text-purple-700",
  approved:  "bg-amber-100 text-amber-700",
  shared:    "bg-gray-100 text-gray-600",
  branch_treated: "bg-teal-100 text-teal-700",
};

const SIG_COLORS: Record<string, string> = {
  Signed:   "bg-green-100 text-green-700 border-green-200",
  Declined: "bg-red-100 text-red-600 border-red-200",
  Pending:  "bg-gray-100 text-gray-500 border-gray-200",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(iso));
}

/**
 * Decide where to send the user when they click a history row.
 * Priority: submitted → own submission detail page
 *           treated / approved → action center
 *           signed / declined → workflow queue
 */
function getDestinationUrl(item: HistoryItem): string {
  return `/dashboard/forms/submission/${item.id}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HistoryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session?.user as any)?.backendToken ?? "";
  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch]     = useState("");
  const [status, setStatus]     = useState("");
  const [role, setRole]         = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [page, setPage]         = useState(1);

  // Debounce search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [search]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, status, role, dateFrom, dateTo]);

  const fetchHistory = useCallback(async () => {
    if (!token || !isOpen) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (status)          params.set("status", status);
      if (role)            params.set("role", role);
      if (dateFrom)        params.set("dateFrom", dateFrom);
      if (dateTo)          params.set("dateTo", dateTo);

      const res = await fetch(`${BASE_URL}/api/v1/history?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      setItems(json.data ?? []);
      setMeta(json.meta ?? { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err: any) {
      setError(err.message || "Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, [token, isOpen, page, debouncedSearch, status, role, dateFrom, dateTo, BASE_URL]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Trap focus & close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Activity History</h2>
            <p className="text-xs text-gray-400 mt-0.5">Your last {meta.total} activities across all workflows</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-100 shrink-0 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by form name, reference, status..."
              className="pl-9 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Role chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setRole("")}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                role === "" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
            >
              All Roles
            </button>
            {ROLE_OPTIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setRole(role === r.value ? "" : r.value)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  role === r.value ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                {r.icon} {r.label}
              </button>
            ))}
          </div>

          {/* Status + date row */}
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {(search || status || role || dateFrom || dateTo) && (
              <button
                onClick={() => { setSearch(""); setStatus(""); setRole(""); setDateFrom(""); setDateTo(""); }}
                className="text-xs text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 py-8 text-red-600 text-sm justify-center">
              <AlertTriangle className="w-5 h-5" /> {error}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">
                {role === "shared" ? "No forms have been shared with you yet." : "No activity found."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => { onClose(); router.push(getDestinationUrl(item)); }}
                  className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer space-y-3 group"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 text-sm truncate group-hover:text-primary transition-colors">{item.formName}</p>
                        <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-primary shrink-0 transition-colors" />
                      </div>
                      <div className="flex items-center flex-wrap gap-2 mt-1 text-xs text-gray-400">
                        <span>REF: {item.reference ?? "—"}</span>
                        <span>·</span>
                        <span>By {item.submittedBy?.user_name ?? "Unknown"}</span>
                        <span>·</span>
                        <span>{formatDate(item.createdAt)}</span>
                        {item.updatedAt !== item.createdAt && (
                          <>
                            <span>·</span>
                            <span className="text-primary/70">Updated {formatDate(item.updatedAt)}</span>
                          </>
                        )}
                        <span>·</span>
                        <span className="text-gray-300 group-hover:text-primary/60 transition-colors">
                          → View Details
                        </span>
                      </div>
                    </div>
                    <Badge variant={statusVariant(item.status) as any} className="shrink-0 text-xs">
                      {item.status}
                    </Badge>
                  </div>

                  {/* My roles */}
                  <div className="flex flex-wrap gap-1.5">
                    {item.myRoles.map((r) => (
                      <span
                        key={r}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${ROLE_COLORS[r]}`}
                      >
                        {ROLE_OPTIONS.find((ro) => ro.value === r)?.icon}
                        {ROLE_OPTIONS.find((ro) => ro.value === r)?.label ?? r}
                      </span>
                    ))}
                  </div>

                  {/* Signatories progress */}
                  {item.signatories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.signatories.map((sig, index) => (
                        <span
                          key={`${sig.email}-${index}`}
                          title={`${sig.email} — ${sig.status}`}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${SIG_COLORS[sig.status] ?? SIG_COLORS.Pending}`}
                        >
                          {sig.userName.split(" ")[0]}
                          {sig.status === "Signed" && <CheckCircle2 className="w-2.5 h-2.5 ml-1" />}
                          {sig.status === "Declined" && <XCircle className="w-2.5 h-2.5 ml-1" />}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex items-center justify-between gap-4">
            <span className="text-xs text-gray-500">
              Page {meta.page} of {meta.totalPages} · {meta.total} total
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3 h-3" /> Prev
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
