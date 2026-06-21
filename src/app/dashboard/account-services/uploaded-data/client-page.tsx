"use client";

import React, { useState } from "react";
import { Upload, Search, X, ArrowLeft, Database } from "lucide-react";
import Link from "next/link";

export default function UploadedDataClientPage() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="w-full max-w-6xl mx-auto pb-12 space-y-6">
      <Link href="/dashboard/account-services"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />Extended Services
      </Link>

      {/* Hero */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-800 text-white rounded-2xl px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div>
          <h2 className="text-2xl font-bold">Uploaded Data</h2>
          <p className="text-sm text-white/70 mt-1">Upload and manage your custom data for use within workflows.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white/60 rounded-lg text-sm font-semibold cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />Upload Data
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search uploaded data..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <span className="text-xs text-gray-400 ml-auto">0 items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-900 text-white text-[10px] uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4 font-semibold">Reference</th>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Date Uploaded</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  <Database className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="font-medium">No uploaded data yet</p>
                  <p className="text-xs mt-1 text-gray-300">This feature is coming soon.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
