"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Search, X, Plus, Loader2, CheckCircle, XCircle, AlertCircle,
  RefreshCw, ArrowLeft, FileText, Download, Copy, Check, History
} from "lucide-react";
import { getCreditBureauLogs, runCreditRegistryCheck, runFirstCentralCheck, checkCrbHistory, type CreditBureauLog } from "@/app/actions/creditbureau";
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

function fmtNaira(n: number) {
  return "₦" + Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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

// ── Account Summary Table ──────────────────────────────────────────────────────

function AccountSummaryTable({ summaries }: { summaries: any[] }) {
  if (!summaries || summaries.length === 0) return null;
  const s = summaries[0];
  const types = [
    { name: "Revolving",   count: s.Count_Revolving,   balance: s.Balance_Revolving,   limit: s.CreditLimit_Revolving,   payment: s.Payment_Revolving },
    { name: "Installment", count: s.Count_Installment, balance: s.Balance_Installment, limit: s.CreditLimit_Installment, payment: s.Payment_Installment },
    { name: "Auto",        count: s.Count_Auto,        balance: s.Balance_Auto,        limit: s.CreditLimit_Auto,        payment: s.Payment_Auto },
    { name: "Mortgage",    count: s.Count_Mortgage,    balance: s.Balance_Mortgage,    limit: s.CreditLimit_Mortgage,    payment: s.Payment_Mortgage },
    { name: "Overdraft",   count: s.Count_Overdraft,   balance: s.Balance_Overdraft,   limit: s.CreditLimit_Overdraft,   payment: s.Minimum_Payment ?? 0 },
    { name: "Other",       count: s.Count_Other,       balance: s.Balance_Other,       limit: s.CreditLimit_Other,       payment: s.Payment_Other },
  ].filter(t => t.count > 0);
  const total = { count: s.Count_Total, balance: s.Balance_Total, limit: s.CreditLimit_Total, payment: s.Payment_Total };

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
        Account Summary ({s.Currency ?? "NGN"})
      </p>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold">Type</th>
              <th className="px-3 py-2.5 text-center font-semibold">Count</th>
              <th className="px-3 py-2.5 text-right font-semibold">Balance</th>
              <th className="px-3 py-2.5 text-right font-semibold">Credit Limit</th>
              <th className="px-3 py-2.5 text-right font-semibold">Payment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {types.map(t => (
              <tr key={t.name} className="hover:bg-gray-50/50">
                <td className="px-3 py-2 font-medium text-gray-700">{t.name}</td>
                <td className="px-3 py-2 text-center text-gray-600">{t.count}</td>
                <td className="px-3 py-2 text-right font-mono text-gray-800">{fmtNaira(t.balance)}</td>
                <td className="px-3 py-2 text-right font-mono text-gray-600">{fmtNaira(t.limit)}</td>
                <td className="px-3 py-2 text-right font-mono text-gray-600">{fmtNaira(t.payment)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-bold">
              <td className="px-3 py-2 text-gray-900">Total</td>
              <td className="px-3 py-2 text-center text-gray-900">{total.count}</td>
              <td className="px-3 py-2 text-right font-mono text-gray-900">{fmtNaira(total.balance)}</td>
              <td className="px-3 py-2 text-right font-mono text-gray-900">{fmtNaira(total.limit)}</td>
              <td className="px-3 py-2 text-right font-mono text-gray-900">{fmtNaira(total.payment)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Performance Summary Grid ───────────────────────────────────────────────────

function PerformanceSummaryGrid({ perf }: { perf: any }) {
  if (!perf) return null;
  const items = [
    { label: "Open Accounts",      value: perf.Count_AccountStatus_Open,                             color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-100" },
    { label: "Performing",         value: perf.Count_AccountStatus_Performing,                        color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100" },
    { label: "Closed",             value: perf.Count_AccountStatus_Closed,                            color: "text-gray-700",    bg: "bg-gray-50",    border: "border-gray-100" },
    { label: "Late (<30d)",        value: perf.Count_AccountStatus_Late_less_than_30_days,            color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-100" },
    { label: "Delinquent (30-60d)",value: perf.Count_AccountStatus_Delinquent_30_over_60_days,        color: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-100" },
    { label: "Substandard (90d)",  value: perf.Count_AccountStatus_Derogatory_Substandard_90,         color: "text-red-600",     bg: "bg-red-50",     border: "border-red-100" },
    { label: "Doubtful (180d)",    value: perf.Count_AccountStatus_Derogatory_Doubtful_180,           color: "text-red-700",     bg: "bg-red-50",     border: "border-red-100" },
    { label: "Lost (360d)",        value: perf.Count_AccountStatus_Derogatory_Lost_360,               color: "text-red-800",     bg: "bg-red-50",     border: "border-red-100" },
    { label: "Written Off",        value: perf.Count_AccountStatus_Written_off,                       color: "text-red-900",     bg: "bg-red-50",     border: "border-red-100" },
    { label: "Judgments",          value: perf.Count_LegalStatus_Judgment,                            color: "text-rose-700",    bg: "bg-rose-50",    border: "border-rose-100" },
    { label: "Litigations",        value: perf.Count_LegalStatus_Litigation,                          color: "text-rose-700",    bg: "bg-rose-50",    border: "border-rose-100" },
    { label: "Inquiries (12mo)",   value: perf.Inquiry_Count_12_Months,                              color: "text-primary",  bg: "bg-primary/5",  border: "border-purple-100" },
  ];

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
        Performance Summary
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {items.map(item => (
          <div key={item.label} className={`${item.bg} border ${item.border} rounded-lg px-3 py-2.5`}>
            <p className={`text-xl font-bold ${item.color}`}>{item.value ?? "0"}</p>
            <p className="text-[10px] font-medium text-gray-500 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Viewer Modal ───────────────────────────────────────────────────────────────

function ViewerModal({ log, onClose, apiBase, token }: {
  log: CreditBureauLog; onClose: () => void; apiBase: string; token: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState("");
  const [isPdfReady, setIsPdfReady] = useState(!!log.pdfPath);

  useEffect(() => {
    if (isPdfReady) return;
    const int = setInterval(async () => {
      try {
        const res = await fetch(`${apiBase}/credit-bureau/pdf/${log.reference}`, {
          method: "HEAD",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 200) setIsPdfReady(true);
      } catch {}
    }, 3000);
    return () => clearInterval(int);
  }, [isPdfReady, apiBase, log.reference, token]);

  const searchResult: any[] = (log.responseData as any)?.searchResult ?? [];
  const report = log.reportData as any;

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
            <span className="font-mono text-xs font-bold text-primary">{log.reference}</span>
            <h3 className="font-bold text-gray-900 text-lg mt-0.5">CreditRegistry CRB Report</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={download} disabled={downloading || !isPdfReady} title={!isPdfReady ? "PDF generating…" : "Download PDF"}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {isPdfReady ? "Download PDF" : "Generating…"}
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

          {/* Search Results */}
          {searchResult.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="font-semibold text-gray-600">No bureau records found</p>
              <p className="text-xs text-gray-400 mt-1">This BVN has no credit history on CreditRegistry.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {searchResult.length} Search Result{searchResult.length > 1 ? "s" : ""} Found (Showing Best Match)
              </p>
              {searchResult
                .sort((a, b) => (b.Relevance ?? 0) - (a.Relevance ?? 0))
                .slice(0, 1)
                .map((r, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <span className="font-semibold text-sm text-gray-800">{r.Name ?? "—"}</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${r.Relevance >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                        {r.Relevance}% Relevance
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {[
                        ["Registry ID",    r.RegistryID],
                        ["Correlation ID", r.CorrelationID],
                      ].map(([label, val]) => val ? (
                        <div key={label} className="flex px-4 py-2.5 text-sm gap-4">
                          <span className="w-1/3 font-medium text-gray-500">{label}</span>
                          <span className="flex-1 text-gray-800 break-words font-mono text-xs">{val}</span>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Report: Account Summary + Performance Summary */}
          {report && (
            <div className="space-y-5 pt-2 border-t border-gray-100">
              <AccountSummaryTable summaries={report.AccountSummaries} />
              <PerformanceSummaryGrid perf={report.PerformanceSummary} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ── New Check Modal ────────────────────────────────────────────────────────────

function NewCheckModal({ onClose, onSuccess, onView }: {
  onClose: () => void; onSuccess: (log: CreditBureauLog) => void; onView: (log: CreditBureauLog) => void;
}) {
  const [bvn, setBvn] = useState("");
  const [runBoth, setRunBoth] = useState(false);
  const [isPending, startT] = useTransition();
  const [error, setError] = useState("");
  const [historyLog, setHistoryLog] = useState<CreditBureauLog | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!/^\d{11}$/.test(bvn.trim())) { setError("BVN must be exactly 11 digits."); return; }
    startT(async () => {
      if (!historyLog) {
        const histRes = await checkCrbHistory(bvn.trim());
        if (histRes.success && histRes.data && histRes.data.bureau === "creditregistry") {
          setHistoryLog(histRes.data);
          return;
        }
      }
      runCheck(false);
    });
  };

  const runCheck = (forceNew: boolean, cloneFromReference?: string) => {
    setError("");
    startT(async () => {
      const p1 = runCreditRegistryCheck({ bvn: bvn.trim(), forceNew, cloneFromReference });
      const p2 = runBoth ? runFirstCentralCheck({ bvn: bvn.trim(), enquiryReason: "Credit Check", forceNew }) : Promise.resolve(null);
      const [res] = await Promise.all([p1, p2]);
      if (!res.success) { setError(res.error || "Check failed."); return; }

      const newLogObj: CreditBureauLog = {
        id: res.id ?? res.reference ?? Date.now().toString(),
        reference: res.reference ?? "—",
        bureau: "creditregistry", bvn: bvn.trim(),
        subjectName: res.subjectName ?? (res.searchResult?.[0]?.Name ?? ""),
        status: res.status ?? "No Match",
        matchCount: res.count ?? 0,
        pdfPath: null, enquiryReason: "KYCCheck",
        verifiedBy: res.verifiedBy ?? "You", createdAt: res.createdAt ?? new Date().toISOString(),
        requestData: { bvn: bvn.trim() },
        responseData: { searchResult: res.searchResult ?? [] },
        reportData: res.report ?? null,
      };

      onSuccess(newLogObj);
      onView(newLogObj);
    });
  };

  if (historyLog) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200 p-6 text-center">
          <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <History className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-2">Previous Check Found</h3>
          <p className="text-sm text-gray-500 mb-6">
            A CreditRegistry check for this BVN was previously performed on <br/>
            <span className="font-semibold text-gray-800">{fmtDate(historyLog.createdAt)}</span>.
            <span className="mt-2 block"><StatusBadge status={historyLog.status} /></span>
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => runCheck(false, historyLog.reference)} className="w-full bg-primary hover:bg-primary/90 text-white" disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Use Previous Record
            </Button>
            <Button onClick={() => runCheck(true)} variant="outline" className="w-full" disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Run Entirely New Check
            </Button>
            <Button onClick={onClose} variant="ghost" className="w-full text-gray-500" disabled={isPending}>Cancel</Button>
          </div>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">New CreditRegistry Check</h3>
            <p className="text-xs text-gray-500 mt-0.5">Enter the customer&apos;s BVN to search the bureau.</p>
          </div>
          <button onClick={onClose} disabled={isPending} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form id="cr-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">BVN <span className="text-red-500">*</span></label>
            <Input type="text" required maxLength={11} placeholder="11-digit BVN"
              value={bvn} onChange={e => setBvn(e.target.value.replace(/\D/g, ""))} className="text-sm font-mono" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input type="checkbox" id="runBothCR" checked={runBoth} onChange={e => setRunBoth(e.target.checked)} 
              className="rounded border-gray-300 text-primary focus:ring-primary/30 w-4 h-4 cursor-pointer" />
            <label htmlFor="runBothCR" className="text-xs text-gray-600 cursor-pointer">
              Also run a FirstCentral check simultaneously
            </label>
          </div>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
            </div>
          )}
        </form>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button type="submit" form="cr-form" disabled={isPending} className="min-w-[110px] bg-primary hover:bg-primary/90">
            {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching…</> : "Run Check"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function CreditRegistryDashboard() {
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
    const res = await getCreditBureauLogs({ bureau: "creditregistry", search: q || undefined, page: pg, limit });
    setLogs(res.data); setTotal(res.total); setPage(pg); setLoading(false);
  }, [search]);

  useEffect(() => { fetchLogs(1); }, []); // eslint-disable-line

  const handleSearch = (v: string) => {
    setSearch(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => startT(() => { fetchLogs(1, v); }), 400);
  };

  const handleNew = (log: CreditBureauLog) => { setShowModal(false); setLogs(p => [log, ...p.filter(l => l.id !== log.id)]); setTotal(t => logs.some(l => l.id === log.id) ? t : t + 1); };
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="w-full max-w-6xl mx-auto pb-12 space-y-6">
      <Link href="/dashboard/account-services"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />Extended Services
      </Link>

      {/* Hero */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-2xl px-8 py-6 flex items-center justify-between gap-4 shadow-lg">
        <div>
          <h2 className="text-2xl font-bold">CreditRegistry CRB</h2>
          <p className="text-sm text-white/70 mt-1">Run a CreditRegistry Credit Bureau check using a customer&apos;s BVN.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => fetchLogs(page)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-primary rounded-lg text-sm font-semibold shadow-sm hover:bg-primary/5 transition-colors">
            <Plus className="w-4 h-4" />New Check
          </button>
        </div>
      </div>


      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by reference, BVN or name…"
              value={search} onChange={e => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
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
                {["Reference","BVN","Subject","Status","Checked By","Date","Document"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading…
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400">
                  <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="font-medium">{search ? "No results" : "No checks yet"}</p>
                  {!search && <button onClick={() => setShowModal(true)} className="mt-1 text-primary text-sm hover:underline">Run your first check →</button>}
                </td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">
                    <div className="flex items-center gap-2">
                      <CopyButton text={log.reference} />
                      {log.reference}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{log.bvn}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.subjectName || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{log.verifiedBy}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(log.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setViewing(log)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors">
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

      {showModal && <NewCheckModal onClose={() => setShowModal(false)} onSuccess={handleNew} onView={(log) => { setShowModal(false); setViewing(log); }} />}
      {viewing   && <ViewerModal log={viewing} apiBase={apiBase} token={token} onClose={() => setViewing(null)} />}
    </div>
  );
}
