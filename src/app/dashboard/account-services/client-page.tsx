"use client";

import React, { useState } from "react";
import { Users, FileText, CheckCircle, AlertCircle, Plus, PenTool, RefreshCw } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { getAccountServicesStats } from "@/app/actions/dashboard";

interface Stats {
  pending: number;
  inReview: number;
  completed: number;
  errors: number;
}

export default function AccountServicesClientPage({ initialStats }: { initialStats: Stats }) {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>(initialStats);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const updatedStats = await getAccountServicesStats();
      setStats(updatedStats);
      router.refresh();
    } catch (error) {
      console.error("Failed to refresh stats", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const dashboardItems = [
    { title: "Pending Applications", count: stats.pending, icon: Users, colorClass: "text-amber-500", bgClass: "bg-amber-50", link: "/dashboard/forms?status=Draft" },
    { title: "Applications in Review", count: stats.inReview, icon: FileText, colorClass: "text-blue-500", bgClass: "bg-blue-50", link: "/dashboard/forms?status=Submitted" },
    { title: "Completed", count: stats.completed, icon: CheckCircle, colorClass: "text-emerald-500", bgClass: "bg-emerald-50", link: "/dashboard/forms?status=Completed" },
    { title: "Errors / Declined", count: stats.errors, icon: AlertCircle, colorClass: "text-red-500", bgClass: "bg-red-50", link: "/dashboard/forms?status=Rejected" },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Account Services</h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className="mb-10">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {dashboardItems.map((item, index) => (
            <Link
              key={index}
              href={item.link}
              className="flex flex-col p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-4", item.bgClass)}>
                <item.icon className={cn("w-6 h-6", item.colorClass)} />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{item.count}</div>
              <div className="text-sm font-medium text-gray-500">{item.title}</div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/dashboard/forms?tab=account_services"
            className="flex flex-col p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <div className="text-lg font-semibold text-gray-900 mb-1">New Application</div>
            <div className="text-sm text-gray-500">Start a new form submission</div>
          </Link>

          <Link
            href="/dashboard/signature"
            className="flex flex-col p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-purple-500/30 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
              <PenTool className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-lg font-semibold text-gray-900 mb-1">Sign Contracts</div>
            <div className="text-sm text-gray-500">Review & sign pending documents</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
