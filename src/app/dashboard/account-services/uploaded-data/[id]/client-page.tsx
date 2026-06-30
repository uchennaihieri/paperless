"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Database, Search } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";

type DatasetRecord = {
  id: string;
  reference: string;
  bvn: string | null;
  rowData: Record<string, any>;
  firstCentralRef: string | null;
  creditRegistryRef: string | null;
  processingStatus: string;
};

export default function UploadedDataDetailClientPage({ datasetId }: { datasetId: string }) {
  const { data: session } = useSession();
  const [records, setRecords] = useState<DatasetRecord[]>([]);
  const [dataset, setDataset] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchColumn, setSearchColumn] = useState("All");

  useEffect(() => {
    if ((session?.user as any)?.backendToken) fetchRecords();
  }, [session, datasetId]);

  const fetchRecords = async () => {
    try {
      const token = (session?.user as any)?.backendToken;
      const res = await fetch(`${BASE_URL}/api/v1/datasets/${datasetId}/records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setRecords(json.data);
        setDataset(json.dataset);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = React.useMemo(() => {
    if (!searchTerm) return records;
    const lowerQuery = searchTerm.toLowerCase();
    return records.filter(r => {
      if (searchColumn === "All") {
        return r.reference.toLowerCase().includes(lowerQuery) || 
               Object.values(r.rowData).some(v => String(v).toLowerCase().includes(lowerQuery));
      } else {
        const val = searchColumn === "DAT Reference" ? r.reference : r.rowData[searchColumn];
        return String(val || "").toLowerCase().includes(lowerQuery);
      }
    });
  }, [records, searchTerm, searchColumn]);

  // Extract dynamic column headers from all records to ensure CRM columns are included
  const dynamicHeaders = React.useMemo(() => {
    if (records.length === 0) return [];
    
    const originalKeys = Object.keys(records[0].rowData || {}).filter(k => 
      !["CRM Status", "Latest Feedback", "Last Caller", "Last Call Time"].includes(k)
    );
    
    const crmKeys = ["CRM Status", "Last Caller", "Last Call Time", "Latest Feedback"];
    const keysSet = new Set<string>();
    records.forEach(r => Object.keys(r.rowData || {}).forEach(k => keysSet.add(k)));
    
    const finalCrmKeys = crmKeys.filter(k => keysSet.has(k));
    return [...originalKeys, ...finalCrmKeys];
  }, [records]);

  return (
    <div className="w-full max-w-7xl mx-auto pb-12 space-y-6">
      <Link href="/dashboard/account-services/uploaded-data"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />Back to Datasets
      </Link>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[75vh]">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Dataset Records</h2>
            <p className="text-sm text-gray-500">View and search through your uploaded data rows.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={searchColumn}
              onChange={(e) => setSearchColumn(e.target.value)}
              className="py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 bg-white max-w-[150px] truncate"
            >
              <option value="All">All Columns</option>
              <option value="DAT Reference">DAT Reference</option>
              {dynamicHeaders.map(header => (
                <option key={header} value={header}>{header}</option>
              ))}
            </select>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder={searchColumn === "All" ? "Search data..." : `Search ${searchColumn}...`}
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            </div>
          ) : records.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-gray-400">
               <Database className="w-10 h-10 text-gray-300 mb-3" />
               <p className="font-medium">No records found</p>
             </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white sticky top-0 z-20 shadow-sm">
                <tr className="text-gray-600 text-[11px] uppercase tracking-widest">
                  <th className="px-4 py-3 font-semibold border-b border-r border-gray-200 bg-gray-50 sticky left-0 z-30 shadow-[1px_0_0_0_#e5e7eb]">DAT Reference</th>
                  {dynamicHeaders.map(header => (
                    <th key={header} className="px-4 py-3 font-semibold border-b border-gray-200">{header}</th>
                  ))}
                  {dataset?.runFirstCentral && <th className="px-4 py-3 font-semibold border-b border-gray-200">FirstCentral Ref</th>}
                  {dataset?.runCreditRegistry && <th className="px-4 py-3 font-semibold border-b border-gray-200">CreditRegistry Ref</th>}
                  <th className="px-4 py-3 font-semibold border-b border-gray-200">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredRecords.map(record => (
                  <tr key={record.id} className="hover:bg-teal-50/30 transition-colors">
                    <td className="px-4 py-2 border-r border-gray-200 font-medium text-teal-700 bg-white sticky left-0 z-10 shadow-[1px_0_0_0_#e5e7eb]">
                      {record.reference}
                    </td>
                    {dynamicHeaders.map(header => (
                      <td key={header} className="px-4 py-2 text-gray-700">
                        {String(record.rowData[header] ?? "")}
                      </td>
                    ))}
                    {dataset?.runFirstCentral && <td className="px-4 py-2 text-gray-500">{record.firstCentralRef || "-"}</td>}
                    {dataset?.runCreditRegistry && <td className="px-4 py-2 text-gray-500">{record.creditRegistryRef || "-"}</td>}
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                        record.processingStatus === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                        record.processingStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {record.processingStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
