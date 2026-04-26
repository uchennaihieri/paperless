"use client";

import { useState, useCallback, useEffect } from "react";
import {
  X, Search, ChevronLeft, ChevronRight, Loader2,
  ShieldCheck, Filter, Calendar, User, Hash,
} from "lucide-react";
import { getAuditTrail, getAuditTrailDetails, AuditRecord, AuditMeta } from "@/app/actions/audit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  "Submitted", "In-review", "Processing",
  "Awaiting Final Approval", "Completed", "Rejected", "Filed",
];

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  signed:              { label: "Signed",           color: "bg-green-100 text-green-700" },
  declined:            { label: "Declined",         color: "bg-red-100 text-red-700" },
  assigned:            { label: "Assigned",         color: "bg-blue-100 text-blue-700" },
  completed:           { label: "Completed",        color: "bg-emerald-100 text-emerald-700" },
  routed_for_approval: { label: "Routed",           color: "bg-amber-100 text-amber-700" },
  approved:            { label: "Approved",         color: "bg-purple-100 text-purple-700" },
  final_declined:      { label: "Final Declined",   color: "bg-red-200 text-red-800" },
};

const PAGE_SIZE = 25;

function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_LABELS[action] ?? { label: action, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>
      {meta.label}
    </span>
  );
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: "medium", timeStyle: "short",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AuditTrailModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [records, setRecords]     = useState<AuditRecord[]>([]);
  const [meta, setMeta]           = useState<AuditMeta>({ total: 0, page: 1, limit: PAGE_SIZE, pages: 0 });
  const [loading, setLoading]     = useState(false);

  // Detail View State
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [selectedFormReference, setSelectedFormReference] = useState<string | null>(null);
  const [fullTrail, setFullTrail] = useState<AuditRecord[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Filters
  const [reference, setReference] = useState("");
  const [email, setEmail]         = useState("");
  const [status, setStatus]       = useState("");
  const [date, setDate]           = useState("");
  const [page, setPage]           = useState(1);

  // Applied filters (only applied on search click)
  const [applied, setApplied] = useState<{
    reference: string; email: string; status: string; date: string;
  }>({ reference: "", email: "", status: "", date: "" });

  const fetchAudit = useCallback(async (pg: number, filters: typeof applied) => {
    setLoading(true);
    try {
      const result = await getAuditTrail({
        reference: filters.reference || undefined,
        email:     filters.email     || undefined,
        status:    filters.status    || undefined,
        date:      filters.date      || undefined,
        page:      pg,
        limit:     PAGE_SIZE,
      });
      setRecords(result.data);
      setMeta(result.meta);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on open
  useEffect(() => {
    if (isOpen) {
      setSelectedSubmissionId(null);
      fetchAudit(1, { reference: "", email: "", status: "", date: "" });
    }
  }, [isOpen, fetchAudit]);

  // Load details when a row is clicked
  useEffect(() => {
    if (!selectedSubmissionId) return;

    const fetchDetails = async () => {
      setLoadingDetails(true);
      try {
        const details = await getAuditTrailDetails(selectedSubmissionId);
        setFullTrail(details);
      } catch (err) {
        console.error("Failed to load audit trail details", err);
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchDetails();
  }, [selectedSubmissionId]);

  const handleSearch = () => {
    const filters = { reference, email, status, date };
    setApplied(filters);
    setPage(1);
    fetchAudit(1, filters);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchAudit(newPage, applied);
  };

  const handleClear = () => {
    const empty = { reference: "", email: "", status: "", date: "" };
    setReference(""); setEmail(""); setStatus(""); setDate("");
    setApplied(empty);
    setPage(1);
    fetchAudit(1, empty);
  };

  if (!isOpen) return null;

  const hasFilters = reference || email || status || date;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            {selectedSubmissionId ? (
              <button
                onClick={() => setSelectedSubmissionId(null)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Back to table"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            ) : (
              <div className="p-2 rounded-lg bg-[#b50938]/10">
                <ShieldCheck className="w-5 h-5 text-[#b50938]" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {selectedSubmissionId ? `Audit Trail: ${selectedFormReference || "Unknown Reference"}` : "Audit Trail"}
              </h2>
              <p className="text-xs text-gray-400">
                {selectedSubmissionId
                  ? "Full history of this submission"
                  : meta.total > 0 ? `${meta.total} form${meta.total !== 1 ? "s" : ""} recorded` : "Latest form statuses"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content Area */}
        {selectedSubmissionId ? (
          <div className="flex-1 overflow-auto p-6 bg-gray-50">
            {loadingDetails ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-[#b50938]" />
                <p className="text-sm">Loading full history…</p>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="relative border-l-2 border-gray-200 ml-4 space-y-8">
                  {fullTrail.map((activity, index) => {
                    const isLatest = index === fullTrail.length - 1;
                    return (
                      <div key={activity.id} className="relative pl-6">
                        <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white ${isLatest ? 'bg-[#b50938]' : 'bg-gray-300'}`}></div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <ActionBadge action={activity.action} />
                            </div>
                            <div className="text-xs text-gray-500 font-mono whitespace-nowrap">
                              {fmt(activity.createdAt)}
                            </div>
                          </div>
                          
                          <div className="mb-2">
                            <span className="text-sm text-gray-600">Status changed to: </span>
                            <span className="text-sm font-semibold text-gray-900">{activity.newStatus}</span>
                            {activity.prevStatus && activity.prevStatus !== "—" && (
                              <span className="text-xs text-gray-400 ml-2">(was {activity.prevStatus})</span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>
                              <span className="font-medium text-gray-900">{activity.actorName || "System"}</span>
                              {activity.actorEmail && <span className="text-gray-500"> ({activity.actorEmail})</span>}
                            </span>
                          </div>
                          
                          {activity.note && (
                            <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-600 italic border border-gray-100">
                              {activity.note}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="relative">
              <Hash className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <Input
                placeholder="Reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-8 text-sm h-9"
              />
            </div>
            <div className="relative">
              <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <Input
                placeholder="Actor email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-8 text-sm h-9"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#b50938] h-9"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-md pl-8 pr-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#b50938] h-9"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="text-white h-8 px-4"
              style={{ background: "#b50938" }}
              onClick={handleSearch}
            >
              <Filter className="w-3.5 h-3.5 mr-1.5" /> Search
            </Button>
            {hasFilters && (
              <Button size="sm" variant="outline" className="h-8 px-4 text-gray-600" onClick={handleClear}>
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#b50938]" />
              <p className="text-sm">Loading audit events…</p>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
              <ShieldCheck className="w-10 h-10 opacity-20" />
              <p className="text-sm">No audit events found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-900 text-white text-xs">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold w-32">Reference</th>
                  <th className="px-4 py-3 text-left font-semibold w-28">Action</th>
                  <th className="px-4 py-3 text-left font-semibold">Status Change</th>
                  <th className="px-4 py-3 text-left font-semibold">Actor</th>
                  <th className="px-4 py-3 text-left font-semibold">Note</th>
                  <th className="px-4 py-3 text-left font-semibold w-36">Date &amp; Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r, i) => (
                  <tr 
                    key={r.id} 
                    className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} cursor-pointer hover:bg-gray-100 transition-colors`}
                    onClick={() => {
                      setSelectedSubmissionId(r.submissionId);
                      setSelectedFormReference(r.formReference);
                    }}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 font-semibold">
                      {r.formReference || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge action={r.action} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                          {r.newStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 text-xs">{r.actorName || "—"}</p>
                      <p className="text-gray-400 text-xs">{r.actorEmail || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate" title={r.note || ""}>
                      {r.note || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {fmt(r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {meta.pages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50">
            <p className="text-xs text-gray-500">
              Page {meta.page} of {meta.pages} &nbsp;·&nbsp; {meta.total} total events
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="sm" variant="outline" className="h-7 w-7 p-0"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(meta.pages, 7) }, (_, i) => {
                const p = i + 1;
                return (
                  <Button
                    key={p} size="sm"
                    variant={p === page ? "default" : "outline"}
                    className={`h-7 w-7 p-0 text-xs ${p === page ? "text-white" : ""}`}
                    style={p === page ? { background: "#b50938" } : {}}
                    onClick={() => handlePageChange(p)}
                  >
                    {p}
                  </Button>
                );
              })}
              <Button
                size="sm" variant="outline" className="h-7 w-7 p-0"
                disabled={page >= meta.pages}
                onClick={() => handlePageChange(page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
