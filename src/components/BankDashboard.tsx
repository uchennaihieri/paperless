"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Edit2, Trash2, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Building2, MoreVertical, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface BankDto {
  id: string;
  name: string;
  slug: string;
  code: string;
  iconUrl: string;
  longcode: string;
  active: boolean;
  type: string;
  country: string;
  currency: string;
  availableForDirectDebit: boolean;
  supportsTransfer: boolean;
}

export interface PageDto<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

export default function BankDashboard() {
  const [banks, setBanks] = useState<BankDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 100;
  const [hasNext, setHasNext] = useState(false);
  const [total, setTotal] = useState(0);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankDto | null>(null);
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [bankToDelete, setBankToDelete] = useState<BankDto | null>(null);

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
    name: "",
    code: "",
    iconUrl: "",
    longcode: ""
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

  const fetchBanks = useCallback(async (currentPage: number) => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", currentPage.toString());
      queryParams.append("pageSize", pageSize.toString());
      queryParams.append("sortBy", "name:asc");
      
      if (searchQuery.trim()) {
        queryParams.append("search", searchQuery.trim());
      }

      const url = getApiUrl(`/v1/banks?${queryParams.toString()}`);
      const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });

      if (res.status === 401) {
        localStorage.removeItem("esave_token");
        window.location.href = "/dashboard/workflow";
        return;
      }

      const responseJson = await res.json();
      if (!res.ok) throw new Error(responseJson.message || responseJson.description || "Failed to fetch banks");

      const payload: PageDto<BankDto> = responseJson.data;
      setBanks(payload.data || []);
      setHasNext(payload.hasNext);
      setTotal(payload.total || 0);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchBanks(page);
  }, [page, fetchBanks]);

  const handleSearch = () => {
    if (page === 1) {
      fetchBanks(1);
    } else {
      setPage(1);
    }
  };

  const handleOpenAdd = () => {
    setEditingBank(null);
    setFormData({ name: "", code: "", iconUrl: "", longcode: "" });
    setFormError("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (bank: BankDto) => {
    setEditingBank(bank);
    setFormData({
      name: bank.name || "",
      code: bank.code || "",
      iconUrl: bank.iconUrl || "",
      longcode: bank.longcode || ""
    });
    setFormError("");
    setIsFormOpen(true);
  };

  const handleSaveBank = async () => {
    if (!formData.name || !formData.code) {
      setFormError("Name and Code are required.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const url = editingBank 
        ? getApiUrl(`/v1/banks/${editingBank.id}`)
        : getApiUrl(`/v1/banks`);
        
      const method = editingBank ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(formData)
      });

      if (res.status === 401) {
        localStorage.removeItem("esave_token");
        window.location.href = "/dashboard/workflow";
        return;
      }

      const responseJson = await res.json();
      if (!res.ok) throw new Error(responseJson.message || responseJson.description || "Failed to save bank");

      setIsFormOpen(false);
      fetchBanks(page);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (bank: BankDto) => {
    setBankToDelete(bank);
    setIsDeleteOpen(true);
  };

  const handleDeleteBank = async () => {
    if (!bankToDelete) return;
    setIsSubmitting(true);
    setFormError("");

    try {
      const res = await fetch(getApiUrl(`/v1/banks/${bankToDelete.id}`), {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (res.status === 401) {
        localStorage.removeItem("esave_token");
        window.location.href = "/dashboard/workflow";
        return;
      }

      const responseJson = await res.json();
      if (!res.ok) throw new Error(responseJson.message || responseJson.description || "Failed to delete bank");

      setIsDeleteOpen(false);
      fetchBanks(page);
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
          <h2 className="text-xl font-bold text-gray-900">Bank Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage supported banks, their routing codes, and capabilities.</p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add New Bank
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
                placeholder="Search by bank name or code..." 
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
            Total Banks: {total}
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-400 h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary/60 mb-4" />
              <p>Loading banks...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-12 text-center text-red-500 h-full flex flex-col items-center justify-center">
              <p>{errorMsg}</p>
              <Button onClick={() => fetchBanks(page)} variant="outline" className="mt-4">Retry</Button>
            </div>
          ) : banks.length === 0 ? (
            <div className="p-12 text-center text-gray-500 h-full flex flex-col items-center justify-center">
              <Building2 className="w-12 h-12 text-gray-200 mb-3 mx-auto" />
              <p>No banks found.</p>
              <Button onClick={handleOpenAdd} variant="link" className="mt-2">Add the first bank</Button>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">Bank</th>
                  <th className="px-6 py-4 font-semibold">Code</th>
                  <th className="px-6 py-4 font-semibold">Longcode</th>
                  <th className="px-6 py-4 font-semibold text-center">Transfer</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {banks.map((bank) => (
                  <tr key={bank.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
                          {bank.iconUrl ? (
                            <img src={bank.iconUrl} alt={bank.name} className="w-full h-full object-contain p-1" />
                          ) : (
                            <Building2 className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <span className="font-semibold text-gray-900">{bank.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">{bank.code || "-"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-gray-500">{bank.longcode || "-"}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {bank.supportsTransfer ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {bank.active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                          <XCircle className="w-3.5 h-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block text-left" onClick={e => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                            setOpenDropdownId(openDropdownId === bank.id ? null : bank.id);
                          }} 
                          className="text-gray-500 hover:text-gray-900 rounded-full h-8 w-8 p-0"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </Button>

                        {openDropdownId === bank.id && (
                          <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-[60] flex flex-col text-left">
                            <button 
                              onClick={() => { setOpenDropdownId(null); handleOpenEdit(bank); }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => { setOpenDropdownId(null); confirmDelete(bank); }}
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
        {!isLoading && banks.length > 0 && (
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
                {editingBank ? "Edit Bank" : "Add New Bank"}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md">
                  {formError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Bank Name *</label>
                <Input 
                  placeholder="e.g. Guaranty Trust Bank" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Bank Code *</label>
                <Input 
                  placeholder="e.g. 058" 
                  value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Longcode</label>
                <Input 
                  placeholder="e.g. 058152036" 
                  value={formData.longcode} 
                  onChange={e => setFormData({...formData, longcode: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Icon URL</label>
                <Input 
                  placeholder="https://example.com/logo.png" 
                  value={formData.iconUrl} 
                  onChange={e => setFormData({...formData, iconUrl: e.target.value})} 
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Note: Activation and Transfer capability flags are controlled internally by the core system and cannot be manually overridden here.
              </p>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSaveBank} disabled={isSubmitting} className="bg-primary text-white">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingBank ? "Save Changes" : "Create Bank"}
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
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">Delete Bank?</h3>
            <p className="text-sm text-center text-gray-500 mb-6">
              Are you sure you want to delete <strong>{bankToDelete?.name}</strong>? This action cannot be undone.
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
              <Button variant="destructive" className="flex-1" onClick={handleDeleteBank} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
