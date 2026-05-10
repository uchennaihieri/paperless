"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Plus, Trash2, ArrowLeft, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useSession } from "next-auth/react";

interface ReusableList {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

export default function ReusableListsPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.backendToken || "";
  const [lists, setLists] = useState<ReusableList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [isUploading, setIsUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";

  const fetchLists = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/lists`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLists(data.data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load reusable lists.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchLists();
  }, [token]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this reusable list? It may break forms that are currently using it.")) return;
    
    try {
      const res = await fetch(`${BASE_URL}/api/v1/lists/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLists(lists.filter(l => l.id !== id));
      } else {
        alert(data.error || "Failed to delete list");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete list");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name.trim()) return;
    
    setIsUploading(true);
    setUploadError("");
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("description", description);
    
    try {
      const res = await fetch(`${BASE_URL}/api/v1/lists/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setName("");
        setDescription("");
        setFile(null);
        fetchLists();
      } else {
        setUploadError(data.error || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      setUploadError("An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard/templates" className="text-gray-500 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h2 className="text-2xl font-bold tracking-tight">Reusable Lists</h2>
          </div>
          <p className="text-muted-foreground text-gray-500 ml-8">
            Upload Excel files to create reusable lists for dropdowns and comboboxes.
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 font-medium text-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Upload Excel List
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
            <tr>
              <th className="px-6 py-4 font-medium">List Name</th>
              <th className="px-6 py-4 font-medium">Description</th>
              <th className="px-6 py-4 font-medium">Created By</th>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                </td>
              </tr>
            ) : lists.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-base font-medium text-gray-700">No reusable lists found</p>
                  <p className="text-sm mt-1 mb-4">Upload an Excel file with a single column of items to get started.</p>
                  <button 
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium text-sm transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Upload List
                  </button>
                </td>
              </tr>
            ) : (
              lists.map((list) => (
                <tr key={list.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 border-l-4 border-transparent hover:border-primary">
                    {list.name}
                  </td>
                  <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                    {list.description || "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {list.createdBy}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(list.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(list.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors inline-block"
                      title="Delete List"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Upload Reusable List</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="p-6 space-y-5">
              {uploadError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100">
                  {uploadError}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">List Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nigerian States"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. List of all states in Nigeria"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Excel File (.xlsx)</label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${file ? 'border-primary/50 bg-primary/5' : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                    required
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet className="w-8 h-8 text-primary" />
                      <span className="text-sm font-medium text-primary break-all">{file.name}</span>
                      <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Click to select a file</span>
                      <span className="text-xs text-gray-500">The first column of the first sheet will be imported.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !file || !name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Create List"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
