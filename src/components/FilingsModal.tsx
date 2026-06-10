"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  X, Search, Folder, FileText, Loader2,
  ArrowLeft, ChevronRight, Calendar, User, ShieldCheck, FolderOpen, Inbox,
  Tag, Edit2, Check
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

type FilingItem = {
  id: string;
  formName: string;
  reference: string | null;
  alias: string | null;
  status: string;
  treatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  template: { name: string; formOwner: string | null } | null;
  submittedBy: { user_name: string; finca_email: string; branch: string } | null;
  formResponses?: any;
};

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(iso));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FilingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session?.user as any)?.backendToken ?? "";
  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";

  // Find active role branch to show in the header
  const roles = session?.user && (session.user as any).roles ? JSON.parse((session.user as any).roles) : [];
  const activeRoleId = session?.user && (session.user as any).activeRoleId;
  const activeRole = roles.find((r: any) => r.id === activeRoleId) || roles[0];
  const userBranch = activeRole?.branch ?? "Your Branch";

  const [items, setItems] = useState<FilingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Navigation & filtering states
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Alias editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Fetch Filings from the backend
  const fetchFilings = useCallback(async () => {
    if (!token || !isOpen) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/api/v1/submissions/filings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      setItems(json.data ?? []);
    } catch (err: any) {
      setError(err.message || "Failed to load filings.");
    } finally {
      setLoading(false);
    }
  }, [token, isOpen, BASE_URL]);

  useEffect(() => {
    fetchFilings();
  }, [fetchFilings]);

  // Trap Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const startEdit = (e: React.MouseEvent, item: FilingItem) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditValue(item.alias ?? "");
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditValue("");
  };

  const saveAlias = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSavingId(id);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/submissions/${id}/alias`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ alias: editValue }),
      });
      if (!res.ok) throw new Error("Failed to save alias");
      const json = await res.json();
      if (json.success) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, alias: editValue ? editValue.trim() : null } : item))
        );
        setEditingId(null);
      }
    } catch (err: any) {
      alert("Could not update alias: " + (err.message || err));
    } finally {
      setSavingId(null);
    }
  };

  // Group filings by form template name
  const groupedFolders = items.reduce((acc: Record<string, FilingItem[]>, item) => {
    let branchValue = null;
    if (item.formResponses) {
      const branchKey = Object.keys(item.formResponses).find(k => k.toLowerCase() === 'branch');
      if (branchKey && typeof item.formResponses[branchKey] === 'string') {
        branchValue = item.formResponses[branchKey];
      }
    }
    const folderName = branchValue || item.template?.name || item.formName || "Other Forms";
    if (!acc[folderName]) acc[folderName] = [];
    acc[folderName].push(item);
    return acc;
  }, {});

  // Global search filtering across all filings
  const filteredItems = items.filter((item) => {
    const query = search.toLowerCase();
    return (
      item.formName.toLowerCase().includes(query) ||
      (item.reference && item.reference.toLowerCase().includes(query)) ||
      (item.alias && item.alias.toLowerCase().includes(query)) ||
      (item.submittedBy?.user_name && item.submittedBy.user_name.toLowerCase().includes(query)) ||
      (item.treatedBy && item.treatedBy.toLowerCase().includes(query))
    );
  });

  // Items currently visible in the active folder (when not searching)
  const activeFolderItems = currentFolder ? (groupedFolders[currentFolder] ?? []) : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-gray-50/50">
          <div>
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" style={{ color: "#B50938" }} />
              <h2 className="text-lg font-bold text-gray-900">Completed Filings</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Completed submissions owned by branch: <span className="font-semibold text-gray-700">{userBranch}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Search */}
        <div className="px-6 py-3 border-b border-gray-100 shrink-0 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search filings by reference, applicant, form type..."
              className="pl-9 h-9 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Content Explorer Area */}
        <div className="flex-1 overflow-y-auto px-6 py-5 bg-gray-50/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" style={{ color: "#B50938" }} />
              <span className="text-xs font-medium text-gray-500">Loading branch archives...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-600 gap-2">
              <Inbox className="w-10 h-10 opacity-30 text-red-400" />
              <p className="text-sm font-semibold">{error}</p>
              <button 
                onClick={fetchFilings} 
                className="text-xs font-semibold text-primary hover:underline mt-1"
                style={{ color: "#B50938" }}
              >
                Retry loading
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Folder className="w-16 h-16 text-gray-300 mb-4 opacity-40" />
              <p className="text-sm font-semibold text-gray-700">Branch Archive Empty</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                No completed submissions have been generated under the templates owned by {userBranch}.
              </p>
            </div>
          ) : search ? (
            // Search Results Flattened View
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Search Results ({filteredItems.length})
                </span>
                <button onClick={() => setSearch("")} className="text-xs font-medium text-primary hover:underline" style={{ color: "#B50938" }}>
                  Clear Search
                </button>
              </div>
              {filteredItems.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Inbox className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No filings match "{search}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => { onClose(); router.push(`/dashboard/forms/submission/${item.id}`); }}
                      className="flex items-center justify-between p-3.5 bg-white border border-gray-150 rounded-xl hover:border-primary/30 hover:shadow-sm cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="p-2.5 bg-red-50 rounded-lg text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors" style={{ color: "#B50938" }}>
                          <FileText className="w-5 h-5 shrink-0" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate group-hover:text-primary transition-colors">
                            {item.reference ?? "UNREFERENCED"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 truncate">
                            <span className="font-semibold text-gray-500">{item.formName}</span>
                            <span>·</span>
                            <span>By {item.submittedBy?.user_name ?? "System"}</span>
                          </div>
                          {editingId === item.id ? (
                            <div className="flex items-center gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-7 text-xs w-36 border-slate-300 focus:border-red-700 focus:ring-red-700 focus:ring-1 py-0.5 px-2 rounded-md shadow-inner bg-slate-50/50"
                                placeholder="Enter alias..."
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    saveAlias(e as any, item.id);
                                  } else if (e.key === "Escape") {
                                    cancelEdit(e as any);
                                  }
                                }}
                              />
                              <button
                                disabled={savingId === item.id}
                                onClick={(e) => saveAlias(e, item.id)}
                                className="p-1 hover:bg-emerald-50 active:bg-emerald-100 text-emerald-600 rounded-md transition-colors disabled:opacity-50 cursor-pointer border border-transparent hover:border-emerald-200"
                                title="Save Alias"
                              >
                                {savingId === item.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                disabled={savingId === item.id}
                                onClick={cancelEdit}
                                className="p-1 hover:bg-rose-50 active:bg-rose-100 text-rose-500 rounded-md transition-colors disabled:opacity-50 cursor-pointer border border-transparent hover:border-rose-200"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
                              {item.alias ? (
                                <div 
                                  onClick={(e) => startEdit(e, item)}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-md border border-slate-200 transition-all duration-200 hover:scale-105 cursor-pointer group/alias shadow-xs"
                                >
                                  <Tag className="w-2.5 h-2.5 text-slate-400 group-hover/alias:text-red-700 transition-colors" />
                                  <span>Alias: {item.alias}</span>
                                  <Edit2 className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover/alias:opacity-100 transition-opacity ml-0.5" />
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => startEdit(e, item)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-red-700 bg-red-50 hover:bg-red-700 hover:text-white border border-dashed border-red-200 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                  <span>+ Add Alias</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-medium">Completed</Badge>
                        <p className="text-[10px] text-gray-400 mt-1">{formatDate(item.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : currentFolder === null ? (
            // Folder Explorer View (Root level folders representing templates)
            <div className="space-y-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                Folders ({Object.keys(groupedFolders).length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(groupedFolders).map(([folderName, files]) => (
                  <div
                    key={folderName}
                    onClick={() => setCurrentFolder(folderName)}
                    className="bg-white border border-gray-200/80 rounded-xl p-4.5 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 transition-all cursor-pointer group flex items-start gap-4"
                  >
                    <div className="p-3 bg-red-50 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-colors" style={{ color: "#B50938" }}>
                      <Folder className="w-6 h-6 shrink-0 fill-current opacity-85" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-gray-900 group-hover:text-primary transition-colors truncate mt-0.5">
                        {folderName}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {files.length} {files.length === 1 ? "completed form" : "completed forms"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 self-center group-hover:text-primary transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Files view (inside selected folder)
            <div className="space-y-4">
              {/* Folder Header & Navigation */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentFolder(null)}
                  className="flex items-center justify-center p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer shadow-xs transition-colors shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span onClick={() => setCurrentFolder(null)} className="hover:text-primary cursor-pointer transition-colors">Root</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="font-medium text-gray-600 truncate">{currentFolder}</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-800 truncate mt-0.5">{currentFolder}</h3>
                </div>
              </div>

              {/* Folder Submissions List */}
              <div className="grid grid-cols-1 gap-2.5">
                {activeFolderItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => { onClose(); router.push(`/dashboard/forms/submission/${item.id}`); }}
                    className="bg-white border border-gray-150 rounded-xl p-3.5 hover:border-primary/20 hover:shadow-xs transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className="p-2 bg-red-50 text-primary rounded-lg shrink-0 group-hover:bg-primary group-hover:text-white transition-colors" style={{ color: "#B50938" }}>
                        <FileText className="w-4 h-4 shrink-0" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-gray-900 group-hover:text-primary truncate">
                            {item.reference ?? "UNREFERENCED"}
                          </p>
                          <span className="text-[10px] text-gray-400 font-normal shrink-0">·</span>
                          <span className="text-xs text-gray-400 truncate shrink-0">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400 mt-1">
                          <span className="flex items-center gap-1 font-medium text-gray-500">
                            <User className="w-3.5 h-3.5" /> {item.submittedBy?.user_name ?? "System"}
                          </span>
                          {item.treatedBy && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1 font-medium text-gray-500">
                                <ShieldCheck className="w-3.5 h-3.5" /> Treated by: {item.treatedBy}
                              </span>
                            </>
                          )}
                        </div>
                        {editingId === item.id ? (
                          <div className="flex items-center gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-7 text-xs w-36 border-slate-300 focus:border-red-700 focus:ring-red-700 focus:ring-1 py-0.5 px-2 rounded-md shadow-inner bg-slate-50/50"
                              placeholder="Enter alias..."
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  saveAlias(e as any, item.id);
                                } else if (e.key === "Escape") {
                                  cancelEdit(e as any);
                                }
                              }}
                            />
                            <button
                              disabled={savingId === item.id}
                              onClick={(e) => saveAlias(e, item.id)}
                              className="p-1 hover:bg-emerald-50 active:bg-emerald-100 text-emerald-600 rounded-md transition-colors disabled:opacity-50 cursor-pointer border border-transparent hover:border-emerald-200"
                              title="Save Alias"
                            >
                              {savingId === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              disabled={savingId === item.id}
                              onClick={cancelEdit}
                              className="p-1 hover:bg-rose-50 active:bg-rose-100 text-rose-500 rounded-md transition-colors disabled:opacity-50 cursor-pointer border border-transparent hover:border-rose-200"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
                            {item.alias ? (
                              <div 
                                onClick={(e) => startEdit(e, item)}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-md border border-slate-200 transition-all duration-200 hover:scale-105 cursor-pointer group/alias shadow-xs"
                              >
                                <Tag className="w-2.5 h-2.5 text-slate-400 group-hover/alias:text-red-700 transition-colors" />
                                <span>Alias: {item.alias}</span>
                                <Edit2 className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover/alias:opacity-100 transition-opacity ml-0.5" />
                              </div>
                            ) : (
                              <button
                                onClick={(e) => startEdit(e, item)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-red-700 bg-red-50 hover:bg-red-700 hover:text-white border border-dashed border-red-200 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                              >
                                <span>+ Add Alias</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-7 sm:pl-0">
                      <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-medium">Completed</Badge>
                      <span className="text-xs text-primary font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5" style={{ color: "#B50938" }}>
                        Open <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 shrink-0 flex items-center justify-between bg-gray-50/50 text-[11px] text-gray-400 font-medium">
          <span>FINCALite Branch Filing System v1.0</span>
          <span>{items.length} completed entries found</span>
        </div>
      </div>
    </div>
  );
}
