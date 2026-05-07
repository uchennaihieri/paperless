"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Search, X, Plus, Loader2, CheckCircle, XCircle, AlertCircle,
  RefreshCw, ArrowLeft, FileText, Download, Copy, Check,
} from "lucide-react";
import { getIdentityLogs, runBvnCheck, runNinCheck, type IdentityLog } from "@/app/actions/identity";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ── Field definitions ──────────────────────────────────────────────────────────

export interface FieldDef {
  id: string; label: string; type?: "text"|"date"|"select"|"tel";
  required?: boolean; options?: string[]; placeholder?: string;
}

export const NIN_FIELDS: FieldDef[] = [
  { id: "idNumber",  label: "NIN (11 digits)", required: true, placeholder: "e.g. 12345678901" },
  { id: "firstname", label: "First Name",       required: true },
  { id: "lastname",  label: "Last Name",        required: true },
];

export const BVN_FIELDS: FieldDef[] = [
  { id: "idNumber",  label: "BVN (11 digits)", required: true, placeholder: "e.g. 12345678901" },
  { id: "firstname", label: "First Name",       required: true },
  { id: "lastname",  label: "Last Name",        required: true },
];

// ── Types ──────────────────────────────────────────────────────────────────────

export type CheckType = "nin"|"bvn"|"firstcentral"|"creditregistry";

