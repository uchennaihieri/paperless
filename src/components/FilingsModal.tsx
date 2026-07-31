"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  X, Search, Folder, FileText, Loader2,
  ArrowLeft, ChevronRight, Calendar, User, ShieldCheck, FolderOpen, Inbox,
  Tag, Edit2, Check, Plus, Share2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  publicSubmitterName?: string;
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

  const roles = session?.user && (session.user as any).roles ? JSON.parse((session.user as any).roles) : [];
  const activeRoleId = session?.user && (session.user as any).activeRoleId;
  const activeRole = roles.find((r: any) => r.id === activeRoleId) || roles[0];
  const userBranch = activeRole?.branch ?? "Your Branch";

  const [items, setItems] = useState<FilingItem[]>([]);
  const [manualFolders, setManualFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // currentFolder can be system or manual
  type FolderState = { type: 'system'; name: string } | { type: 'manual'; folder: any } | null;
  const [currentFolder, setCurrentFolder] = useState<FolderState>(null);
  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Manual folder submissions state
  const [manualSubmissions, setManualSubmissions] = useState<any[]>([]);
  const [loadingManualSubs, setLoadingManualSubs] = useState(false);

  // Create Folder State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);

  // Share Folder State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareFolderId, setShareFolderId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState("");
  const [accessLevel, setAccessLevel] = useState("VIEW");
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState("");
  const [usersList, setUsersList] = useState<any[]>([]);

  const fetchFilingsAndFolders = useCallback(async () => {
    if (!token || !isOpen) return;
    setLoading(true);
    setError("");
    try {
      const [filingsRes, foldersRes, usersRes] = await Promise.all([
        fetch(`${BASE_URL}/api/v1/submissions/filings`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/v1/folders`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/v1/folders/users`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
      ]);
      
      if (!filingsRes.ok) throw new Error(`Error ${filingsRes.status}`);
      const filingsJson = await filingsRes.json();
      setItems(filingsJson.data ?? []);

      const foldersJson = await foldersRes.json();
      if (foldersJson.success) setManualFolders(foldersJson.data || []);

      if (usersRes && usersRes.ok) {
        const usersJson = await usersRes.json();
        if (usersJson.data) setUsersList(usersJson.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load filings.");
    } finally {
      setLoading(false);
    }
  }, [token, isOpen, BASE_URL]);

  useEffect(() => {
    fetchFilingsAndFolders();
  }, [fetchFilingsAndFolders]);

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

  const openManualFolder = useCallback(async (folder: any) => {
    setCurrentFolder({ type: 'manual', folder });
    setLoadingManualSubs(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/folders/${folder.id}/submissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setManualSubmissions(data.data || []);
    } catch (err) { } finally {
      setLoadingManualSubs(false);
    }
  }, [BASE_URL, token]);

  useEffect(() => {
    const handleOpenFileRoom = (e: any) => {
      if (e.detail?.type && e.detail?.folder) {
        if (e.detail.type === 'system') {
          setCurrentFolder({ type: 'system', name: e.detail.folder });
        } else if (e.detail.type === 'manual') {
          openManualFolder(e.detail.folder);
        }
      }
    };
    window.addEventListener('open-file-room', handleOpenFileRoom);
    return () => window.removeEventListener('open-file-room', handleOpenFileRoom);
  }, [openManualFolder]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newFolderName })
      });
      const data = await res.json();
      if (data.success) {
        setNewFolderName("");
        setShowCreateModal(false);
        fetchFilingsAndFolders();
      }
    } catch (err) { } finally {
      setCreating(false);
    }
  };

  const handleShareFolder = async () => {
    if (!shareFolderId || !targetUserId) return;
    setSharing(true);
    setShareError("");
    try {
      const res = await fetch(`${BASE_URL}/api/v1/folders/${shareFolderId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUserId, accessLevel })
      });
      const data = await res.json();
      if (data.success) {
        setShowShareModal(false);
        setShareFolderId(null);
        setTargetUserId("");
        fetchFilingsAndFolders();
      } else {
        setShareError(data.error || "Failed to share folder.");
      }
    } catch (err) {
      setShareError("An unexpected error occurred.");
    } finally {
      setSharing(false);
    }
  };

  // Group system filings
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

  const systemFoldersList = Object.entries(groupedFolders).map(([folderName, files]) => ({
    id: folderName,
    name: folderName,
    type: 'system' as const,
    creatorName: 'SYSTEM',
    count: files.length,
    originalData: files
  }));

  const manualFoldersList = manualFolders.map(f => ({
    id: f.id,
    name: f.name,
    type: 'manual' as const,
    creatorName: f.createdBy?.user_name || 'Unknown',
    count: f._count?.submissions || 0,
    originalData: f
  }));

  const allFolders = [...systemFoldersList, ...manualFoldersList].sort((a, b) => a.name.localeCompare(b.name));

  const activeFolderItems = (currentFolder?.type === 'system') ? (groupedFolders[currentFolder.name] ?? []) : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#b50938]/10">
              <FolderOpen className="w-5 h-5 text-[#b50938]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">File Room</h2>
              <p className="text-xs text-gray-400">
                Completed submissions and custom folders for: <span className="font-semibold text-gray-700">{userBranch}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button size="sm" onClick={() => setShowCreateModal(true)} className="h-8 bg-primary hover:opacity-90 text-white" style={{ backgroundColor: "#B50938" }}>
              <Plus className="w-4 h-4 mr-1" /> Create Folder
            </Button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Global Search */}
        <div className="px-6 py-3 border-b border-gray-100 shrink-0 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search automated filings by reference, applicant, form type..."
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
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <span className="text-xs font-medium text-gray-500">Loading branch archives...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-600 gap-2">
              <Inbox className="w-10 h-10 opacity-30 text-red-400" />
              <p className="text-sm font-semibold">{error}</p>
              <button 
                onClick={fetchFilingsAndFolders} 
                className="text-xs font-semibold text-gray-600 hover:underline mt-1"
              >
                Retry loading
              </button>
            </div>
          ) : search ? (
            // Search Results Flattened View
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Search Results ({filteredItems.length})
                </span>
                <button onClick={() => setSearch("")} className="text-xs font-medium text-gray-600 hover:underline">
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
                      className="flex items-center justify-between p-3.5 bg-white border border-gray-150 rounded-xl hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="p-2.5 bg-gray-50 rounded-lg text-gray-600 shrink-0 group-hover:bg-gray-600 group-hover:text-white transition-colors">
                          <FileText className="w-5 h-5 shrink-0" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate group-hover:text-gray-900 transition-colors">
                            {item.reference ?? "UNREFERENCED"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 truncate">
                            <span className="font-semibold text-gray-500">{item.formName}</span>
                            <span>·</span>
                            <span>By {item.submittedBy?.user_name ?? "System"}</span>
                          </div>
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
            // Unified Folder Explorer View
            <div className="space-y-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                Folders ({allFolders.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {allFolders.map(f => (
                  <div key={`${f.type}-${f.id}`} className={`flex flex-col bg-white border rounded-xl p-4 transition-all group cursor-pointer ${
                    f.type === 'system' ? 'border-gray-200 hover:border-red-300 hover:shadow-sm' : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                  }`} onClick={() => {
                    if (f.type === 'system') {
                      setCurrentFolder({ type: 'system', name: f.name });
                    } else {
                      openManualFolder(f.originalData);
                    }
                  }}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl transition-colors ${
                          f.type === 'system' 
                            ? 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white' 
                            : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                        }`}>
                          <Folder className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className={`font-bold text-sm text-gray-900 transition-colors ${
                            f.type === 'system' ? 'group-hover:text-red-700' : 'group-hover:text-blue-600'
                          }`}>{f.name}</h4>
                          <p className="text-xs text-gray-400 mt-0.5">{f.count} items</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                      <div className="text-[11px] text-gray-500 flex items-center gap-1">
                        <User className="w-3 h-3" /> {f.creatorName}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 text-[11px] px-2 text-gray-500 transition-colors ${
                          f.type === 'system' 
                            ? 'hover:text-red-700 hover:bg-red-50' 
                            : 'hover:text-blue-600 hover:bg-blue-50'
                        }`}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setShareFolderId(f.id); 
                          setShowShareModal(true); 
                        }}
                      >
                        <Share2 className="w-3 h-3 mr-1" /> Share
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {allFolders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <Folder className="w-16 h-16 text-gray-300 mb-4 opacity-40" />
                  <p className="text-sm font-semibold text-gray-700">File Room Empty</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm">
                    No completed submissions or custom folders found for {userBranch}.
                  </p>
                </div>
              )}
            </div>
          ) : currentFolder?.type === 'system' ? (
            // System Folder Files view
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
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
                    <span className="font-medium text-gray-600 truncate">{currentFolder.name}</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-800 truncate mt-0.5">{currentFolder.name}</h3>
                </div>
              </div>

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
          ) : currentFolder?.type === 'manual' ? (
            // Manual Folder Files view
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setCurrentFolder(null)}
                  className="flex items-center justify-center p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer shadow-xs transition-colors shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span onClick={() => setCurrentFolder(null)} className="hover:text-blue-600 cursor-pointer transition-colors">Root</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="font-medium text-gray-600 truncate">{currentFolder.folder.name}</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-800 truncate mt-0.5">{currentFolder.folder.name}</h3>
                </div>
              </div>

              {loadingManualSubs ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
              ) : manualSubmissions.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-500">This folder is empty.</div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {manualSubmissions.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => { onClose(); router.push(`/dashboard/forms/submission/${item.id}`); }}
                      className="bg-white border border-gray-150 rounded-xl p-3.5 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <FileText className="w-4 h-4 shrink-0" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-gray-900 group-hover:text-blue-600 truncate">
                              {item.reference ?? item.formName ?? "UNREFERENCED"}
                            </p>
                            <span className="text-[10px] text-gray-400 font-normal shrink-0">·</span>
                            <span className="text-xs text-gray-400 truncate shrink-0">
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400 mt-1">
                            <span className="flex items-center gap-1 font-medium text-gray-500">
                              <User className="w-3.5 h-3.5" /> {item.submittedBy?.user_name ?? item.publicSubmitterName ?? "System"}
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
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-7 sm:pl-0">
                        <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-medium">Completed</Badge>
                        <span className="text-xs text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          Open <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 shrink-0 flex items-center justify-between bg-gray-50/50 text-[11px] text-gray-400 font-medium">
          <span>FINCALite Branch Filing System v1.0</span>
          <span>{items.length + manualSubmissions.length} entries found</span>
        </div>
      </div>

      {/* Create Folder Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-lg">Create New Folder</h3>
            <input
              autoFocus
              placeholder="Folder Name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
            />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button className="flex-1 text-white hover:opacity-90" style={{ backgroundColor: "#B50938" }} disabled={!newFolderName.trim() || creating} onClick={handleCreateFolder}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Share Folder Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-lg">Share Folder</h3>
            <p className="text-xs text-gray-500">Grant a user access to view or add items to this folder.</p>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">User</label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none"
                >
                  <option value="" disabled>Select User</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>{u.user_name} ({u.finca_email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Access Level</label>
                <select
                  value={accessLevel}
                  onChange={(e) => setAccessLevel(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none"
                >
                  <option value="VIEW">View Only</option>
                  <option value="WRITE">Write (Can add items)</option>
                </select>
              </div>

              {shareError && <p className="text-xs text-red-600">{shareError}</p>}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowShareModal(false)}>Cancel</Button>
              <Button className="flex-1 text-white hover:opacity-90" style={{ backgroundColor: "#B50938" }} disabled={!targetUserId || sharing} onClick={handleShareFolder}>
                {sharing ? "Sharing..." : "Share"}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
