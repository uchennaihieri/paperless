"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Search, PhoneCall, ChevronLeft, Send, CheckCircle, Clock, AlertCircle, ShieldCheck, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

interface CrmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  "Open": "bg-green-100 text-green-700 hover:bg-green-200",
  "In Progress": "bg-amber-100 text-amber-700 hover:bg-amber-200",
  "Closed": "bg-red-100 text-red-700 hover:bg-red-200",
};

export function CrmModal({ isOpen, onClose }: CrmModalProps) {
  const { data: session } = useSession();

  // Views
  const [view, setView] = useState<"select" | "grid" | "timeline">("select");
  const [landingTab, setLandingTab] = useState<"working-list" | "quick-lookup">("working-list");

  // Source Selection
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");

  // Grid
  const [records, setRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [phoneColumnKey, setPhoneColumnKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Status Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [activePhone, setActivePhone] = useState("");
  const [activeRecordId, setActiveRecordId] = useState("");
  const [tempStatus, setTempStatus] = useState("Open");
  const [feedbackOption, setFeedbackOption] = useState("");
  const [feedbackDetails, setFeedbackDetails] = useState("");
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Timeline
  const [selectedPhone, setSelectedPhone] = useState("");
  const [interactions, setInteractions] = useState<any[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const [readOnlyProfile, setReadOnlyProfile] = useState(false);

  // Quick Lookup
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState<string[]>([]);
  const [isSearchingLookup, setIsSearchingLookup] = useState(false);

  // Fetch Datasets
  useEffect(() => {
    if (isOpen && view === "select") {
      fetchDatasets();
    }
  }, [isOpen, view]);

  const fetchDatasets = async () => {
    setLoadingDatasets(true);
    try {
      const res = await fetch("/api/v1/datasets");
      const json = await res.json();
      if (json.success) setDatasets(json.data);
    } catch (e) {
      console.error(e);
    }
    setLoadingDatasets(false);
  };

  const loadWorkingList = async () => {
    if (!selectedDatasetId) return;
    setLoadingRecords(true);
    setView("grid");
    setSearchQuery("");

    try {
      const res = await fetch(`/api/v1/datasets/${selectedDatasetId}/records`);
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setRecords(json.data);
        const firstRowKeys = Object.keys(json.data[0].rowData || {});
        const phoneKey = firstRowKeys.find(k =>
          k.toLowerCase().includes("phone") ||
          k.toLowerCase().includes("mobile") ||
          k.toLowerCase().includes("contact")
        );
        setPhoneColumnKey(phoneKey || null);
      } else {
        setRecords([]);
        setPhoneColumnKey(null);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingRecords(false);
  };

  const openStatusModal = (phone: string, recordId: string, currentStatus: string) => {
    setActivePhone(phone);
    setActiveRecordId(recordId);
    setTempStatus(currentStatus || "Open");
    setFeedbackOption("");
    setFeedbackDetails("");
    setStatusModalOpen(true);
  };

  const submitStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalFeedback = tempStatus === "Closed"
      ? [feedbackOption, feedbackDetails].filter(Boolean).join(" - ")
      : "";

    if (tempStatus === "Closed" && !finalFeedback.trim()) return;

    setSubmittingStatus(true);
    try {
      const res = await fetch("/api/v1/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerPhone: activePhone,
          sourceType: "UPLOADED_DATA",
          sourceId: activeRecordId,
          feedbackText: finalFeedback,
          status: tempStatus,
          loggedByEmail: session?.user?.email || "Unknown",
          loggedByName: session?.user?.name || "Unknown User"
        })
      });
      const json = await res.json();
      if (res.ok && json.updatedRecord) {
        setRecords(prev => prev.map(r => r.id === json.updatedRecord.id ? json.updatedRecord : r));
        setStatusModalOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
    setSubmittingStatus(false);
  };

  const openProfile = async (phone: string, readOnly = false) => {
    setSelectedPhone(phone);
    setReadOnlyProfile(readOnly);
    setView("timeline");
    setLoadingInteractions(true);

    try {
      const res = await fetch(`/api/v1/crm/${encodeURIComponent(phone)}`);
      const data = await res.json();
      setInteractions(data);
    } catch (e) {
      console.error(e);
    }
    setLoadingInteractions(false);
  };

  // Lookup Effect
  useEffect(() => {
    if (lookupQuery.length < 3) {
      setLookupResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      setIsSearchingLookup(true);
      try {
        const res = await fetch(`/api/v1/crm/search?q=${encodeURIComponent(lookupQuery)}`);
        const json = await res.json();
        setLookupResults(Array.isArray(json) ? json : []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingLookup(false);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [lookupQuery]);

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records;
    const lowerQuery = searchQuery.toLowerCase();
    return records.filter(r => JSON.stringify(r.rowData).toLowerCase().includes(lowerQuery));
  }, [records, searchQuery]);

  const allColumns = useMemo(() => {
    if (records.length === 0) return [];

    // Original uploaded keys
    const originalKeys = Object.keys(records[0].rowData || {}).filter(k =>
      !["CRM Status", "Latest Feedback", "Last Caller", "Last Call Time"].includes(k)
    );

    // Guarantee injected CRM keys appear at the end
    const crmKeys = ["CRM Status", "Last Caller", "Last Call Time", "Latest Feedback"];

    // Check if any record actually has the CRM keys populated, otherwise we don't necessarily need to render empty columns
    // But since we want consistent grid extension, we will just render them if they exist in ANY record.
    const keysSet = new Set<string>();
    records.forEach(r => Object.keys(r.rowData || {}).forEach(k => keysSet.add(k)));

    const finalCrmKeys = crmKeys.filter(k => keysSet.has(k));

    return [...originalKeys, ...finalCrmKeys];
  }, [records]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden relative">

        {/* Header */}
        <div className="h-16 shrink-0 border-b border-gray-100 flex items-center justify-between px-6 bg-white gap-4">
          <div className="flex items-center gap-3 shrink-0">
            {view === "grid" && (
              <button onClick={() => setView("select")} className="mr-2 p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors flex items-center justify-center" title="Back to Lists">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <h2 className="text-lg font-bold text-gray-900">Mini CRM</h2>
              <p className="text-xs text-gray-500">Call Logs & Customer Feedback</p>
            </div>
          </div>

          {view === "grid" && (
            <div className="flex-1 max-w-md mx-auto w-full relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search any value..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-gray-50"
              />
            </div>
          )}

          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-hidden relative bg-gray-50/50">

          {/* VIEW A: SOURCE SELECTION & QUICK LOOKUP */}
          {view === "select" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[360px]">

                <div className="flex border-b border-gray-200 bg-gray-50/50">
                  <button
                    onClick={() => setLandingTab("working-list")}
                    className={cn("flex-1 py-3 text-sm font-semibold border-b-2 transition-colors", landingTab === "working-list" ? "border-primary text-primary bg-white" : "border-transparent text-gray-500 hover:text-gray-700")}
                  >
                    Working Lists
                  </button>
                  <button
                    onClick={() => setLandingTab("quick-lookup")}
                    className={cn("flex-1 py-3 text-sm font-semibold border-b-2 transition-colors", landingTab === "quick-lookup" ? "border-primary text-primary bg-white" : "border-transparent text-gray-500 hover:text-gray-700")}
                  >
                    Quick Lookup
                  </button>
                </div>

                <div className="p-8 flex-1 flex flex-col">
                  {landingTab === "working-list" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex-1 flex flex-col justify-center">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Working List</h3>
                      <p className="text-sm text-gray-500 mb-6">Choose a dataset to load into the CRM and start making calls.</p>
                      <div className="space-y-4">
                        <select
                          disabled={loadingDatasets}
                          value={selectedDatasetId}
                          onChange={(e) => setSelectedDatasetId(e.target.value)}
                          className="w-full h-11 border border-gray-300 rounded-lg px-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-gray-50"
                        >
                          <option value="">-- Select an Uploaded Dataset --</option>
                          {datasets.map(ds => <option key={ds.id} value={ds.id}>{ds.name} ({ds.totalRows} rows)</option>)}
                        </select>
                        <button
                          onClick={loadWorkingList}
                          disabled={!selectedDatasetId || loadingDatasets}
                          className="w-full h-11 bg-primary text-white rounded-lg font-medium shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                          {loadingDatasets ? "Loading..." : "Load CRM Workspace"}
                        </button>
                      </div>
                    </div>
                  )}

                  {landingTab === "quick-lookup" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 mt-4">Global Phone Lookup</h3>
                      <p className="text-sm text-gray-500 mb-6">Search for a customer's interaction history across all lists.</p>
                      <div className="relative text-left flex-1">
                        <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="e.g. 07038..."
                          value={lookupQuery}
                          onChange={(e) => setLookupQuery(e.target.value)}
                          className="w-full h-11 pl-10 pr-4 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-gray-50"
                        />

                        {lookupQuery.length >= 3 && (
                          <div className="absolute top-12 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden z-10 max-h-48 overflow-y-auto">
                            {isSearchingLookup ? (
                              <div className="p-4 text-center text-xs text-gray-500">Searching...</div>
                            ) : lookupResults.length > 0 ? (
                              <ul className="divide-y divide-gray-100">
                                {lookupResults.map(phone => (
                                  <li key={phone}>
                                    <button
                                      onClick={() => openProfile(phone, true)}
                                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors flex items-center justify-between"
                                    >
                                      {phone}
                                      <ChevronLeft className="w-4 h-4 rotate-180 opacity-50" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="p-4 text-center text-xs text-gray-500">No interaction history found.</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* VIEW B: WORKING GRID */}
          {view === "grid" && (
            <div className="absolute inset-0 flex flex-col h-full animate-in slide-in-from-right-4 duration-300">

              {loadingRecords ? (
                <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
              ) : phoneColumnKey === null && records.length > 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center"><AlertCircle className="w-12 h-12 text-red-500 mb-2" /> <p>No Phone Column Found.</p></div>
              ) : (
                <div className="flex-1 bg-white p-6 flex flex-col min-h-0">
                  <div className="border border-gray-200 rounded-xl overflow-auto shadow-sm flex-1">
                    <table className="w-full text-left border-collapse text-sm min-w-max">
                      <thead className="sticky top-0 z-10 shadow-sm">
                        <tr className="bg-gray-50 text-gray-600 font-semibold">
                          <th className="p-3 whitespace-nowrap border-b border-gray-200">DAT Reference</th>
                          {allColumns.map(k => (
                            <th key={k} className="p-3 whitespace-nowrap border-b border-gray-200">
                              {k} {k === phoneColumnKey && <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">Key</span>}
                            </th>
                          ))}
                          <th className="p-3 w-[120px] min-w-[120px] max-w-[120px] text-center sticky right-[56px] bg-gray-50 z-20 border-b border-gray-200">Status</th>
                          <th className="p-3 w-[56px] min-w-[56px] max-w-[56px] text-center sticky right-0 bg-gray-50 z-20 border-b border-gray-200 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">Profile</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredRecords.map((r, idx) => {
                          const currentStatus = r.rowData["CRM Status"] || "Open";
                          const statusColor = STATUS_COLORS[currentStatus] || STATUS_COLORS["Open"];
                          const phoneNum = String(r.rowData[phoneColumnKey!]);

                          return (
                            <tr key={r.id} className="hover:bg-gray-50/80 transition-colors group">
                              <td className="p-3 text-gray-700 font-medium whitespace-nowrap">{r.reference}</td>
                              {allColumns.map(k => (
                                <td key={k} className="p-3 text-gray-700 whitespace-nowrap truncate max-w-[200px]" title={String(r.rowData[k] || "-")}>
                                  {String(r.rowData[k] || "-")}
                                </td>
                              ))}
                              <td className="p-2 w-[120px] min-w-[120px] max-w-[120px] text-center sticky right-[56px] bg-white group-hover:bg-gray-50/80 transition-colors">
                                <button
                                  onClick={() => openStatusModal(phoneNum, r.id, currentStatus)}
                                  className={cn("w-full py-1.5 px-2 text-xs font-semibold rounded-md shadow-sm transition-all", statusColor)}
                                >
                                  {currentStatus}
                                </button>
                              </td>
                              <td className="p-2 w-[56px] min-w-[56px] max-w-[56px] text-center sticky right-0 bg-white group-hover:bg-gray-50/80 transition-colors shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                                <button
                                  onClick={() => openProfile(phoneNum)}
                                  className="w-9 h-9 mx-auto flex items-center justify-center bg-gray-100 hover:bg-primary/10 hover:text-primary text-gray-600 rounded-md shadow-sm transition-all"
                                  title="View Customer Profile"
                                >
                                  <User className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW C: TIMELINE (Audit Trail Aesthetic) */}
          {view === "timeline" && (
            <div className="absolute inset-0 flex flex-col bg-gray-50 animate-in slide-in-from-right-4 duration-300">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                  <button onClick={() => setView(readOnlyProfile ? "select" : "grid")} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Interaction History: {selectedPhone}</h2>
                    <p className="text-xs text-gray-400">Full audit trail of customer interactions</p>
                  </div>
                </div>
              </div>

              {/* Timeline Content */}
              <div className="flex-1 overflow-auto p-6">
                {loadingInteractions ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-3">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm">Loading full history…</p>
                  </div>
                ) : interactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
                    <PhoneCall className="w-10 h-10 opacity-20" />
                    <p className="text-sm">No interaction events found</p>
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto space-y-6">
                    <div className="relative border-l-2 border-gray-200 ml-4 space-y-8">
                      {interactions.map((int, index) => {
                        const isLatest = index === 0; // The query orders desc
                        return (
                          <div key={int.id} className="relative pl-6">
                            <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white ${isLatest ? 'bg-primary' : 'bg-gray-300'}`}></div>
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">

                              <div className="flex items-start justify-between gap-4 mb-2">
                                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold", STATUS_COLORS[int.status] || "bg-gray-100 text-gray-600")}>
                                  {int.status}
                                </span>
                                <div className="text-xs text-gray-500 font-mono whitespace-nowrap">
                                  {new Date(int.createdAt).toLocaleString()}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                                <User className="w-4 h-4 text-gray-400" />
                                <span>
                                  <span className="font-medium text-gray-900">{int.loggedByName || "System"}</span>
                                </span>
                              </div>

                              {int.feedbackText && (
                                <div className="p-3 bg-gray-50 rounded text-sm text-gray-600 italic border border-gray-100">
                                  {int.feedbackText}
                                </div>
                              )}

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* STATUS UPDATE MODAL (Sub-modal) */}
        {statusModalOpen && (
          <div className="absolute inset-0 z-50 bg-gray-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Update Status</h3>
                <button onClick={() => setStatusModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={submitStatusUpdate} className="p-5 flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={tempStatus}
                    onChange={(e) => setTempStatus(e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                {tempStatus === "Closed" && (
                  <div className="animate-in slide-in-from-top-2 duration-200 flex flex-col gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Feedback</label>
                      <select
                        required
                        value={feedbackOption}
                        onChange={(e) => setFeedbackOption(e.target.value)}
                        className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                      >
                        <option value="">-- Select Feedback --</option>
                        <option value="Paid">Paid</option>
                        <option value="Promised to pay today">Promised to pay today</option>
                        <option value="Promised to pay tomorrow">Promised to pay tomorrow</option>
                        <option value="Wrong Contact">Wrong Contact</option>
                        <option value="Not Available">Not Available</option>
                        <option value="Did not pick">Did not pick</option>
                        <option value="Switched off">Switched off</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Details (Optional)</label>
                      <textarea
                        value={feedbackDetails}
                        onChange={(e) => setFeedbackDetails(e.target.value)}
                        placeholder="Additional details..."
                        className="w-full min-h-[80px] border border-gray-300 rounded-md p-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    submittingStatus ||
                    (tempStatus === "Closed" && !feedbackOption) ||
                    (tempStatus === (records.find(r => r.id === activeRecordId)?.rowData["CRM Status"] || "Open"))
                  }
                  className="mt-2 w-full h-10 bg-primary text-white font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submittingStatus ? "Saving..." : "Save Update"}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
