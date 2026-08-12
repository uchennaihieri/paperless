"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Search, RefreshCw, FileJson, CheckCircle2, XCircle, Activity, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Enum Mirrors
export enum AuditActorType {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
  ANONYMOUS = 'ANONYMOUS',
}

export enum AuditStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

// Interfaces
export interface AuditLogDto {
  id: string;
  actorType: AuditActorType;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  targetUserId: string | null;
  status: AuditStatus;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  metadata: Record<string, any> | null;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  error: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageDto<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  extra?: Record<string, any>;
}

export default function AuditLogDashboard() {
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const pageSize = 100;
  const [hasNext, setHasNext] = useState(false);
  const [total, setTotal] = useState(0);
  
  const [filterAction, setFilterAction] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterActorType, setFilterActorType] = useState<string>("ALL");

  // Modal State
  const [selectedLog, setSelectedLog] = useState<AuditLogDto | null>(null);

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

  const fetchLogs = useCallback(async (currentPage: number) => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", currentPage.toString());
      queryParams.append("pageSize", pageSize.toString());
      
      if (filterAction.trim()) queryParams.append("action", filterAction.trim());
      if (filterStatus !== "ALL") queryParams.append("status", filterStatus);
      if (filterActorType !== "ALL") queryParams.append("actorType", filterActorType);

      const url = getApiUrl(`/v1/admin/audit-logs?${queryParams.toString()}`);

      const res = await fetch(url, {
        headers: getHeaders(),
        cache: "no-store",
      });

      if (res.status === 401) {
        localStorage.removeItem("esave_token");
        window.location.href = "/dashboard/workflow";
        return;
      }

      const responseJson = await res.json();
      if (!res.ok) throw new Error(responseJson.message || responseJson.description || "Failed to fetch audit logs");

      // Extract the PageDto from the GenericResponseDto wrapper
      const payload: PageDto<AuditLogDto> = responseJson.data;
      
      setLogs(payload.data || []);
      setHasNext(payload.hasNext);
      setTotal(payload.total);
      
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [filterAction, filterStatus, filterActorType]);

  useEffect(() => {
    fetchLogs(page);
  }, [page, fetchLogs]);

  // Handle Search trigger
  const handleSearch = () => {
    if (page === 1) {
      fetchLogs(1);
    } else {
      setPage(1); // this will trigger the useEffect
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Card (Consistent with Rates) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">System Audit Logs</h2>
          <p className="text-sm text-gray-500 mt-1">Review administrative actions and system events.</p>
        </div>
        <Button onClick={() => fetchLogs(page)} variant="outline" className="flex items-center gap-2 border-gray-200">
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-gray-50/50">
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search action (e.g. LOGIN)" 
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9 bg-white border-gray-200 focus-visible:ring-primary/20"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
              <select 
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              >
                <option value="ALL">All Statuses</option>
                <option value={AuditStatus.SUCCESS}>Success</option>
                <option value={AuditStatus.FAILURE}>Failure</option>
              </select>
            </div>

            {/* Actor Type Filter */}
            <div className="flex items-center gap-2">
              <select 
                value={filterActorType}
                onChange={(e) => {
                  setFilterActorType(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              >
                <option value="ALL">All Actors</option>
                <option value={AuditActorType.USER}>User</option>
                <option value={AuditActorType.ADMIN}>Admin</option>
                <option value={AuditActorType.SYSTEM}>System</option>
                <option value={AuditActorType.ANONYMOUS}>Anonymous</option>
              </select>
            </div>
            
            <Button onClick={handleSearch} className="bg-primary text-white hover:bg-primary/90">
              Apply
            </Button>
          </div>

          <div className="text-sm text-gray-500 font-medium bg-white px-3 py-1.5 rounded-md border border-gray-200 shrink-0">
            Total Records: {total}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-400 h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary/60 mb-4" />
              <p>Loading audit logs...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-12 text-center text-red-500 h-full flex flex-col items-center justify-center">
              <p>{errorMsg}</p>
              <Button onClick={() => fetchLogs(page)} variant="outline" className="mt-4">Retry</Button>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-gray-500 h-full flex flex-col items-center justify-center">
              <Activity className="w-12 h-12 text-gray-200 mb-3 mx-auto" />
              <p>No audit logs found matching your criteria.</p>
              <Button 
                onClick={() => {
                  setFilterAction("");
                  setFilterStatus("ALL");
                  setFilterActorType("ALL");
                  setPage(1);
                }} 
                variant="link" 
                className="mt-2"
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">Timestamp</th>
                  <th className="px-6 py-4 font-semibold">Action</th>
                  <th className="px-6 py-4 font-semibold">Actor</th>
                  <th className="px-6 py-4 font-semibold">Resource</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-medium">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md text-xs border border-gray-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-gray-400 uppercase">{log.actorType}</span>
                        <span className="text-sm truncate max-w-[150px]" title={log.actorId || "N/A"}>
                          {log.actorId || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                       <div className="flex flex-col">
                        <span className="font-semibold text-xs text-gray-400 uppercase">{log.resourceType || "N/A"}</span>
                        <span className="text-sm truncate max-w-[150px]" title={log.resourceId || "N/A"}>
                          {log.resourceId || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {log.status === AuditStatus.SUCCESS ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                          <XCircle className="w-3.5 h-3.5" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <FileJson className="w-4 h-4 mr-2" /> Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination Footer */}
        {!isLoading && logs.length > 0 && (
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
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
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

      {/* Deep Dive Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gray-50/50">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  Log Inspection
                  <span className="text-sm font-mono font-medium text-gray-500 bg-gray-200/50 px-2 py-0.5 rounded">
                    {selectedLog.id}
                  </span>
                </h3>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm font-semibold text-gray-700 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                    {selectedLog.action}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDate(selectedLog.createdAt)}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedLog(null)} className="rounded-full hover:bg-gray-200">
                <XCircle className="w-5 h-5 text-gray-500" />
              </Button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-white space-y-6">
              
              {/* Context Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Actor Type</span>
                  <span className="text-sm font-medium text-gray-900">{selectedLog.actorType}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Actor ID</span>
                  <span className="text-sm font-medium text-gray-900 truncate block" title={selectedLog.actorId || ""}>
                    {selectedLog.actorId || "N/A"}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">IP Address</span>
                  <span className="text-sm font-medium text-gray-900">{selectedLog.ipAddress || "N/A"}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Status</span>
                  <span className={`text-sm font-bold ${selectedLog.status === AuditStatus.SUCCESS ? "text-emerald-600" : "text-red-600"}`}>
                    {selectedLog.status}
                  </span>
                </div>
              </div>

              {/* Payload Diff Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" /> Before State
                  </h4>
                  <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto min-h-[120px] shadow-inner">
                    <pre className="text-xs text-emerald-400 font-mono leading-relaxed">
                      {selectedLog.before ? JSON.stringify(selectedLog.before, null, 2) : "// No prior state"}
                    </pre>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" /> After State
                  </h4>
                  <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto min-h-[120px] shadow-inner">
                    <pre className="text-xs text-emerald-400 font-mono leading-relaxed">
                      {selectedLog.after ? JSON.stringify(selectedLog.after, null, 2) : "// No new state"}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Metadata / Error Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-2">Metadata</h4>
                    <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto shadow-inner">
                      <pre className="text-xs text-blue-400 font-mono leading-relaxed">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {selectedLog.error && Object.keys(selectedLog.error).length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-red-600 mb-2">Error Payload</h4>
                    <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto shadow-inner border border-red-900/50">
                      <pre className="text-xs text-red-400 font-mono leading-relaxed">
                        {JSON.stringify(selectedLog.error, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedLog(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