export interface CheckPageConfig {
  checkType: CheckType; title: string; description: string;
  color: string; fields?: FieldDef[]; comingSoon?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_CFG: Record<string, { icon: any; color: string; bg: string }> = {
  Verified: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  Partial:  { icon: AlertCircle, color: "text-amber-600",   bg: "bg-amber-50 border-amber-200"    },
  Failed:   { icon: XCircle,     color: "text-red-600",     bg: "bg-red-50 border-red-200"        },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.Partial;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${c.bg} ${c.color}`}>
      <Icon className="w-3 h-3" />{status}
    </span>
  );
}

// ── Viewer Modal ───────────────────────────────────────────────────────────────

function ViewerModal({ log, onClose, apiBase, token }: {
  log: IdentityLog; onClose: () => void; apiBase: string; token: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState("");
  const data    = log.responseData ?? {};
  const idKey   = log.idType.toLowerCase();
  const idData: Record<string, any> = data[idKey] ?? data.bvn ?? data.nin ?? {};
  const summary = data.summary ?? {};
  const photoB64: string | undefined = idData.photo ?? idData.image;
  const skipKeys = new Set(["photo", "image", "signature"]);
  const statusColour = log.status === "Verified" ? "#059669" : log.status === "Partial" ? "#d97706" : "#dc2626";
  const statusBg     = log.status === "Verified" ? "#ecfdf5" : log.status === "Partial" ? "#fffbeb" : "#fef2f2";

  const download = async () => {
    setDownloading(true);
    setDlError("");
    try {
      const res = await fetch(`${apiBase}/identity/pdf/${log.reference}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 202) { setDlError("PDF is still generating — try again in a few seconds."); return; }
      if (!res.ok) { setDlError("PDF not available yet."); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `${log.reference}-Verification.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { setDlError("Download failed."); }
    finally { setDownloading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
          <div>
            <span className="font-mono text-xs font-bold text-primary">{log.reference}</span>
            <h3 className="font-bold text-gray-900 text-lg mt-0.5">{log.idType.toUpperCase()} Verification Report</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={download}
              disabled={downloading || !log.pdfPath}
              title={!log.pdfPath ? "PDF still generating…" : "Download PDF"}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {log.pdfPath ? "Download PDF" : "Generating…"}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {dlError && <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">{dlError}</div>}

          {/* Photo */}
          <div className="flex justify-center">
            {photoB64 ? (
              <img
                src={photoB64.startsWith("data:") ? photoB64 : `data:image/jpeg;base64,${photoB64}`}
                alt="Subject"
                className="w-28 h-32 object-cover rounded-xl border-2 border-gray-200 shadow-md"
              />
            ) : (
              <div className="w-28 h-32 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400 italic">
                No photo
              </div>
            )}
          </div>

          {/* Status + meta */}
          <div
            className="rounded-xl border p-4 flex items-center gap-4"
            style={{ background: statusBg, borderColor: statusColour + "44" }}
          >
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {[
                ["Reference",   log.reference],
                ["Subject",     log.subjectName],
                [`${log.idType.toUpperCase()} Number`, log.idNumber],
                ["Status",      log.status],
                ["Checked By",  log.verifiedBy],
                ["Date",        fmtDate(log.createdAt)],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{l}</p>
                  {l === "Status"
                    ? <StatusBadge status={v} />
                    : <p className="font-medium text-gray-800 text-xs mt-0.5" style={{ fontFamily: l === "Reference" || l.includes("Number") ? "monospace" : undefined }}>{v}</p>
                  }
                </div>
              ))}
            </div>
          </div>

          {/* Registry bio-data */}
          {Object.keys(idData).filter(k => !skipKeys.has(k.toLowerCase())).length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Registry Data</p>
              <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
                {Object.entries(idData)
                  .filter(([k]) => !skipKeys.has(k.toLowerCase()))
                  .map(([k, v]) => (
                    <div key={k} className="flex px-4 py-2.5 text-sm gap-4">
                      <span className="w-2/5 font-medium text-gray-500 capitalize">{k.replace(/_/g, " ")}</span>
                      <span className="flex-1 text-gray-800 break-words">{String(v ?? "—")}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Field matches */}
          {Object.keys(summary).length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Field Matches</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary).flatMap(([, svcVal]: [string, any]) =>
                  Object.entries((svcVal as any)?.fieldMatches ?? {}).map(([field, matched]) => (
                    <span key={field}
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border ${
                        matched ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {matched ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}{field}
                    </span>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── New Check Modal ────────────────────────────────────────────────────────────

function NewCheckModal({ checkType, fields, onClose, onSuccess }: {
  checkType: CheckType; fields: FieldDef[];
  onClose: () => void; onSuccess: (log: IdentityLog) => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [isPending, startT] = useTransition();
  const [error, setError] = useState("");
  const set = (id: string, v: string) => setForm(p => ({ ...p, [id]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    startT(async () => {
      let res: any;
      if (checkType === "nin") {
        res = await runNinCheck({ idNumber: form.idNumber, firstname: form.firstname, lastname: form.lastname });
      } else {
        res = await runBvnCheck({ idNumber: form.idNumber, firstname: form.firstname, lastname: form.lastname });
      }
      if (!res.success && !res.data) { setError(res.error || "Verification failed."); return; }
      onSuccess({
        id: res.reference ?? Date.now().toString(),
        reference: res.reference ?? "—",
        idType: checkType, idNumber: form.idNumber,
        subjectName: `${form.firstname} ${form.lastname}`,
        status: res.status ?? "Verified", pdfPath: null,
        verifiedBy: "You", createdAt: new Date().toISOString(),
        requestData: form, responseData: res.data ?? {},
      });
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">New {checkType.toUpperCase()} Check</h3>
            <p className="text-xs text-gray-500 mt-0.5">Fill all required fields to run the verification.</p>
          </div>
          <button onClick={onClose} disabled={isPending} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form id="check-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {fields.filter(f => f.required).map(f => (
            <div key={f.id}>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {f.label} <span className="text-red-500">*</span>
              </label>
              <Input type={f.type ?? "text"} required placeholder={f.placeholder}
                value={form[f.id] ?? ""} onChange={e => set(f.id, e.target.value)} className="text-sm" />
            </div>
          ))}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
            </div>
          )}
        </form>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button type="submit" form="check-form" disabled={isPending} className="min-w-[110px]">
            {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking…</> : "Run Check"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Copy Button ────────────────────────────────────────────────────────────────

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

// ── Table Row ──────────────────────────────────────────────────────────────────

function LogRow({ log, onView }: { log: IdentityLog; onView: (log: IdentityLog) => void }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">
        <div className="flex items-center gap-2">
          <CopyButton text={log.reference} />
          {log.reference}
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.subjectName || "—"}</td>
      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{log.idNumber}</td>
      <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
      <td className="px-4 py-3 text-xs text-gray-500">{log.verifiedBy}</td>
      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(log.createdAt)}</td>
      <td className="px-4 py-3">
        <button
          onClick={() => onView(log)}
          title="View Report"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />Document
        </button>
      </td>
    </tr>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function IdentityCheckDashboard({ config }: { config: CheckPageConfig }) {
  const { data: session } = useSession();
  const [logs, setLogs]         = useState<IdentityLog[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewing, setViewing]   = useState<IdentityLog | null>(null);
  const [, startT]              = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limit = 20;

  const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/api\/v1\/?$/, "") + "/api/v1";
  const token   = (session?.user as any)?.backendToken ?? "";

  const fetchLogs = useCallback(async (pg = 1, q = search) => {
    setLoading(true);
    const res = await getIdentityLogs({ type: config.checkType, search: q || undefined, page: pg, limit });
    setLogs(res.data); setTotal(res.total); setPage(pg); setLoading(false);
  }, [config.checkType, search]);

  useEffect(() => { fetchLogs(1); }, []); // eslint-disable-line

  const handleSearch = (v: string) => {
    setSearch(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => startT(() => { fetchLogs(1, v); }), 400);
  };

  const handleNewCheck = (log: IdentityLog) => { setShowModal(false); setLogs(p => [log, ...p]); setTotal(t => t + 1); };

  const totalPages = Math.ceil(total / limit);
  const headerGradient: Record<string, string> = {
    indigo: "from-indigo-600 to-indigo-800", emerald: "from-emerald-600 to-emerald-800",
    sky:    "from-sky-600 to-sky-800",        purple:  "from-purple-600 to-purple-800",
  };
  const grad = headerGradient[config.color] ?? headerGradient.indigo;

  return (
    <div className="w-full max-w-6xl mx-auto pb-12 space-y-6">
      <Link href="/dashboard/account-services"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />Extended Services
      </Link>

      {/* Hero */}
      <div className={`bg-gradient-to-r ${grad} text-white rounded-2xl px-8 py-6 flex items-center justify-between gap-4 shadow-lg`}>
        <div>
          <h2 className="text-2xl font-bold">{config.title}</h2>
          <p className="text-sm text-white/70 mt-1">{config.description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => fetchLogs(page)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh
          </button>
          {!config.comingSoon && (
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-semibold shadow-sm hover:bg-gray-50 transition-colors">
              <Plus className="w-4 h-4" />New Check
            </button>
          )}
        </div>
      </div>

      {config.comingSoon ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-5">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Coming Soon</h3>
          <p className="text-sm text-gray-500 max-w-sm">This service will be integrated shortly.</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Checks",        value: total,                                             color: "text-gray-900"   },
              { label: "Verified",             value: logs.filter(l => l.status === "Verified").length,  color: "text-emerald-600" },
              { label: "Failed / Partial",     value: logs.filter(l => l.status !== "Verified").length,  color: "text-red-500"    },
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
                <input type="text" placeholder="Search by name, reference or ID…"
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
                    {["Reference","Subject","ID Number","Status","Checked By","Date","Document"].map(h => (
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
                      <p className="font-medium">{search ? "No results found" : "No checks yet"}</p>
                      {!search && <button onClick={() => setShowModal(true)} className="mt-1 text-primary text-sm hover:underline">Run your first check →</button>}
                    </td></tr>
                  ) : logs.map(log => (
                    <LogRow key={log.id} log={log} onView={setViewing} />
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
        </>
      )}

      {showModal && config.fields && (
        <NewCheckModal checkType={config.checkType} fields={config.fields}
          onClose={() => setShowModal(false)} onSuccess={handleNewCheck} />
      )}

      {viewing && (
        <ViewerModal log={viewing} apiBase={apiBase} token={token}
          onClose={() => setViewing(null)} />
      )}
    </div>
  );
}
