"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart2, Plus, Trash2, Pencil, Play, Download, X, ChevronDown,
  AlertCircle, FileSpreadsheet, Loader2, Users, ShieldAlert, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  getMyReports, getAllReports, getReport, createReport, updateReport,
  deleteReport, spoolReport, getBranches,
  type MyReport, type AdminReport, type Branch,
} from "@/app/actions/reports";


// ── Helpers ───────────────────────────────────────────────────────────────────

function formatColHeader(col: string) {
  return col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function downloadCsv(data: Record<string, any>[], filename: string) {
  if (!data.length) return;
  const cols = Object.keys(data[0]);
  const rows = [cols.join(","), ...data.map((r) => cols.map((c) => `"${r[c] ?? ""}"`).join(","))];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Spool Results Table ───────────────────────────────────────────────────────

function SpoolTable({ data }: { data: Record<string, any>[] }) {
  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
        <FileSpreadsheet className="w-10 h-10" />
        <p className="text-sm font-medium">No data returned for the selected period.</p>
      </div>
    );
  }
  const cols = Object.keys(data[0]);
  return (
    <div className="overflow-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-900 text-white">
            <th className="px-4 py-3 text-left font-semibold text-xs w-10 text-gray-400">#</th>
            {cols.map((col) => (
              <th key={col} className="px-4 py-3 text-left font-semibold text-xs whitespace-nowrap">
                {formatColHeader(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}>
              <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
              {cols.map((col) => (
                <td key={col} className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                  {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-gray-300">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 border-t border-gray-200">
            <td className="px-4 py-2 text-xs text-gray-400" colSpan={cols.length + 1}>
              {data.length} row{data.length !== 1 ? "s" : ""} returned
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Spool Modal ───────────────────────────────────────────────────────────────

function SpoolModal({
  report, branches, onClose,
}: {
  report: MyReport;
  branches: Branch[];
  onClose: () => void;
}) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [branch, setBranch] = useState("ALL");
  const [isPending, startSpool] = useTransition();
  const [results, setResults] = useState<Record<string, any>[] | null>(null);
  const [error, setError] = useState("");

  const branchOptions = [{ id: "ALL", name: "All Branches" }, ...branches];

  const handleRun = () => {
    setError("");
    if (!fromDate || !toDate) { setError("Please select both dates."); return; }
    if (new Date(toDate) < new Date(fromDate)) { setError("End date must be on or after start date."); return; }
    startSpool(async () => {
      const res = await spoolReport(report.id, { from_date: fromDate, to_date: toDate, branch });
      if (res.success) {
        setResults(res.data || []);
      } else {
        setError(res.error || "Report failed to run.");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{report.name}</h2>
            <p className="text-sm text-gray-400">{report.description}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <Label htmlFor="from-date" className="text-xs">From Date</Label>
            <Input id="from-date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40 h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to-date" className="text-xs">To Date</Label>
            <Input id="to-date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40 h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="branch-select" className="text-xs">Branch</Label>
            <div className="relative">
              <select
                id="branch-select"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="h-9 pl-3 pr-8 text-sm border border-gray-200 rounded-md bg-white appearance-none w-44 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {branchOptions.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <Button id="run-report-btn" onClick={handleRun} disabled={isPending} className="h-9">
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            {isPending ? "Running…" : "Run Report"}
          </Button>
          {results && results.length > 0 && (
            <Button variant="outline" className="h-9" onClick={() => downloadCsv(results, `${report.name}.csv`)}>
              <Download className="w-4 h-4 mr-2" /> Download CSV
            </Button>
          )}
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-auto p-6">
          {results === null ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
              <FileSpreadsheet className="w-14 h-14" />
              <p className="text-sm">Set the filters above and click <strong>Run Report</strong> to load data.</p>
            </div>
          ) : (
            <SpoolTable data={results} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create / Edit Modal (Admin) ───────────────────────────────────────────────

function ReportFormModal({
  existing, onClose, onSaved,
}: {
  existing: AdminReport | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [script, setScript] = useState(existing?.script ?? "");
  const [emails, setEmails] = useState<string>(existing?.access.map((a) => a.userEmail).join("\n") ?? "");
  const [isPending, start] = useTransition();
  const [error, setError] = useState("");

  const handleSave = () => {
    setError("");
    if (!name.trim() || !description.trim() || !script.trim()) {
      setError("Name, description, and script are required.");
      return;
    }
    const granted_emails = emails.split(/[\n,]+/).map((e) => e.trim()).filter(Boolean);
    start(async () => {
      const res = existing
        ? await updateReport(existing.id, { name, description, script, granted_emails })
        : await createReport({ name, description, script, granted_emails });
      if (res.success) {
        onSaved();
      } else {
        setError(res.error || "Failed to save report.");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{existing ? "Edit Report" : "Create Report"}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="report-name">Name</Label>
            <Input id="report-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Monthly Sales Report" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-description">Description</Label>
            <Input id="report-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this report show?" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-script">SQL Script</Label>
            <p className="text-xs text-gray-400">Use <code className="bg-gray-100 px-1 rounded">:from_date</code>, <code className="bg-gray-100 px-1 rounded">:to_date</code>, <code className="bg-gray-100 px-1 rounded">:branch</code> as placeholders.</p>
            <textarea
              id="report-script"
              rows={10}
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="w-full font-mono text-xs border border-gray-200 rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={`SELECT branch, COUNT(*) AS total\nFROM deposit_accounts\nWHERE created_at BETWEEN :from_date AND :to_date\n  AND (:branch = 'ALL' OR branch = :branch)\nGROUP BY branch`}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-emails" className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Granted Emails</Label>
            <p className="text-xs text-gray-400">One email per line (or comma-separated). Leave empty for admins-only access.</p>
            <textarea
              id="report-emails"
              rows={4}
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="alice@example.com&#10;bob@example.com"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button id="save-report-btn" onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isPending ? "Saving…" : existing ? "Save Changes" : "Create Report"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { data: session } = useSession();
  const roles = (session?.user as any)?.roles ? JSON.parse((session?.user as any).roles) : [];
  const activeId = (session?.user as any)?.activeRoleId;
  const activeRole = roles.find((r: any) => r.id === activeId) || roles[0];
  const isAdmin = activeRole?.user_role?.toLowerCase() === "administrator" || activeRole?.specialAccess?.toLowerCase().includes("administrator");

  const [reports, setReports] = useState<MyReport[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const [spoolTarget, setSpoolTarget] = useState<MyReport | null>(null);
  const [editing, setEditing] = useState<AdminReport | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminReport | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState("");

  const load = async () => {
    setLoading(true);
    const [r, b] = await Promise.all([
      isAdmin ? getAllReports() : getMyReports(),
      getBranches(),
    ]);
    setReports(r as MyReport[]);
    setBranches(b);
    setLoading(false);
  };

  useEffect(() => { load(); }, [isAdmin]);

  const handleDelete = (report: MyReport) => {
    setDeleteError("");
    startDelete(async () => {
      const res = await deleteReport(report.id);
      if (res.success) {
        setDeleteTarget(null);
        load();
      } else {
        setDeleteError(res.error || "Failed to delete report.");
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {isAdmin ? "Manage and spool reports across the organisation." : "Run the reports you have been granted access to."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {isAdmin && (
            <Button id="create-report-btn" size="sm" onClick={() => setEditing("new")}>
              <Plus className="w-4 h-4 mr-2" /> Create Report
            </Button>
          )}
        </div>
      </div>

      {/* Reports Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <BarChart2 className="w-12 h-12 text-gray-200" />
            <p className="font-medium">No reports available</p>
            {isAdmin ? (
              <p className="text-sm text-gray-400">Create your first report to get started.</p>
            ) : (
              <div className="text-center">
                <ShieldAlert className="w-6 h-6 mx-auto text-amber-400 mb-2" />
                <p className="text-sm">You don't have access to any reports yet. Contact your administrator.</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => {
            const adminReport = report as AdminReport;
            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2 rounded-lg bg-primary/5 shrink-0">
                      <FileSpreadsheet className="w-5 h-5 text-primary" />
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button
                          id={`edit-report-${report.id}`}
                          onClick={async () => {
                            const full = await getReport(report.id);
                            if (full) setEditing(full);
                          }}
                          className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          id={`delete-report-${report.id}`}
                          onClick={() => setDeleteTarget(adminReport)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-base mt-3 leading-snug">{report.name}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2">{report.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 mt-auto">
                  {isAdmin && adminReport.access?.length > 0 && (
                    <p className="text-xs text-gray-400 mb-3">
                      <Users className="w-3.5 h-3.5 inline mr-1" />
                      {adminReport.access.length} user{adminReport.access.length !== 1 ? "s" : ""} granted
                    </p>
                  )}
                  <Button
                    id={`spool-report-${report.id}`}
                    className="w-full h-9"
                    size="sm"
                    onClick={() => setSpoolTarget(report)}
                  >
                    <Play className="w-4 h-4 mr-2" /> Run Report
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Spool Modal */}
      {spoolTarget && (
        <SpoolModal
          report={spoolTarget}
          branches={branches}
          onClose={() => setSpoolTarget(null)}
        />
      )}

      {/* Create/Edit Modal */}
      {editing !== null && (
        <ReportFormModal
          existing={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white shadow-2xl">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Delete Report
              </CardTitle>
              <CardDescription>
                Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong>?
                This will also remove all access records for this report.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {deleteError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {deleteError}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
                <Button
                  id="confirm-delete-report-btn"
                  variant="destructive"
                  onClick={() => handleDelete(deleteTarget)}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  {isDeleting ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
