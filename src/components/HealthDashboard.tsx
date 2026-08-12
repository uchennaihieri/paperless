"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, Server, Database, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HealthCheckDetails {
  status: "up" | "down";
  [key: string]: any;
}

interface TerminusResponse {
  status: "ok" | "error" | "shutting_down";
  info?: Record<string, HealthCheckDetails>;
  error?: Record<string, HealthCheckDetails>;
  details?: Record<string, HealthCheckDetails>;
}

interface ServiceHealth {
  name: string;
  endpoint: string;
  icon: any;
  status: "loading" | "up" | "down";
  latencyMs: number | null;
  data: TerminusResponse | null;
  errorMessage?: string;
}

export default function HealthDashboard() {
  const [services, setServices] = useState<ServiceHealth[]>([
    {
      name: "E-Save Core Backend",
      endpoint: "/health",
      icon: Server,
      status: "loading",
      latencyMs: null,
      data: null,
    },
    {
      name: "FINCA Savings Integration",
      endpoint: "/health/finca-savings",
      icon: Database,
      status: "loading",
      latencyMs: null,
      data: null,
    },
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
    // Remove trailing slash from base if present, and remove leading slash from path to prevent double slashes
    const cleanBase = base.replace(/\/$/, "");
    const cleanPath = path.replace(/^\//, "");
    return `${cleanBase}/${cleanPath}`;
  };

  const runDiagnostics = useCallback(async () => {
    setIsRefreshing(true);
    
    const updatedServices = await Promise.all(
      services.map(async (service) => {
        const startTime = performance.now();
        try {
          const res = await fetch(getApiUrl(service.endpoint), {
            headers: getHeaders(),
            cache: "no-store",
          });
          
          const endTime = performance.now();
          const latencyMs = Math.round(endTime - startTime);

          if (res.status === 401) {
            localStorage.removeItem("esave_token");
            window.location.href = "/dashboard/workflow";
            return { ...service, status: "down", latencyMs, errorMessage: "Unauthorized" } as ServiceHealth;
          }

          // The backend wraps responses in a generic format, so terminus data is in data.data
          const responseJson = await res.json();
          const payload: TerminusResponse = responseJson.data || responseJson;
          
          return {
            ...service,
            status: payload.status === "ok" ? "up" : "down",
            latencyMs,
            data: payload,
            errorMessage: payload.status === "ok" ? undefined : "Service reported error state",
          } as ServiceHealth;

        } catch (err: any) {
          const endTime = performance.now();
          return {
            ...service,
            status: "down",
            latencyMs: Math.round(endTime - startTime),
            data: null,
            errorMessage: err.message || "Network Error",
          } as ServiceHealth;
        }
      })
    );

    setServices(updatedServices);
    setLastUpdated(new Date());
    setIsRefreshing(false);
  }, [services]);

  // Initial fetch
  useEffect(() => {
    runDiagnostics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh interval (5 minutes = 300,000 ms)
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      runDiagnostics();
    }, 300000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, runDiagnostics]);

  // Aggregate Status
  const isFullyLoading = services.every((s) => s.status === "loading");
  const isAllOperational = !isFullyLoading && services.every((s) => s.status === "up");
  const isPartialOutage = !isFullyLoading && !isAllOperational && services.some((s) => s.status === "up");

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className={`rounded-xl p-8 shadow-sm border flex flex-col md:flex-row items-center justify-between gap-6 transition-colors duration-500 ${
        isFullyLoading ? "bg-gray-50 border-gray-200" 
        : isAllOperational ? "bg-emerald-50 border-emerald-200"
        : isPartialOutage ? "bg-amber-50 border-amber-200"
        : "bg-red-50 border-red-200"
      }`}>
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-full ${
            isFullyLoading ? "bg-gray-200 text-gray-500"
            : isAllOperational ? "bg-emerald-100 text-emerald-600"
            : isPartialOutage ? "bg-amber-100 text-amber-600"
            : "bg-red-100 text-red-600"
          }`}>
            {isFullyLoading ? <Activity className="w-8 h-8 animate-pulse" />
            : isAllOperational ? <CheckCircle className="w-8 h-8" />
            : <AlertTriangle className="w-8 h-8" />}
          </div>
          <div>
            <h1 className={`text-3xl font-bold tracking-tight ${
              isFullyLoading ? "text-gray-900"
              : isAllOperational ? "text-emerald-900"
              : isPartialOutage ? "text-amber-900"
              : "text-red-900"
            }`}>
              {isFullyLoading ? "Checking Systems..."
              : isAllOperational ? "All Systems Operational"
              : isPartialOutage ? "Partial System Outage"
              : "Major System Outage"}
            </h1>
            <p className={`mt-1 text-sm font-medium ${
              isFullyLoading ? "text-gray-500"
              : isAllOperational ? "text-emerald-700"
              : isPartialOutage ? "text-amber-700"
              : "text-red-700"
            }`}>
              {lastUpdated 
                ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
                : "Awaiting initial diagnostics..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-4 bg-white/50 px-3 py-1.5 rounded-full border border-black/5">
            <span className="text-sm font-medium text-gray-700">Auto-refresh (5m)</span>
            <button 
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`w-10 h-5 rounded-full relative transition-colors ${autoRefresh ? "bg-primary" : "bg-gray-300"}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${autoRefresh ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
          <Button 
            onClick={runDiagnostics} 
            disabled={isRefreshing}
            className="bg-white text-gray-900 hover:bg-gray-50 border border-gray-200 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Running..." : "Run Diagnostics"}
          </Button>
        </div>
      </div>

      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {services.map((service, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <service.icon className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{service.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      service.status === "loading" ? "bg-gray-50 text-gray-500 border-gray-200"
                      : service.status === "up" ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                      : "bg-red-50 text-red-600 border-red-200"
                    }`}>
                      {service.status === "loading" ? (
                        <Activity className="w-3.5 h-3.5 animate-spin" />
                      ) : service.status === "up" ? (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          Operational
                        </>
                      ) : (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                          Down
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50/50 flex-1 flex flex-col justify-center">
              {service.status === "loading" ? (
                <div className="flex items-center justify-center text-gray-400 py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Response Latency</span>
                    <div className="flex items-center gap-1.5 font-mono text-sm font-semibold text-gray-900">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {service.latencyMs} ms
                    </div>
                  </div>
                  
                  {service.status === "down" && service.errorMessage && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-md text-sm text-red-700">
                      <span className="font-semibold block mb-1">Error Details:</span>
                      {service.errorMessage}
                    </div>
                  )}

                  {/* Expanded JSON details if available (Terminus `details` or `error` object) */}
                  {service.data && (service.data.details || service.data.error) && (
                    <div className="mt-4">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                        Health Node Details
                      </span>
                      <div className="bg-gray-900 rounded-md p-3 overflow-x-auto">
                        <pre className="text-[11px] text-emerald-400 font-mono leading-relaxed">
                          {JSON.stringify(service.data.details || service.data.error, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
