"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Search, X, Plus, Loader2, CheckCircle, XCircle, AlertCircle,
  RefreshCw, ArrowLeft, FileText, Download, Copy, Check,
} from "lucide-react";
import { getCreditBureauLogs, runFirstCentralCheck, runFirstCentralReport, type CreditBureauLog } from "@/app/actions/creditbureau";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ── Helpers ────────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-gray-400 hover:text-gray-600 transition-colors" title="Copy reference">
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    "Match Found": { color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle },
    "No Match":    { color: "text-amber-600",   bg: "bg-amber-50 border-amber-200",     icon: AlertCircle },
    "Failed":      { color: "text-red-600",     bg: "bg-red-50 border-red-200",         icon: XCircle     },
  }[status] ?? { color: "text-gray-600", bg: "bg-gray-50 border-gray-200", icon: AlertCircle };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3 h-3" />{status}
    </span>
  );
}

// ── Report Section ─────────────────────────────────────────────────────────────
const SKIP_SECTIONS = new Set(["DataTicket", "statusCode", "status"]);

function KVTable({ data }: { data: Record<string, any> }) {
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== "" && v !== undefined);
  if (!entries.length) return null;
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
      {entries.map(([k, v]) => (
        <div key={k} className="flex px-3 py-2 text-xs gap-4">
          <span className="w-2/5 font-medium text-gray-500 capitalize shrink-0">
            {k.replace(/([A-Z])/g, " $1").trim()}
          </span>
          <span className="flex-1 text-gray-800 break-words">
            {typeof v === "object" ? JSON.stringify(v) : String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ReportSection({ report }: { report: any }) {
  if (!report || typeof report !== "object") {
    return <p className="text-xs text-gray-400 italic">No report data available.</p>;
  }

  const topLevel = Object.entries(report).filter(([k]) => !SKIP_SECTIONS.has(k));

  if (topLevel.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs text-gray-500 italic">
        Report returned no displayable data.
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-5">
      {topLevel.map(([sectionKey, sectionVal]) => {
        const label = sectionKey.replace(/([A-Z])/g, " $1").trim();

        // Array of objects → render as cards
        if (Array.isArray(sectionVal)) {
          if (sectionVal.length === 0) return null;
          return (
            <div key={sectionKey}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600 mb-2">
                {label} ({sectionVal.length})
              </p>
              <div className="space-y-3">
                {sectionVal.map((item: any, i: number) =>
                  typeof item === "object" && item !== null ? (
                    <div key={i} className="overflow-hidden rounded-xl border border-gray-100">
                      <div className="px-3 py-2 bg-gray-100 text-xs font-bold text-gray-600">
                        #{i + 1}
                      </div>
                      <KVTable data={item} />
                    </div>
                  ) : (
                    <div key={i} className="text-xs text-gray-700 px-3 py-2 bg-gray-50 rounded-lg">
                      {String(item)}
                    </div>
                  )
                )}
              </div>
            </div>
          );
        }

        // Object → render as KV table
        if (typeof sectionVal === "object" && sectionVal !== null) {
          return (
            <div key={sectionKey}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600 mb-2">{label}</p>
              <KVTable data={sectionVal} />
            </div>
          );
        }

        // Primitive → inline
        return (
          <div key={sectionKey} className="flex items-center gap-3 text-xs">
            <span className="font-bold text-gray-500 capitalize">{label}:</span>
            <span className="text-gray-800">{String(sectionVal)}</span>
          </div>
        );
      })}
    </div>
  );
}


// ── Viewer Modal ───────────────────────────────────────────────────────────────

function ViewerModal({ log, onClose, apiBase, token }: {
  log: CreditBureauLog; onClose: () => void; apiBase: string; token: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState("");
  // Per-consumer report fetch state: key = consumerID
  const [reportLoading, setReportLoading] = useState<Record<string, boolean>>({});
  const [reportError,   setReportError]   = useState<Record<string, string>>({});

  const matched: any[] = (log.responseData as any)?.matched ?? [];

  const [reports, setReports] = useState<Record<string, any>>(() => {
    if (!log.reportData) return {};
    const bestMatch = [...matched].sort((a, b) => Number(b.MatchingRate) - Number(a.MatchingRate))[0];
    if (bestMatch?.ConsumerID) return { [bestMatch.ConsumerID]: log.reportData };
    return { "__single": log.reportData };
  });

  const fetchReport = async (consumer: any) => {
    const cid = consumer.ConsumerID;
    if (reports[cid] || reportLoading[cid]) return;
    setReportLoading(p => ({ ...p, [cid]: true }));
    setReportError(p => ({ ...p, [cid]: "" }));
    const res = await runFirstCentralReport({
      reference: log.reference,
      consumerID: cid,
      enquiryID: consumer.EnquiryID,
      subscriberEnquiryEngineID: consumer.MatchingEngineID,
    });
    setReportLoading(p => ({ ...p, [cid]: false }));
    if (!res.success || !res.report) {
      setReportError(p => ({ ...p, [cid]: res.error ?? "Failed to fetch report." }));
    } else {
      setReports(p => ({ ...p, [cid]: res.report }));
    }
  };

  const download = async () => {
    setDownloading(true); setDlError("");
    try {
      const res = await fetch(`${apiBase}/credit-bureau/pdf/${log.reference}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 202) { setDlError("PDF is still generating — try again in a few seconds."); return; }
      if (!res.ok) { setDlError("PDF not available."); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `${log.reference}-CRB-Report.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { setDlError("Download failed."); }
    finally { setDownloading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
          <div>
            <span className="font-mono text-xs font-bold text-sky-600">{log.reference}</span>
            <h3 className="font-bold text-gray-900 text-lg mt-0.5">FirstCentral CRB Report</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={download} disabled={downloading || !log.pdfPath} title={!log.pdfPath ? "PDF generating…" : "Download PDF"}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white text-xs font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors">
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {log.pdfPath ? "Download PDF" : "Generating…"}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {dlError && <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">{dlError}</div>}

          {/* Meta */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-4 p-4">
            {[
              ["Reference",     log.reference],
              ["BVN",           log.bvn],
              ["Status",        log.status],
              ["Records Found", String(log.matchCount)],
              ["Checked By",    log.verifiedBy],
              ["Date",          fmtDate(log.createdAt)],
            ].map(([l, v]) => (
              <div key={l}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{l}</p>
                {l === "Status"
                  ? <div className="mt-0.5"><StatusBadge status={v} /></div>
                  : <p className="font-medium text-gray-800 text-xs mt-0.5" style={{ fontFamily: ["Reference","BVN"].includes(l) ? "monospace" : undefined }}>{v}</p>}
              </div>
            ))}
          </div>

          {/* Matches */}
          {matched.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="font-semibold text-gray-600">No bureau records found</p>
              <p className="text-xs text-gray-400 mt-1">This BVN has no credit history on FirstCentral.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {matched.length} Consumer Record{matched.length > 1 ? "s" : ""} Found
              </p>
              {matched
                .sort((a, b) => Number(b.MatchingRate) - Number(a.MatchingRate))
                .map((m, i) => {
                  const name = [m.FirstName, m.SecondName, m.Surname].filter(Boolean).join(" ") || "—";
                  const rate = Number(m.MatchingRate ?? 0);
                  return (
                    <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <span className="font-semibold text-sm text-gray-800">Record #{i + 1} — {name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${rate >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                            {rate}% Match
                          </span>
                          {m.ConsumerID && !reports[m.ConsumerID] && (
                            <button
                              onClick={() => fetchReport(m)}
                              disabled={reportLoading[m.ConsumerID]}
                              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-sky-600 border border-sky-200 rounded-lg hover:bg-sky-50 disabled:opacity-50 transition-colors"
                            >
                              {reportLoading[m.ConsumerID] ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                              Get Report
                            </button>
                          )}
                          {reports[m.ConsumerID] && (
                            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Report loaded</span>
                          )}
                        </div>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {[
                          ["Date of Birth", m.BirthDate],
                          ["Address",       m.Address],
                          ["Phone",         m.TelePhoneNumber || null],
                          ["Consumer ID",   m.ConsumerID],
                          ["Enquiry ID",    m.EnquiryID],
                          ["FC Reference",  m.Reference],
                        ].map(([label, val]) => val ? (
                          <div key={label} className="flex px-4 py-2.5 text-sm gap-4">
                            <span className="w-1/3 font-medium text-gray-500">{label}</span>
                            <span className="flex-1 text-gray-800 break-words font-mono text-xs">{val}</span>
                          </div>
                        ) : null)}
                      </div>
                      {reportError[m.ConsumerID] && (
                        <div className="px-4 py-3 bg-red-50 text-xs text-red-700 border-t border-red-100 flex items-center gap-2">
                          <XCircle className="w-3 h-3 shrink-0" />{reportError[m.ConsumerID]}
                        </div>
                      )}
                      {reports[m.ConsumerID] && (
                        <div className="px-4 pb-4">
                          <ReportSection report={reports[m.ConsumerID]} />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── New Check Modal ────────────────────────────────────────────────────────────

function NewCheckModal({ onClose, onSuccess }: {
  onClose: () => void; onSuccess: (log: CreditBureauLog) => void;
}) {
  const [bvn, setBvn] = useState("");
  const [isPending, startT] = useTransition();
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!/^\d{11}$/.test(bvn.trim())) { setError("BVN must be exactly 11 digits."); return; }
    startT(async () => {
      const res = await runFirstCentralCheck({ bvn: bvn.trim(), enquiryReason: "Credit Check" });
      if (!res.success) { setError(res.error || "Check failed."); return; }
      onSuccess({
        id: res.reference ?? Date.now().toString(),
        reference: res.reference ?? "—",
        bureau: "firstcentral", bvn: bvn.trim(),
        subjectName: res.matched?.[0]
          ? [res.matched[0].FirstName, res.matched[0].SecondName, res.matched[0].Surname].filter(Boolean).join(" ")
          : "",
        status: res.status ?? "No Match",
        matchCount: res.count ?? 0,
        pdfPath: null, enquiryReason: "Credit Check",
        verifiedBy: "You", createdAt: new Date().toISOString(),
        requestData: { bvn: bvn.trim() },
        responseData: { matched: res.matched ?? [] },
        reportData: null,
      });
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">New FirstCentral Check</h3>
            <p className="text-xs text-gray-500 mt-0.5">Enter the customer's BVN to search the bureau.</p>
          </div>
          <button onClick={onClose} disabled={isPending} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form id="crb-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">BVN <span className="text-red-500">*</span></label>
            <Input type="text" required maxLength={11} placeholder="11-digit BVN"
              value={bvn} onChange={e => setBvn(e.target.value.replace(/\D/g, ""))} className="text-sm font-mono" />
          </div>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
            </div>
          )}
        </form>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button type="submit" form="crb-form" disabled={isPending} className="min-w-[110px] bg-sky-600 hover:bg-sky-700">
            {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching…</> : "Run Check"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function FirstCentralDashboard() {
  const { data: session } = useSession();
  const [logs, setLogs]         = useState<CreditBureauLog[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewing, setViewing]   = useState<CreditBureauLog | null>(null);
  const [, startT]              = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limit = 20;

  const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/api\/v1\/?$/, "") + "/api/v1";
  const token   = (session?.user as any)?.backendToken ?? "";

  const fetchLogs = useCallback(async (pg = 1, q = search) => {
    setLoading(true);
    const res = await getCreditBureauLogs({ bureau: "firstcentral", search: q || undefined, page: pg, limit });
    setLogs(res.data); setTotal(res.total); setPage(pg); setLoading(false);
  }, [search]);

  useEffect(() => { fetchLogs(1); }, []); // eslint-disable-line

  const handleSearch = (v: string) => {
    setSearch(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => startT(() => { fetchLogs(1, v); }), 400);
  };

  const handleNew = (log: CreditBureauLog) => { setShowModal(false); setLogs(p => [log, ...p]); setTotal(t => t + 1); };
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="w-full max-w-6xl mx-auto pb-12 space-y-6">
      <Link href="/dashboard/account-services"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />Extended Services
      </Link>

      {/* Hero */}
      <div className="bg-gradient-to-r from-sky-600 to-sky-800 text-white rounded-2xl px-8 py-6 flex items-center justify-between gap-4 shadow-lg">
        <div>
          <h2 className="text-2xl font-bold">FirstCentral CRB</h2>
          <p className="text-sm text-white/70 mt-1">Run a FirstCentral Credit Bureau consumer match using a customer's BVN.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => fetchLogs(page)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-sky-700 rounded-lg text-sm font-semibold shadow-sm hover:bg-sky-50 transition-colors">
            <Plus className="w-4 h-4" />New Check
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Checks",  value: total,                                               color: "text-gray-900"   },
          { label: "Match Found",   value: logs.filter(l => l.status === "Match Found").length,  color: "text-emerald-600" },
          { label: "No Match",      value: logs.filter(l => l.status !== "Match Found").length,  color: "text-amber-500"  },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by reference, BVN or name…"
              value={search} onChange={e => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400/30" />
            {search && (
              <button onClick={() => handleSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <span className="text-xs text-gray-400 ml-auto">{total} record{total !== 1 ? "s" : ""}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white text-[10px] uppercase tracking-widest">
              <tr>
                {["Reference","BVN","Subject","Status","Records","Checked By","Date","Document"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading…
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400">
                  <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="font-medium">{search ? "No results" : "No checks yet"}</p>
                  {!search && <button onClick={() => setShowModal(true)} className="mt-1 text-sky-600 text-sm hover:underline">Run your first check →</button>}
                </td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-sky-600">
                    <div className="flex items-center gap-2">
                      <CopyButton text={log.reference} />
                      {log.reference}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{log.bvn}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.subjectName || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                  <td className="px-4 py-3 text-xs text-center font-bold text-gray-700">{log.matchCount}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{log.verifiedBy}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(log.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setViewing(log)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-600 border border-sky-200 rounded-lg hover:bg-sky-50 transition-colors">
                      <FileText className="w-3.5 h-3.5" />Document
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <button onClick={() => fetchLogs(page - 1)} disabled={page <= 1 || loading}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40">← Previous</button>
            <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
            <button onClick={() => fetchLogs(page + 1)} disabled={page >= totalPages || loading}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40">Next →</button>
          </div>
        )}
      </div>

      {showModal && <NewCheckModal onClose={() => setShowModal(false)} onSuccess={handleNew} />}
      {viewing   && <ViewerModal log={viewing} apiBase={apiBase} token={token} onClose={() => setViewing(null)} />}
    </div>
  );
}
