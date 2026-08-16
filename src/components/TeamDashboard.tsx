"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, ShieldCheck, Users, Unlock, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface AdminUserSummaryDto {
  id: string;
  phone: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  role: string;
  phoneVerified: boolean;
  locked: boolean;
  createdAt: string;
}

export interface PageDto<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

const ALL_SCOPES = [
  "Health",
  "Audit",
  "Rate",
  "Team",
  "Bank Management",
  "Payout",
  "Reconciliation"
];

export default function TeamDashboard() {
  const [admins, setAdmins] = useState<AdminUserSummaryDto[]>([]);
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
  const [editingAdminPhone, setEditingAdminPhone] = useState<string | null>(null);
  
  // Unlock Modal
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockPhone, setUnlockPhone] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState({ type: "", text: "" });

  // Dropdown state for actions kebab menu
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);
  
  // Form State
  const [formData, setFormData] = useState<{
    phone: string;
    scopes: string[];
  }>({
    phone: "",
    scopes: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const getESaveHeaders = () => {
    const token = localStorage.getItem("esave_token");
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "x-device-id": process.env.NEXT_PUBLIC_ESAVE_DEVICE || "web",
    };
  };

  const getESaveApiUrl = (path: string) => {
    const base = process.env.NEXT_PUBLIC_ESAVE_BASE || "";
    const cleanBase = base.replace(/\/$/, "");
    const cleanPath = path.replace(/^\//, "");
    return `${cleanBase}/${cleanPath}`;
  };

  const getPaperlessApiUrl = (path: string) => {
    // Standard paperless API
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
    const cleanBase = base.replace(/\/$/, "");
    const cleanPath = path.replace(/^\//, "");
    return `${cleanBase}/${cleanPath}`;
  };

  const fetchAdmins = useCallback(async (currentPage: number) => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", currentPage.toString());
      queryParams.append("pageSize", pageSize.toString());
      
      if (searchQuery.trim()) {
        queryParams.append("search", searchQuery.trim());
      }

      const res = await fetch(getESaveApiUrl(`/v1/admin/users/admins?${queryParams.toString()}`), {
        headers: getESaveHeaders(),
      });

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/dashboard/workflow";
          return;
        }
        throw new Error(`Failed to load admins (${res.status})`);
      }

      const json = await res.json();
      const responseData = json.data || json;
      
      setAdmins(Array.isArray(responseData.data) ? responseData.data : []);
      setTotal(responseData.total || 0);
      setHasNext(responseData.hasNext || false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load admins");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, pageSize]);

  useEffect(() => {
    fetchAdmins(page);
  }, [fetchAdmins, page]);

  const handleOpenCreate = () => {
    setEditingAdminPhone(null);
    setFormData({
      phone: "",
      scopes: [],
    });
    setFormError("");
    setFormSuccess("");
    setIsFormOpen(true);
  };

  const handleEdit = async (phone: string) => {
    setEditingAdminPhone(phone);
    setFormData({ phone, scopes: [] }); // default to empty until fetched
    setFormError("");
    setFormSuccess("");
    setIsFormOpen(true);

    try {
      const sessionToken = localStorage.getItem("token") || ""; 
      const res = await fetch(getPaperlessApiUrl(`/esave-scopes/${encodeURIComponent(phone)}`), {
        headers: { "Authorization": `Bearer ${sessionToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, scopes: data.scopes || [] }));
      }
    } catch (err) {
      console.error("Failed to fetch current scopes", err);
    }
  };

  const handleDelete = async (phone: string) => {
    if (!window.confirm(`Are you sure you want to remove admin privileges from ${phone}?`)) {
      return;
    }

    try {
      const res = await fetch(getESaveApiUrl(`/v1/admin/users/admins`), {
        method: "POST",
        headers: getESaveHeaders(),
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to remove admin");
      }

      // Also clear scopes in FINCALite just in case, though they are demoted.
      const sessionToken = localStorage.getItem("token") || ""; 
      await fetch(getPaperlessApiUrl(`/esave-scopes`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ phone, scopes: [] }),
      });

      fetchAdmins(page);
    } catch (err: any) {
      alert(err.message || "An error occurred");
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUnlocking(true);
    setUnlockMessage({ type: "", text: "" });

    try {
      const res = await fetch(getESaveApiUrl(`/v1/admin/users/unlock`), {
        method: "POST",
        headers: getESaveHeaders(),
        body: JSON.stringify({ phone: unlockPhone }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to unlock user");
      
      setUnlockMessage({ type: "success", text: "User unlocked successfully." });
      setTimeout(() => {
        setIsUnlockModalOpen(false);
        setUnlockPhone("");
        setUnlockMessage({ type: "", text: "" });
        fetchAdmins(page);
      }, 2000);
    } catch (err: any) {
      setUnlockMessage({ type: "error", text: err.message });
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleToggleScope = (scope: string) => {
    setFormData(prev => {
      const current = prev.scopes;
      if (current.includes(scope)) {
        return { ...prev, scopes: current.filter(s => s !== scope) };
      } else {
        return { ...prev, scopes: [...current, scope] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    setFormSuccess("");

    try {
      if (!formData.phone) {
        throw new Error("Phone number is required");
      }

      // Step 1: Promote in eSave
      const esaveRes = await fetch(getESaveApiUrl(`/v1/admin/users/admins`), {
        method: "POST",
        headers: getESaveHeaders(),
        body: JSON.stringify({ phone: formData.phone }),
      });

      if (!esaveRes.ok) {
        const errorData = await esaveRes.json().catch(() => null);
        throw new Error(errorData?.message || `eSave API Error: ${esaveRes.status}`);
      }

      // Step 2: Save scopes in Paperless
      const sessionToken = localStorage.getItem("token") || ""; 
      const paperlessRes = await fetch(getPaperlessApiUrl(`/esave-scopes`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ 
          phone: formData.phone,
          scopes: formData.scopes
        }),
      });

      if (!paperlessRes.ok) {
        const errorData = await paperlessRes.json().catch(() => null);
        console.error("Failed to save scopes in FINCALite:", errorData);
        throw new Error("Admin promoted in eSave, but failed to save navigation scopes in FINCALite.");
      }

      setFormSuccess(`Admin ${formData.phone} successfully added with ${formData.scopes.length} scopes.`);
      setFormData({ phone: "", scopes: [] });
      
      fetchAdmins(1);
      setPage(1);

      setTimeout(() => {
        setIsFormOpen(false);
      }, 2000);

    } catch (err: any) {
      setFormError(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatName = (admin: AdminUserSummaryDto) => {
    const parts = [admin.firstName, admin.middleName, admin.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "-";
  };

  return (
    <div className="space-y-6">
      {/* Top Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Team Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage admin access and navigation scopes.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsUnlockModalOpen(true)} 
            variant="outline"
            className="gap-2 shadow-sm shrink-0 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
          >
            <Unlock className="w-4 h-4" />
            Unlock User
          </Button>
          <Button onClick={handleOpenCreate} className="gap-2 shadow-sm shrink-0">
            <Plus className="w-4 h-4" />
            Add Admin
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
          <div className="text-sm font-medium text-gray-600">
            {total} Total Admins
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-primary/60 mb-4" />
              <p>Loading team members...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-12 text-center text-red-500">
              <p>{errorMsg}</p>
              <Button onClick={() => fetchAdmins(page)} variant="outline" className="mt-4">Retry</Button>
            </div>
          ) : admins.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>No admins found.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">Name</th>
                  <th className="px-6 py-4 font-semibold">Phone</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Created At</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {formatName(admin)}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                      {admin.phone}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {admin.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {admin.locked ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(admin.phone);
                          }}
                          className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Edit Scopes"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(admin.phone);
                          }}
                          className="p-1.5 rounded-md hover:bg-red-50 text-red-600 transition-colors"
                          title="Remove Admin"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit/Add Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingAdminPhone ? "Edit Admin Scopes" : "Add New Admin"}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {editingAdminPhone ? "Update the navigation scopes for this admin." : "Enter the phone number and select navigation scopes."}
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm font-medium">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm font-medium">
                  {formSuccess}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number *</label>
                <Input 
                  type="text" 
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="e.g. 08012345678"
                  disabled={isSubmitting || !!editingAdminPhone}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Navigation Scopes
                </label>
                <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                  {ALL_SCOPES.map(scope => (
                    <label key={scope} className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20 transition-colors"
                        checked={formData.scopes.includes(scope)}
                        onChange={() => handleToggleScope(scope)}
                        disabled={isSubmitting}
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{scope}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Selected paths will be visible in the admin's sidebar.
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Admin"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unlock User Modal */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-orange-50/50">
              <div className="flex items-center gap-2 text-orange-600 mb-1">
                <Unlock className="w-5 h-5" />
                <h3 className="text-lg font-bold">Unlock User</h3>
              </div>
              <p className="text-sm text-gray-500">
                Enter the user's phone number to remove their account lock.
              </p>
            </div>
            
            <form onSubmit={handleUnlock} className="p-6 space-y-4">
              {unlockMessage.text && (
                <div className={`p-3 rounded-md text-sm font-medium ${unlockMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                  {unlockMessage.text}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                <Input 
                  type="text" 
                  required
                  value={unlockPhone}
                  onChange={(e) => setUnlockPhone(e.target.value)}
                  placeholder="e.g. 08012345678"
                  disabled={isUnlocking}
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsUnlockModalOpen(false);
                    setUnlockMessage({ type: "", text: "" });
                    setUnlockPhone("");
                  }}
                  disabled={isUnlocking}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUnlocking} className="bg-orange-600 hover:bg-orange-700 text-white">
                  {isUnlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
