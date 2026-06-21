"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Loader2, UserPlus, CheckCircle2, X, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";

export default function SwapDelegateModal({
  open,
  onOpenChange,
  originalUserId,
  originalUserName,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalUserId: number;
  originalUserName: string;
  onSuccess?: () => void;
}) {
  const { data: session } = useSession();
  const token = (session?.user as any)?.backendToken;
  
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const [existingDelegation, setExistingDelegation] = useState<any | null>(null);
  const [checkingDelegation, setCheckingDelegation] = useState(false);

  const checkExistingDelegation = useCallback(async () => {
    if (!originalUserId || !token) return;
    setCheckingDelegation(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/delegations/user/${originalUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Find the first pending or active delegation given by this user
        const activeOrPending = data.data.given.find((d: any) => ["Pending", "Active"].includes(d.status));
        setExistingDelegation(activeOrPending || null);
      }
    } catch (err) {
      console.error("Failed to check delegation", err);
    } finally {
      setCheckingDelegation(false);
    }
  }, [originalUserId, token]);

  useEffect(() => {
    if (open) {
      setSearch("");
      setResults([]);
      setSelectedUser(null);
      checkExistingDelegation();
    } else {
      setExistingDelegation(null);
    }
  }, [open, checkExistingDelegation]);

  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api/v1/workflow/search-users?q=${encodeURIComponent(search)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          // Filter out the original user themselves
          setResults(data.data.filter((u: any) => u.finca_email !== originalUserName)); 
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [search, originalUserName, token]);

  const handleSubmit = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const response = await fetch(`${BASE_URL}/api/v1/delegations`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          originalUserId,
          delegateUserId: selectedUser.id,
          initiatedBy: "User"
        })
      });
      const res = await response.json();
      
      if (res.success) {
        onSuccess?.();
        // Rather than closing, we can refresh to show the new delegation
        checkExistingDelegation();
        setSelectedUser(null);
        setSearch("");
      } else {
        alert(res.error || "Failed to delegate.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevert = async () => {
    if (!existingDelegation) return;
    setSubmitting(true);
    try {
      const response = await fetch(`${BASE_URL}/api/v1/delegations/${existingDelegation.id}/revert`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setExistingDelegation(null);
        onSuccess?.();
      } else {
        alert(data.error || "Failed to revert.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Delegate Work</h3>
            <p className="text-sm text-gray-500 mt-1">Manage who can process your forms.</p>
          </div>
          <button 
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {checkingDelegation ? (
            <div className="py-8 flex flex-col items-center justify-center text-gray-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Loading...</p>
            </div>
          ) : existingDelegation ? (
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 text-center">
                <CheckCircle2 className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-indigo-900 mb-1">
                  Active Delegation
                </h4>
                <p className="text-xs text-indigo-700 mb-4">
                  You have currently delegated your workflow to <strong>{existingDelegation.delegateUser?.user_name || "a user"}</strong>.
                  <br />
                  <span className="opacity-80">Status: {existingDelegation.status}</span>
                </p>
                <button
                  onClick={handleRevert}
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-white border border-indigo-200 text-indigo-600 text-sm font-semibold rounded-lg hover:bg-indigo-100 hover:border-indigo-300 transition-colors flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Revert Delegation
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {!selectedUser ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                    />
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {loading ? (
                      <div className="py-4 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Searching...
                      </div>
                    ) : results.length > 0 ? (
                      results.map((u, i) => (
                        <div
                          key={i}
                          onClick={() => setSelectedUser(u)}
                          className="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-medium mr-3 shrink-0">
                            {u.user_name?.charAt(0) || u.finca_email?.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{u.user_name}</p>
                            <p className="text-xs text-gray-500 truncate">{u.finca_email}</p>
                          </div>
                        </div>
                      ))
                    ) : search.length >= 2 ? (
                      <div className="py-4 text-center text-sm text-gray-500">No users found.</div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-start">
                  <div className="mt-0.5 mr-3 text-indigo-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-indigo-900">Selected Delegate</p>
                    <p className="text-sm text-indigo-700 truncate">{selectedUser.user_name}</p>
                    <p className="text-xs text-indigo-500 truncate">{selectedUser.finca_email}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 underline shrink-0"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {existingDelegation ? "Close" : "Cancel"}
          </button>
          {!existingDelegation && (
            <button
              onClick={handleSubmit}
              disabled={!selectedUser || submitting || checkingDelegation}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Send Request
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
