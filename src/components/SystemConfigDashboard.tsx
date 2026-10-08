"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Trash2, ChevronLeft, ChevronRight, Settings, MoreVertical, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface SystemConfigDto {
  id: string;
  key: string;
  value: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageDto<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

export default function SystemConfigDashboard() {
  const [configs, setConfigs] = useState<SystemConfigDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [hasNext, setHasNext] = useState(false);
  const [total, setTotal] = useState(0);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<SystemConfigDto | null>(null);

  // Dropdown state for actions kebab menu
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    key: "",
    value: "",
    description: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const getHeaders = () => {
    const token = localStorage.getItem("esave_token");
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "x-device-id": process.env.NEXT_PUBLIC_ESAVE_DEVICE || "web",
    };
  };

  const getApiUrl = (path: string) => {
    const base = process.env.NEXT_PUBLIC_ESAVE_BASE || "";
    const cleanBase = base.replace(/\/$/, "");
    const cleanPath = path.replace(/^\//, "");
    return `${cleanBase}/${cleanPath}`;
  };

  const fetchConfigs = useCallback(async (currentPage: number) => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", currentPage.toString());
      queryParams.append("pageSize", pageSize.toString());
      queryParams.append("sortBy", "key:asc");
      
      if (searchQuery.trim()) {
        queryParams.append("search", searchQuery.trim());
      }

      const url = getApiUrl(`/v1/system-configs?${queryParams.toString()}`);
      const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });

      if (res.status === 401) {
        localStorage.removeItem("esave_token");
        window.location.href = "/dashboard/workflow";
        return;
      }

      const responseJson = await res.json();
      if (!res.ok) throw new Error(responseJson.message || responseJson.description || "Failed to fetch configs");

      const payload: PageDto<SystemConfigDto> = responseJson.data;
      setConfigs(payload.data || []);
      setHasNext(payload.hasNext);
      setTotal(payload.total || 0);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchConfigs(page);
  }, [page, fetchConfigs]);

  const handleSearch = () => {
    if (page === 1) {
      fetchConfigs(1);
    } else {
      setPage(1);
    }
  };

  const handleOpenAdd = () => {
    setFormData({ key: "", value: "", description: "" });
    setFormError("");
    setIsFormOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!formData.key || !formData.value) {
      setFormError("Key and Value are required.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const url = getApiUrl(`/v1/system-configs`);
      const res = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(formData)
      });

      if (res.status === 401) {
        localStorage.removeItem("esave_token");
        window.location.href = "/dashboard/workflow";
        return;
      }

      const responseJson = await res.json();
      if (!res.ok) throw new Error(responseJson.message || responseJson.description || "Failed to save config");

      setIsFormOpen(false);
      fetchConfigs(page);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (config: SystemConfigDto) => {
    setConfigToDelete(config);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfig = async () => {
    if (!configToDelete) return;
    setIsSubmitting(true);
    setFormError("");

    try {
      const res = await fetch(getApiUrl(`/v1/system-configs/${configToDelete.key}`), {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (res.status === 401) {
        localStorage.removeItem("esave_token");
        window.location.href = "/dashboard/workflow";
        return;
      }

      const responseJson = await res.json();
      if (!res.ok) throw new Error(responseJson.message || responseJson.description || "Failed to delete config");

      setIsDeleteOpen(false);
      fetchConfigs(page);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">System Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">Manage global system configurations and settings.</p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Config
        </Button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search configs..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9 bg-white border-gray-200 focus-visible:ring-primary/20"
              />
            </div>
            <Button onClick={handleSearch} className="bg-primary text-white hover:bg-primary/90 px-4">
              Search
            </Button>
          </div>
          <div className="text-sm text-gray-500 font-medium bg-white px-3 py-1.5 rounded-md border border-gray-200 shrink-0">
            Total Configs: {total}
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-400 h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary/60 mb-4" />
              <p>Loading configs...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-12 text-center text-red-500 h-full flex flex-col items-center justify-center">
              <p>{errorMsg}</p>
              <Button onClick={() => fetchConfigs(page)} variant="outline" className="mt-4">Retry</Button>
            </div>
          ) : configs.length === 0 ? (
            <div className="p-12 text-center text-gray-500 h-full flex flex-col items-center justify-center">
              <Settings className="w-12 h-12 text-gray-200 mb-3 mx-auto" />
              <p>No configurations found.</p>
              <Button onClick={handleOpenAdd} variant="link" className="mt-2">Add the first config</Button>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">Key</th>
                  <th className="px-6 py-4 font-semibold">Value</th>
                  <th className="px-6 py-4 font-semibold">Description</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {configs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-900">{config.key}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">{config.value}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {config.description || "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block text-left" onClick={e => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                            setOpenDropdownId(openDropdownId === config.id ? null : config.id);
                          }} 
                          className="text-gray-500 hover:text-gray-900 rounded-full h-8 w-8 p-0"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </Button>

                        {openDropdownId === config.id && (
                          <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-[60] flex flex-col text-left">
                            <button 
                              onClick={() => { setOpenDropdownId(null); confirmDelete(config); }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 font-medium hover:bg-red-50 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination Footer */}
        {!isLoading && configs.length > 0 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="text-sm text-gray-500">
              Showing page <span className="font-bold text-gray-900">{page}</span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={!hasNext}
                onClick={() => setPage(p => p + 1)}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                Add New Config
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md">
                  {formError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Key *</label>
                <Input 
                  placeholder="e.g. MINIMUM_BALANCE" 
                  value={formData.key} 
                  onChange={e => setFormData({...formData, key: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Value *</label>
                <Input 
                  placeholder="e.g. 1000" 
                  value={formData.value} 
                  onChange={e => setFormData({...formData, value: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <Input 
                  placeholder="e.g. Minimum balance required" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSaveConfig} disabled={isSubmitting} className="bg-primary text-white">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Config
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">Delete Config?</h3>
            <p className="text-sm text-center text-gray-500 mb-6">
              Are you sure you want to delete <strong>{configToDelete?.key}</strong>? This action cannot be undone.
            </p>
            
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md mb-4">
                {formError}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsDeleteOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleDeleteConfig} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
