"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Loader2, Search, Percent, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Interfaces mirroring the backend DTOs
export interface InterestRatePolicy {
  id: string;
  minAmount: number;
  maxAmount?: number;
  minTenor: number;
  maxTenor?: number;
  rate: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InterestRatePolicyFormData {
  minAmount: number;
  maxAmount?: number;
  minTenor: number;
  maxTenor?: number;
  rate: number;
  description?: string;
}

export default function InterestRateDashboard() {
  const [policies, setPolicies] = useState<InterestRatePolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<InterestRatePolicy | null>(null);
  
  // Delete Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPolicy, setDeletingPolicy] = useState<InterestRatePolicy | null>(null);

  // Form State
  const [formData, setFormData] = useState<InterestRatePolicyFormData>({
    minAmount: 0,
    rate: 0,
    minTenor: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Helpers
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
    return `${base}${path}`;
  };

  // Fetch Policies
  const fetchPolicies = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(getApiUrl("/v1/interest-rate-policies"), {
        headers: getHeaders(),
        cache: "no-store",
      });
      
      if (res.status === 401) {
        localStorage.removeItem("esave_token");
        window.location.href = "/dashboard/workflow";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to fetch policies");
      
      // The backend wraps the paginated response in data.data
      const payloadData = data.data;
      const fetchedPolicies = Array.isArray(payloadData) 
        ? payloadData 
        : Array.isArray(payloadData?.data) 
          ? payloadData.data 
          : payloadData?.items || [];
      setPolicies(fetchedPolicies);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  // Modal Handlers
  const handleOpenCreate = () => {
    setEditingPolicy(null);
    setFormData({ minAmount: 0, rate: 0, minTenor: 0 });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (policy: InterestRatePolicy) => {
    setEditingPolicy(policy);
    setFormData({
      minAmount: policy.minAmount,
      maxAmount: policy.maxAmount,
      rate: policy.rate,
      minTenor: policy.minTenor,
      maxTenor: policy.maxTenor,
      description: policy.description || "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenDelete = (policy: InterestRatePolicy) => {
    setDeletingPolicy(policy);
    setIsDeleteModalOpen(true);
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    
    // Clean up empty optional numbers
    const payload: any = { ...formData };
    if (!payload.maxAmount) delete payload.maxAmount;
    if (!payload.maxTenor) delete payload.maxTenor;

    try {
      const url = editingPolicy 
        ? getApiUrl(`/v1/interest-rate-policies/${editingPolicy.id}`)
        : getApiUrl("/v1/interest-rate-policies");
      
      const method = editingPolicy ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        localStorage.removeItem("esave_token");
        window.location.href = "/dashboard/workflow";
        return;
      }
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to save policy");
      
      setIsModalOpen(false);
      fetchPolicies();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete
  const handleDelete = async () => {
    if (!deletingPolicy) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(getApiUrl(`/v1/interest-rate-policies/${deletingPolicy.id}`), {
        method: "DELETE",
        headers: getHeaders(),
      });
      
      if (res.status === 401) {
        localStorage.removeItem("esave_token");
        window.location.href = "/dashboard/workflow";
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || "Failed to delete policy");
      }
      setIsDeleteModalOpen(false);
      fetchPolicies();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPolicies = policies.filter(p => 
    p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.rate.toString().includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Top Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Interest Rate Policies</h2>
          <p className="text-sm text-gray-500 mt-1">Manage global interest rates and tenor conditions for E-Save.</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add New Policy
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search policies..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-gray-200 focus-visible:ring-primary/20"
            />
          </div>
          <div className="text-sm text-gray-500 font-medium bg-white px-3 py-1.5 rounded-md border border-gray-200">
            Total Policies: {policies.length}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-primary/60 mb-4" />
              <p>Loading policies...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-12 text-center text-red-500">
              <p>{errorMsg}</p>
              <Button onClick={fetchPolicies} variant="outline" className="mt-4">Retry</Button>
            </div>
          ) : filteredPolicies.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No interest rate policies found.</p>
              {searchQuery && <Button onClick={() => setSearchQuery("")} variant="link">Clear search</Button>}
            </div>
          ) : (
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">Rate</th>
                  <th className="px-6 py-4 font-semibold">Amount Range</th>
                  <th className="px-6 py-4 font-semibold">Tenor (Days)</th>
                  <th className="px-6 py-4 font-semibold">Description</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPolicies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-primary">
                        <Percent className="w-3.5 h-3.5" />
                        {policy.rate}%
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      ₦{policy.minAmount.toLocaleString()} {policy.maxAmount ? `- ₦${policy.maxAmount.toLocaleString()}` : '+'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {policy.minTenor} {policy.maxTenor ? `- ${policy.maxTenor}` : '+'} Days
                    </td>
                    <td className="px-6 py-4 text-gray-500 max-w-[200px] truncate">
                      {policy.description || "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenEdit(policy)}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          title="Edit Policy"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenDelete(policy)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Policy"
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

      {/* Creation / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingPolicy ? "Edit Interest Rate Policy" : "Add New Interest Rate Policy"}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {editingPolicy ? "Update the conditions for this policy." : "Define the rate and conditions for the new policy."}
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm font-medium">
                  {formError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Interest Rate (%) *</label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    type="number" 
                    step="0.01"
                    min="0"
                    required
                    value={formData.rate || ""}
                    onChange={(e) => setFormData({...formData, rate: parseFloat(e.target.value) || 0})}
                    className="pl-9"
                    placeholder="e.g. 5.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Min Amount (₦) *</label>
                  <Input 
                    type="number" 
                    min="0"
                    required
                    value={formData.minAmount || ""}
                    onChange={(e) => setFormData({...formData, minAmount: parseFloat(e.target.value) || 0})}
                    placeholder="e.g. 1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Max Amount (₦)</label>
                  <Input 
                    type="number" 
                    min="0"
                    value={formData.maxAmount || ""}
                    onChange={(e) => setFormData({...formData, maxAmount: e.target.value ? parseFloat(e.target.value) : undefined})}
                    placeholder="Optional limit"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Min Tenor (Days) *</label>
                  <Input 
                    type="number" 
                    min="0"
                    required
                    value={formData.minTenor || ""}
                    onChange={(e) => setFormData({...formData, minTenor: parseInt(e.target.value) || 0})}
                    placeholder="e.g. 30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Max Tenor (Days)</label>
                  <Input 
                    type="number" 
                    min="0"
                    value={formData.maxTenor || ""}
                    onChange={(e) => setFormData({...formData, maxTenor: e.target.value ? parseInt(e.target.value) : undefined})}
                    placeholder="Optional limit"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea 
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 min-h-[80px] resize-none"
                  placeholder="Internal note about this policy..."
                  value={formData.description || ""}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="pt-4 flex gap-3 justify-end border-t border-gray-100 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-primary text-white hover:bg-primary/90 px-6 whitespace-nowrap">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingPolicy ? "Save Changes" : "Create Policy"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Policy</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete this {deletingPolicy?.rate}% interest rate policy? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="w-full">
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDelete} 
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Delete"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
