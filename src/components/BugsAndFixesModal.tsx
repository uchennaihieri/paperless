"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  X, Bug, Search, Plus, ChevronLeft, ChevronRight, Loader2,
  ThumbsUp, MessageCircle, Paperclip, Send, CheckCircle2,
  Sparkles, Eye, Upload, ToggleLeft, ToggleRight,
  FileText, Image as ImageIcon, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  getBugs, getBugDetail, createBug, toggleUpvote, addComment, fixBug,
  type BugReport, type BugMeta, type BugComment as BugCommentType,
} from "@/app/actions/bugs";

// ── Types ─────────────────────────────────────────────────────────────────────

type View = "feed" | "detail" | "create";
type StatusFilter = "All" | "Open" | "Fixed";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BugsAndFixesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { data: session } = useSession();
  const roles = session?.user && (session.user as any).roles ? JSON.parse((session.user as any).roles) : [];
  const activeRoleId = session?.user && (session.user as any).activeRoleId;
  const activeRole = roles.find((r: any) => r.id === activeRoleId) || roles[0];

  const userEmail = activeRole?.finca_email || "";
  const userName = activeRole?.user_name || session?.user?.name || "User";
  const userId = activeRole?.id;
  const userRoleStr = activeRole?.user_role || "";
  const specialAccess = activeRole?.specialAccess || "";
  const isAdminUser = userRoleStr.toLowerCase() === "administrator" || specialAccess.toLowerCase().includes("administrator");

  // ── State ─────────────────────────────────────────────────────────────────

  const [view, setView] = useState<View>("feed");
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [meta, setMeta] = useState<BugMeta>({ total: 0, page: 1, limit: 20, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [page, setPage] = useState(1);

  // Detail view
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [fixCommentText, setFixCommentText] = useState("");
  const [showFixForm, setShowFixForm] = useState(false);
  const [fixing, setFixing] = useState(false);

  // Create view
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<"bug" | "feature">("bug");
  const [newAnonymous, setNewAnonymous] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchBugs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getBugs({
        search: search || undefined,
        status: statusFilter === "All" ? undefined : statusFilter,
        page,
        limit: 20,
      });
      setBugs(result.data);
      setMeta(result.meta);
    } catch { /* handled by apiClient */ }
    setLoading(false);
  }, [search, statusFilter, page]);

  useEffect(() => {
    if (isOpen) fetchBugs();
  }, [isOpen, fetchBugs]);

  // Debounced search
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
    }, 400);
  };

  // ── Detail view ───────────────────────────────────────────────────────────

  const openDetail = async (bug: BugReport) => {
    setView("detail");
    setLoadingDetail(true);
    setShowFixForm(false);
    setFixCommentText("");
    setCommentText("");
    try {
      const detail = await getBugDetail(bug.id);
      setSelectedBug(detail);
    } catch {
      setSelectedBug(bug);
    }
    setLoadingDetail(false);
  };

  const handleUpvote = async () => {
    if (!selectedBug || !userEmail) return;
    const result = await toggleUpvote(selectedBug.id, userEmail);
    if (result) {
      setSelectedBug((prev) => prev ? {
        ...prev,
        _count: { ...prev._count, upvotes: result.count },
        upvotes: result.upvoted
          ? [...(prev.upvotes || []), { userEmail }]
          : (prev.upvotes || []).filter((u) => u.userEmail !== userEmail),
      } : prev);
    }
  };

  const handleComment = async () => {
    if (!selectedBug || !commentText.trim()) return;
    setSendingComment(true);
    const comment = await addComment(selectedBug.id, userName, userEmail, commentText.trim());
    if (comment) {
      setSelectedBug((prev) => prev ? {
        ...prev,
        comments: [...(prev.comments || []), comment],
        _count: { ...prev._count, comments: prev._count.comments + 1 },
      } : prev);
      setCommentText("");
    }
    setSendingComment(false);
  };

  const handleFix = async () => {
    if (!selectedBug) return;
    setFixing(true);
    const result = await fixBug(selectedBug.id, fixCommentText, userEmail, userName, userRoleStr, specialAccess);
    if (result) {
      setSelectedBug((prev) => prev ? {
        ...prev,
        status: "Fixed",
        fixComment: fixCommentText,
        fixedByEmail: userEmail,
        fixedAt: new Date().toISOString(),
      } : prev);
      setShowFixForm(false);
      // Refresh feed in background
      fetchBugs();
    }
    setFixing(false);
  };

  // ── Create view ───────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!newTitle.trim() || !newDescription.trim() || !userId) return;
    setCreating(true);

    const formData = new FormData();
    formData.append("title", newTitle.trim());
    formData.append("description", newDescription.trim());
    formData.append("type", newType);
    formData.append("isAnonymous", String(newAnonymous));
    formData.append("postedById", String(userId));
    formData.append("postedByName", userName);
    formData.append("postedByEmail", userEmail);

    for (const file of newFiles) {
      formData.append("files", file);
    }

    const result = await createBug(formData);
    if (result) {
      // Reset form
      setNewTitle("");
      setNewDescription("");
      setNewType("bug");
      setNewAnonymous(false);
      setNewFiles([]);
      // Go back to feed and refresh
      setView("feed");
      setPage(1);
      fetchBugs();
    }
    setCreating(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    setNewFiles((prev) => [...prev, ...dropped].slice(0, 5));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setNewFiles((prev) => [...prev, ...selected].slice(0, 5));
    }
  };

  const removeFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Reset on close ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) {
      setView("feed");
      setSelectedBug(null);
      setSearch("");
      setStatusFilter("All");
      setPage(1);
    }
  }, [isOpen]);

  // ── Keyboard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view !== "feed") { setView("feed"); fetchBugs(); }
        else onClose();
      }
    };
    if (isOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, view, onClose, fetchBugs]);

  if (!isOpen) return null;

  const hasUpvoted = selectedBug?.upvotes?.some((u) => u.userEmail === userEmail) ?? false;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            {view !== "feed" && (
              <button
                onClick={() => { setView("feed"); fetchBugs(); }}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div className="p-2 rounded-lg bg-[#b50938]/10">
              <Bug className="w-5 h-5 text-[#b50938]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {view === "create" ? "Report an Issue" : view === "detail" && selectedBug ? `#${selectedBug.id} — ${selectedBug.title}` : "Bugs and Fixes"}
              </h2>
              <p className="text-xs text-gray-400">
                {view === "create"
                  ? "Describe the issue or feature request"
                  : view === "detail"
                    ? selectedBug?.status === "Fixed" ? "Resolved" : "Open"
                    : `Submit a bug report, request new features or view recent fixes`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {view === "feed" && (
              <button
                onClick={() => setView("create")}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
                style={{ backgroundColor: "#b50938" }}
              >
                <Plus className="w-4 h-4" /> Report Issue
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* ── Feed View ────────────────────────────────────────────────── */}
        {view === "feed" && (
          <>
            {/* Search & filters */}
            <div className="px-6 py-3 border-b border-gray-100 shrink-0 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search bugs and feature requests..."
                    className="pl-9 h-9 text-sm"
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                </div>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                  {(["All", "Open", "Fixed"] as StatusFilter[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => { setStatusFilter(s); setPage(1); }}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                        statusFilter === s
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bug list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-[#b50938]" />
                  <p className="text-sm">Loading feed…</p>
                </div>
              ) : bugs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-3">
                  <Bug className="w-10 h-10 text-gray-300" />
                  <p className="text-sm font-medium">No reports found</p>
                  <p className="text-xs text-gray-400">Be the first to report an issue or request a feature</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {bugs.map((bug) => (
                    <button
                      key={bug.id}
                      onClick={() => openDetail(bug)}
                      className={cn(
                        "w-full text-left px-6 py-4 hover:bg-gray-50/80 transition-colors flex items-start gap-4 group",
                        bug.status === "Fixed" && "opacity-60"
                      )}
                    >
                      {/* Queue number */}
                      <div className={cn(
                        "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                        bug.status === "Fixed"
                          ? "bg-green-50 text-green-600"
                          : "bg-gray-100 text-gray-600"
                      )}>
                        #{bug.id}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                            bug.type === "feature"
                              ? "bg-purple-50 text-purple-600"
                              : "bg-red-50 text-red-600"
                          )}>
                            {bug.type === "feature" ? <><Sparkles className="w-3 h-3" /> Feature</> : <><Bug className="w-3 h-3" /> Bug</>}
                          </span>
                          {bug.status === "Fixed" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-600 uppercase tracking-wider">
                              <CheckCircle2 className="w-3 h-3" /> Fixed
                            </span>
                          )}
                        </div>
                        <h3 className={cn(
                          "text-sm font-semibold truncate transition-colors",
                          bug.status === "Fixed" ? "text-green-600" : "text-[#b50938]"
                        )}>
                          {bug.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                          {bug.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>{bug.postedBy?.user_name || "Anonymous"}</span>
                          <span>{timeAgo(bug.createdAt)}</span>
                          {bug.attachments.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Paperclip className="w-3 h-3" /> {bug.attachments.length}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Upvotes & comments */}
                      <div className="shrink-0 flex flex-col items-center gap-2 text-gray-400">
                        <div className="flex items-center gap-1 text-xs">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{bug._count.upvotes}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{bug._count.comments}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {meta.pages > 1 && (
              <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between shrink-0">
                <p className="text-xs text-gray-500">
                  Page {meta.page} of {meta.pages} ({meta.total} total)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                    disabled={page >= meta.pages}
                    className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Detail View ──────────────────────────────────────────────── */}
        {view === "detail" && (
          <div className="flex-1 overflow-y-auto">
            {loadingDetail ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-[#b50938]" />
                <p className="text-sm">Loading details…</p>
              </div>
            ) : selectedBug ? (
              <div className="flex flex-col h-full">
                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Status + meta */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
                      selectedBug.type === "feature" ? "bg-purple-50 text-purple-600" : "bg-red-50 text-red-600"
                    )}>
                      {selectedBug.type === "feature" ? <><Sparkles className="w-3.5 h-3.5" /> Feature Request</> : <><Bug className="w-3.5 h-3.5" /> Bug Report</>}
                    </span>
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
                      selectedBug.status === "Fixed" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {selectedBug.status === "Fixed" ? <><CheckCircle2 className="w-3.5 h-3.5" /> Fixed</> : <><Eye className="w-3.5 h-3.5" /> Open</>}
                    </span>
                    <span className="text-xs text-gray-400">
                      Posted by <strong className="text-gray-600">{selectedBug.postedBy?.user_name || "Anonymous"}</strong> · {timeAgo(selectedBug.createdAt)}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedBug.description}</p>
                  </div>

                  {/* Attachments */}
                  {selectedBug.attachments.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Attachments</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedBug.attachments.map((att) => (
                          <a 
                            key={att.id} 
                            href={`/api/v1/bugs/attachments/${att.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm hover:bg-gray-100 transition-colors cursor-pointer"
                          >
                            {getFileIcon(att.mimeType)}
                            <span className="text-gray-700 truncate max-w-[200px] hover:underline">{att.originalName}</span>
                            <span className="text-gray-400 text-xs">{formatBytes(att.size)}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fix banner */}
                  {selectedBug.status === "Fixed" && selectedBug.fixComment && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-800">Resolution</span>
                        {selectedBug.fixedAt && (
                          <span className="text-xs text-green-500 ml-auto">{timeAgo(selectedBug.fixedAt)}</span>
                        )}
                      </div>
                      <p className="text-sm text-green-700 whitespace-pre-wrap">{selectedBug.fixComment}</p>
                    </div>
                  )}

                  {/* Upvote bar */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleUpvote}
                      disabled={selectedBug.status === "Fixed"}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                        hasUpvoted
                          ? "bg-[#b50938]/5 border-[#b50938]/20 text-[#b50938]"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50",
                        selectedBug.status === "Fixed" && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <ThumbsUp className={cn("w-4 h-4", hasUpvoted && "fill-current")} />
                      {selectedBug._count.upvotes} {selectedBug._count.upvotes === 1 ? "Upvote" : "Upvotes"}
                    </button>
                    <span className="text-xs text-gray-400">
                      {selectedBug._count.comments} {selectedBug._count.comments === 1 ? "comment" : "comments"}
                    </span>
                  </div>

                  {/* Admin fix action */}
                  {isAdminUser && selectedBug.status !== "Fixed" && (
                    <div>
                      {showFixForm ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                          <h4 className="text-sm font-semibold text-amber-800">Mark as Fixed</h4>
                          <textarea
                            value={fixCommentText}
                            onChange={(e) => setFixCommentText(e.target.value)}
                            placeholder="Describe the fix or provide instructions..."
                            className="w-full h-24 px-3 py-2 text-sm border border-amber-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-300 focus:border-amber-300 outline-none resize-none"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleFix}
                              disabled={fixing}
                              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
                              style={{ backgroundColor: "#16a34a" }}
                            >
                              {fixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                              Confirm Fix
                            </button>
                            <button
                              onClick={() => setShowFixForm(false)}
                              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowFixForm(true)}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
                          style={{ backgroundColor: "#16a34a" }}
                        >
                          <CheckCircle2 className="w-4 h-4" /> Mark as Fixed
                        </button>
                      )}
                    </div>
                  )}

                  {/* Comments section */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Comments ({selectedBug.comments?.length || 0})
                    </h4>
                    <div className="space-y-3">
                      {(selectedBug.comments || []).map((c) => (
                        <div key={c.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0 uppercase">
                            {c.authorName?.charAt(0) || "?"}
                          </div>
                          <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-gray-700">{c.authorName}</span>
                              <span className="text-[10px] text-gray-400">{timeAgo(c.createdAt)}</span>
                            </div>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.content}</p>
                          </div>
                        </div>
                      ))}
                      {(selectedBug.comments || []).length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-4">No comments yet. Be the first to comment.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Comment input */}
                {selectedBug.status !== "Fixed" && (
                  <div className="px-6 py-3 border-t border-gray-100 shrink-0 bg-gray-50/50">
                    <div className="flex items-center gap-2">
                      <Input
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment..."
                        className="flex-1 h-9 text-sm"
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                      />
                      <button
                        onClick={handleComment}
                        disabled={!commentText.trim() || sendingComment}
                        className="p-2 rounded-lg text-white transition-all hover:opacity-90 disabled:opacity-30"
                        style={{ backgroundColor: "#b50938" }}
                      >
                        {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* ── Create View ──────────────────────────────────────────────── */}
        {view === "create" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Type selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setNewType("bug")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all",
                    newType === "bug" ? "bg-red-50 border-red-200 text-red-700" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <Bug className="w-4 h-4" /> Bug Report
                </button>
                <button
                  onClick={() => setNewType("feature")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all",
                    newType === "feature" ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <Sparkles className="w-4 h-4" /> Feature Request
                </button>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Title</label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={newType === "feature" ? "e.g. Add bulk export to reports" : "e.g. Form not submitting on mobile"}
                className="h-10"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Provide as much detail as possible. Include steps to reproduce if reporting a bug..."
                className="w-full h-32 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#b50938]/30 focus:border-[#b50938] outline-none resize-none"
              />
            </div>

            {/* File upload */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Attachments <span className="text-gray-400 normal-case">(optional, max 5 files)</span>
              </label>
              <div
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#b50938]/30 transition-colors cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Drop files here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">Screenshots, documents, logs</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              {newFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {newFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                      {getFileIcon(file.type)}
                      <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                      <span className="text-xs text-gray-400">{formatBytes(file.size)}</span>
                      <button onClick={() => removeFile(i)} className="p-1 hover:bg-gray-200 rounded transition-colors">
                        <X className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Anonymous toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-700">Post Anonymously</p>
                <p className="text-xs text-gray-400">Your identity will be hidden but you'll still receive notifications</p>
              </div>
              <button
                onClick={() => setNewAnonymous(!newAnonymous)}
                className="text-gray-500 hover:text-[#b50938] transition-colors"
              >
                {newAnonymous
                  ? <ToggleRight className="w-8 h-8 text-[#b50938]" />
                  : <ToggleLeft className="w-8 h-8" />
                }
              </button>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim() || !newDescription.trim() || creating}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: "#b50938" }}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Report
              </button>
              <button
                onClick={() => setView("feed")}
                className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
