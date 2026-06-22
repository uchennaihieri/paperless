"use client";

import React, { useState, useEffect, useRef } from "react";
import { Upload, Search, X, ArrowLeft, Database, MoreVertical, Download, Share2, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";

type Dataset = {
  id: string;
  name: string;
  uploadedBy: string;
  sharedWith: string[];
  status: string;
  createdAt: string;
  totalRows?: number;
};

type UserResult = { email: string; user_name: string; branch: string };

export default function UploadedDataClientPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [datasetToDelete, setDatasetToDelete] = useState<string | null>(null);

  useEffect(() => {
    if ((session?.user as any)?.backendToken) fetchDatasets();
  }, [session]);

  const fetchDatasets = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/datasets`, {
        headers: { Authorization: `Bearer ${(session?.user as any)?.backendToken}` }
      });
      const json = await res.json();
      if (json.success) setDatasets(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelete = async (id: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/datasets/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${(session?.user as any)?.backendToken}` }
      });
      if (res.ok) {
        setDatasets(prev => prev.filter(d => d.id !== id));
      } else {
        const json = await res.json();
        alert(json.error || "Failed to delete");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/datasets/${id}/records`, {
        headers: { Authorization: `Bearer ${(session?.user as any)?.backendToken}` }
      });
      const json = await res.json();
      if (json.success && json.data) {
        // Flatten data for export
        const exportData = json.data.map((r: any) => ({
          "DAT Reference": r.reference,
          ...r.rowData,
          "FirstCentral Ref": r.firstCentralRef,
          "CreditRegistry Ref": r.creditRegistryRef,
          "Processing Status": r.processingStatus,
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx`);
      }
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  const filteredData = datasets.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="w-full max-w-6xl mx-auto pb-12 space-y-6">
      <Link href="/dashboard/account-services"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />Extended Services
      </Link>

      {/* Hero */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-800 text-white rounded-2xl px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div>
          <h2 className="text-2xl font-bold">Uploaded Data</h2>
          <p className="text-sm text-white/70 mt-1">Upload and manage your custom data for use within workflows.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-teal-700 hover:bg-teal-50 rounded-lg text-sm font-semibold transition-colors"
          >
            <Upload className="w-4 h-4" />New Upload
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-visible min-h-[400px]">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search uploaded data..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <span className="text-xs text-gray-400 ml-auto">{filteredData.length} items</span>
        </div>

        <div className="overflow-visible relative">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">Name</th>
                  <th className="px-6 py-4 font-semibold">Uploader</th>
                  <th className="px-6 py-4 font-semibold">Total Rows</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      <Database className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="font-medium">No datasets found</p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map(dataset => (
                    <tr key={dataset.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/account-services/uploaded-data/${dataset.id}`} className="font-medium text-gray-900 hover:text-teal-600 hover:underline">
                          {dataset.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 truncate max-w-[150px]" title={dataset.uploadedBy}>{dataset.uploadedBy}</td>
                      <td className="px-6 py-4">{dataset.totalRows || 0}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[11px] font-medium rounded-full ${dataset.status === 'READY' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {dataset.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">{new Date(dataset.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right relative">
                        <button
                          onClick={() => setActiveMenu(activeMenu === dataset.id ? null : dataset.id)}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenu === dataset.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                            <div className="absolute right-6 top-10 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 animate-in fade-in slide-in-from-top-2 text-left">
                              <button
                                onClick={() => { handleDownload(dataset.id, dataset.name); setActiveMenu(null); }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Download className="w-4 h-4" /> Download
                              </button>
                              {dataset.uploadedBy === session?.user?.email && (
                                <>
                                  <button
                                    onClick={() => { setSelectedDatasetId(dataset.id); setIsShareModalOpen(true); setActiveMenu(null); }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Share2 className="w-4 h-4" /> Share
                                  </button>
                                  <button
                                    onClick={() => { setDatasetToDelete(dataset.id); setActiveMenu(null); }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" /> Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isUploadModalOpen && (
        <UploadModal 
          onClose={() => setIsUploadModalOpen(false)} 
          onSuccess={() => { setIsUploadModalOpen(false); fetchDatasets(); }} 
        />
      )}

      {isShareModalOpen && selectedDatasetId && (
        <ShareModal 
          datasetId={selectedDatasetId} 
          onClose={() => setIsShareModalOpen(false)} 
        />
      )}

      {datasetToDelete && (
        <DeleteModal 
          onClose={() => setDatasetToDelete(null)}
          onConfirm={() => { confirmDelete(datasetToDelete); setDatasetToDelete(null); }}
        />
      )}
    </div>
  );
}

// ── Modals ───────────────────────────────────────────────────────────────────

function UploadModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [hasBVN, setHasBVN] = useState(false);
  const [runFirstCentral, setRunFirstCentral] = useState(false);
  const [runCreditRegistry, setRunCreditRegistry] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const records = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          if (records.length > 0) {
            const headers = records[0] as string[];
            const foundBvn = headers.some(h => String(h).toUpperCase() === "BVN");
            setHasBVN(foundBvn);
            if (!foundBvn) {
              setRunFirstCentral(false);
              setRunCreditRegistry(false);
            }
          }
        } catch (err) {
          console.error(err);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!name.trim() || !file) return alert("Please provide a name and select a file.");
    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const records = XLSX.utils.sheet_to_json(firstSheet);

        const res = await fetch(`${BASE_URL}/api/v1/datasets`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(session?.user as any)?.backendToken}`,
          },
          body: JSON.stringify({ name, records, runFirstCentral, runCreditRegistry }),
        });

        if (res.ok) {
          onSuccess();
        } else {
          const json = await res.json();
          alert(json.error || "Upload failed");
        }
        setIsUploading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (e) {
      console.error(e);
      alert("Error processing file");
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Upload Dataset</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dataset Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q3 Customer Leads"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Excel/CSV File</label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors">
              <input type="file" accept=".xlsx,.csv" onChange={handleFile} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-teal-600">{file ? file.name : "Click to select a file"}</span>
                <span className="text-xs text-gray-500 mt-1">.xlsx or .csv up to 10MB</span>
              </label>
            </div>
          </div>
          {hasBVN && (
            <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 space-y-3">
              <p className="text-sm text-teal-800 font-medium">We detected a BVN column. Would you like to run background checks?</p>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={runFirstCentral} onChange={e => setRunFirstCentral(e.target.checked)} className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                Add FirstCentral CRB
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={runCreditRegistry} onChange={e => setRunCreditRegistry(e.target.checked)} className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                Add Credit Registry CRB
              </label>
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleUpload} disabled={isUploading || !file || !name} className="px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
            {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm Upload
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareModal({ datasetId, onClose }: { datasetId: string, onClose: () => void }) {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setUsers([]); return; }
    const delay = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${BASE_URL}/api/v1/workflow/search-users?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${(session?.user as any)?.backendToken}` }
        });
        const json = await res.json();
        if (json.success) setUsers(json.data.slice(0, 5));
      } catch (e) {} finally { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(delay);
  }, [query]);

  const handleShare = async () => {
    try {
      await fetch(`${BASE_URL}/api/v1/datasets/${datasetId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${(session?.user as any)?.backendToken}` },
        body: JSON.stringify({ emails: selectedEmails })
      });
      onClose();
    } catch (e) {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-gray-900">Share Dataset</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Users</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Type name or email..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
            </div>
            {users.length > 0 && (
              <ul className="mt-2 border border-gray-100 rounded-lg shadow-sm divide-y divide-gray-50 max-h-40 overflow-y-auto">
                {users.map((u: any, i: number) => (
                  <li key={u.id || u.finca_email || u.email || i} className="p-2 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      const emailToUse = u.finca_email || u.email;
                      if (emailToUse && !selectedEmails.includes(emailToUse)) setSelectedEmails([...selectedEmails, emailToUse]);
                      setQuery(""); setUsers([]);
                    }}>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{u.user_name}</span>
                      <span className="text-xs text-gray-500">{u.finca_email || u.email}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selectedEmails.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Selected Users</label>
              <div className="flex flex-wrap gap-2">
                {selectedEmails.map(email => (
                  <span key={email} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-md text-xs font-medium border border-teal-100">
                    {email}
                    <button onClick={() => setSelectedEmails(selectedEmails.filter(e => e !== email))} className="hover:text-teal-900"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg">Cancel</button>
          <button onClick={handleShare} disabled={selectedEmails.length === 0} className="px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50">
            Share Access
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ onClose, onConfirm }: { onClose: () => void, onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 text-center">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Dataset?</h3>
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this dataset? This action cannot be undone and will remove all associated records.
          </p>
        </div>
        <div className="px-6 py-4 bg-gray-50 flex justify-center gap-3 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg flex-1">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg flex-1">
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}
