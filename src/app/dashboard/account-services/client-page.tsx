"use client";

import React from "react";
import { Calendar, Upload, Fingerprint, CreditCard, BarChart2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AccountServicesClientPage() {
  const extendedServices = [
    {
      title: "NIN Verification",
      description: "Verify a customer's National Identification Number against the NIMC registry.",
      icon: Fingerprint,
      href: "/dashboard/account-services/nin-verification",
      accent: "text-primary",
      bg: "bg-primary/5",
      hoverBorder: "hover:border-primary/20",
      hoverBg: "hover:bg-primary/5",
    },
    {
      title: "BVN Verification",
      description: "Confirm a Bank Verification Number and retrieve associated biodata.",
      icon: ShieldCheck,
      href: "/dashboard/account-services/bvn-verification",
      accent: "text-primary",
      bg: "bg-primary/5",
      hoverBorder: "hover:border-primary/20",
      hoverBg: "hover:bg-primary/5",
    },
    {
      title: "FirstCentral CRB",
      description: "Run a FirstCentral Credit Bureau check on a customer or business.",
      icon: BarChart2,
      href: "/dashboard/account-services/firstcentral-crb",
      accent: "text-primary",
      bg: "bg-primary/5",
      hoverBorder: "hover:border-primary/20",
      hoverBg: "hover:bg-primary/5",
    },
    {
      title: "CreditRegistry CRB",
      description: "Perform a CreditRegistry bureau check for credit risk assessment.",
      icon: CreditCard,
      href: "/dashboard/account-services/creditregistry-crb",
      accent: "text-primary",
      bg: "bg-primary/5",
      hoverBorder: "hover:border-primary/20",
      hoverBg: "hover:bg-primary/5",
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
            href="/dashboard/account-services/events"
            className="flex flex-col p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-amber-500/30 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
              <Calendar className="w-6 h-6 text-amber-600" />
            </div>
            <div className="text-lg font-semibold text-gray-900 mb-1">Events</div>
            <div className="text-sm text-gray-500">Manage training events and generate attendance rosters</div>
          </Link>

          <Link
            href="/dashboard/account-services/uploaded-data"
            className="flex flex-col p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-teal-500/30 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center mb-4 group-hover:bg-teal-200 transition-colors">
              <Upload className="w-6 h-6 text-teal-600" />
            </div>
            <div className="text-lg font-semibold text-gray-900 mb-1">Uploaded Data</div>
            <div className="text-sm text-gray-500">Upload your own data to use within a flow</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

