"use client";

import { useState, useEffect, useTransition } from "react";
import { useSession } from "next-auth/react";
import { QRCodeSVG } from "qrcode.react";
import {
  Smartphone, CheckCircle, AlertCircle, Loader2, Settings,
  RefreshCw, History, ChevronDown, ExternalLink, X, Plus, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getLatestAppVersion, publishAppVersion, getAppVersionHistory,
  type AppVersion
} from "@/app/actions/app-version";

// The public (no-auth) streaming download endpoint served by the backend
const PUBLIC_DOWNLOAD_URL =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000") + "/app/download";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-NG", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Publish Modal (Admin) ─────────────────────────────────────────────────────

function PublishModal({ onClose, onPublished }: { onClose: () => void; onPublished: () => void }) {
  const [version, setVersion] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [isPending, start] = useTransition();
  const [error, setError] = useState("");

  const handlePublish = () => {
    setError("");
    if (!version.trim()) { setError("Version number is required."); return; }
    start(async () => {
      // downloadUrl stored in DB is the internal SharePoint drive path.
      // Users always download via the public streaming endpoint.
      const res = await publishAppVersion({
        version: version.trim(),
        downloadUrl: PUBLIC_DOWNLOAD_URL, // always the streaming endpoint
        releaseNotes: releaseNotes.trim() || undefined,
      });
      if (res.success) {
        onPublished();
      } else {
        setError(res.error || "Failed to publish version.");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> Publish New App Version
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pub-version">Version Number <span className="text-red-500">*</span></Label>
            <Input
              id="pub-version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="e.g. 1.2.3"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pub-notes">Release Notes (optional)</Label>
            <textarea
              id="pub-notes"
              rows={3}
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="What's new in this version?"
            />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            <strong>Note:</strong> Users will download the APK by scanning the QR code on this page.
            Make sure the APK file has been uploaded to the <code className="bg-blue-100 px-1 rounded">mobileapp/</code> folder on SharePoint before publishing.
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button id="publish-version-btn" onClick={handlePublish} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            {isPending ? "Publishing…" : "Publish Version"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── History Panel ─────────────────────────────────────────────────────────────

function HistoryPanel({ versions }: { versions: AppVersion[] }) {
  const [open, setOpen] = useState(false);
  if (versions.length <= 1) return null;
  const past = versions.slice(1);

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <History className="w-4 h-4" />
        {open ? "Hide" : "Show"} version history ({past.length} past {past.length === 1 ? "version" : "versions"})
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden">
          {past.map((v) => (
            <div key={v.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 border-b border-gray-50 last:border-0">
              <div>
                <span className="font-mono text-sm font-semibold text-gray-800">v{v.version}</span>
                <span className="ml-3 text-xs text-gray-400">{formatDate(v.publishedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AppDownloadPage() {
  const { data: session } = useSession();
  const roles = (session?.user as any)?.roles ? JSON.parse((session?.user as any).roles) : [];
  const activeId = (session?.user as any)?.activeRoleId;
  const activeRole = roles.find((r: any) => r.id === activeId) || roles[0];
  const isAdmin =
    activeRole?.user_role?.toLowerCase() === "administrator" ||
    activeRole?.specialAccess?.toLowerCase().includes("administrator");

  const [latest, setLatest] = useState<AppVersion | null>(null);
  const [history, setHistory] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPublish, setShowPublish] = useState(false);

  const load = async () => {
    setLoading(true);
    const [v, h] = await Promise.all([
      getLatestAppVersion(),
      isAdmin ? getAppVersionHistory() : Promise.resolve([]),
    ]);
    setLatest(v);
    setHistory(h);
    setLoading(false);
  };

  useEffect(() => { load(); }, [isAdmin]);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">FINCALite Mobile App</h2>
          <p className="text-gray-500 text-sm mt-1">Scan the QR code below to download the latest version.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {isAdmin && (
            <Button id="publish-app-btn" size="sm" onClick={() => setShowPublish(true)}>
              <Settings className="w-4 h-4 mr-2" /> Update Version
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : !latest ? (
        /* ── No version yet ── */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-800">No app version published yet</p>
            <p className="text-sm text-gray-400 mt-1">
              {isAdmin
                ? <><strong>Update Version</strong> to publish the first APK.</>
                : "The mobile app download is not available yet. Contact your administrator."}
            </p>
          </div>
        </div>
      ) : (
        /* ── Version Card ── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Left: Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-primary via-red-400 to-rose-500" />
              <div className="p-6">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center shrink-0">
                    <Smartphone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-primary uppercase tracking-widest mb-0.5">FINCALite Mobile</div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-bold text-gray-900 font-mono">v{latest.version}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Latest
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Published</p>
                    <p className="text-xs font-medium text-gray-800 leading-snug">{formatDate(latest.publishedAt)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Platform</p>
                    <p className="text-xs font-medium text-gray-800">Android (APK)</p>
                  </div>
                </div>

                {latest.releaseNotes && (
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> What&apos;s New
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{latest.releaseNotes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Installation Steps */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <p className="text-sm font-bold text-amber-900 mb-3">📱 How to Install</p>
              <ol className="space-y-2 text-sm text-amber-800">
                <li className="flex gap-2"><span className="font-bold shrink-0">1.</span> Open your phone&apos;s camera and point it at the QR code.</li>
                <li className="flex gap-2"><span className="font-bold shrink-0">2.</span> Tap the notification to open the download link.</li>
                <li className="flex gap-2"><span className="font-bold shrink-0">3.</span> On your Android device, go to <strong>Settings → Security</strong> and enable <strong>Install from unknown sources</strong>.</li>
                <li className="flex gap-2"><span className="font-bold shrink-0">4.</span> Open the downloaded APK and tap <strong>Install</strong>.</li>
                <li className="flex gap-2"><span className="font-bold shrink-0">5.</span> Launch <strong>FINCALite</strong> and sign in with your work credentials.</li>
              </ol>
            </div>

            {/* Admin history */}
            {isAdmin && <HistoryPanel versions={history} />}
          </div>

          {/* Right: QR Code — the ONLY download entry point */}
          <div className="flex flex-col items-center">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 w-full flex flex-col items-center gap-4 sticky top-24">
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">Scan to download</p>
                <p className="text-xs text-gray-400 mt-0.5">Point your phone camera at the QR code below</p>
              </div>

              {/* QR Code — always points to the public streaming endpoint */}
              <div className="flex items-center justify-center bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-inner">
                <QRCodeSVG
                  value={PUBLIC_DOWNLOAD_URL}
                  size={210}
                  fgColor="#B50938"
                  bgColor="#ffffff"
                  level="H"
                  includeMargin
                />
              </div>

              <p className="text-xs text-gray-400 text-center">
                FINCALite v{latest.version} &bull; Android APK
              </p>

              {/* Subtle endpoint label — no clickable link for end users */}
              <div className="w-full bg-gray-50 rounded-xl px-4 py-3 text-center">
                <p className="text-[11px] text-gray-400 font-mono">/app/download</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {showPublish && (
        <PublishModal
          onClose={() => setShowPublish(false)}
          onPublished={() => { setShowPublish(false); load(); }}
        />
      )}
    </div>
  );
}
