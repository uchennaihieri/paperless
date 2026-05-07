"use client";

import React from "react";
import { Plus, PenTool, Fingerprint, CreditCard, BarChart2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AccountServicesClientPage() {
  const extendedServices = [
    {
      title: "NIN Verification",
      description: "Verify a customer's National Identification Number against the NIMC registry.",
      icon: Fingerprint,
      href: "/dashboard/account-services/nin-verification",
      accent: "text-indigo-600",
      bg: "bg-indigo-50",
      hoverBorder: "hover:border-indigo-300/60",
      hoverBg: "hover:bg-indigo-50/30",
    },
    {
      title: "BVN Verification",
      description: "Confirm a Bank Verification Number and retrieve associated biodata.",
      icon: ShieldCheck,
      href: "/dashboard/account-services/bvn-verification",
      accent: "text-emerald-600",
      bg: "bg-emerald-50",
      hoverBorder: "hover:border-emerald-300/60",
      hoverBg: "hover:bg-emerald-50/30",
    },
    {
      title: "FirstCentral CRB",
      description: "Run a FirstCentral Credit Bureau check on a customer or business.",
      icon: BarChart2,
      href: "/dashboard/account-services/firstcentral-crb",
      accent: "text-sky-600",
      bg: "bg-sky-50",
      hoverBorder: "hover:border-sky-300/60",
      hoverBg: "hover:bg-sky-50/30",
    },
    {
      title: "CreditRegistry CRB",
      description: "Perform a CreditRegistry bureau check for credit risk assessment.",
      icon: CreditCard,
      href: "/dashboard/account-services/creditregistry-crb",
      accent: "text-purple-600",
      bg: "bg-purple-50",
      hoverBorder: "hover:border-purple-300/60",
      hoverBg: "hover:bg-purple-50/30",
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto pb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-8">Extended Services</h2>

      {/* Extended Services */}
      <div className="mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {extendedServices.map((service) => (
            <Link
              key={service.title}
              href={service.href}
              className={cn(
                "flex items-start gap-4 p-6 bg-white border border-gray-200 rounded-xl shadow-sm transition-all cursor-pointer group",
                service.hoverBorder,
                service.hoverBg
              )}
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", service.bg)}>
                <service.icon className={cn("w-6 h-6", service.accent)} />
              </div>
              <div>
                <div className="text-base font-semibold text-gray-900 mb-1">{service.title}</div>
                <div className="text-sm text-gray-500 leading-relaxed">{service.description}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Other Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Other Actions</h3>
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
            <div className="text-sm text-gray-500">Review &amp; sign pending documents</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
