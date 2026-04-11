"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FilePlus, ChevronRight, ListCollapse, PlusCircle } from "lucide-react";
import Link from "next/link";

function statusVariant(status: string) {
  switch (status) {
    case "Completed": return "success";
    case "Processing": return "warning";
    case "In-review": return "secondary";
    case "Rejected": return "destructive";
    default: return "default";
  }
}

export default function FormsClientPage({
  templates,
  submissions,
  isAdmin,
}: {
  templates: any[];
  submissions: any[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"available" | "submitted">("available");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredForms = templates.filter((f: any) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Forms Repository</h2>
          <p className="text-gray-500">Access available forms and track your submissions.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-60 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Search forms…"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {isAdmin && (
            <Link href="/dashboard/forms/builder">
              <Button className="cursor-pointer">
                <PlusCircle className="w-4 h-4 mr-2" /> Create Form
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        {(["available", "submitted"] as const).map((tab) => (
          <button
            key={tab}
            className={`pb-3 font-medium text-sm transition-colors relative cursor-pointer ${
              activeTab === tab ? "text-primary" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "available" ? "Available Forms" : `My Submissions (${submissions.length})`}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-md" />
            )}
          </button>
        ))}
      </div>

      {/* Available */}
      {activeTab === "available" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredForms.map((form) => (
            <Card
              key={form.id}
              className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-primary group"
              onClick={() => router.push(`/dashboard/forms/${form.id}`)}
            >
              <CardContent className="p-5">
                <div className="bg-primary/10 w-9 h-9 rounded-lg flex items-center justify-center text-primary mb-3 group-hover:scale-110 transition-transform">
                  <FilePlus className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1 leading-tight">{form.name}</h3>
                <p className="text-xs text-gray-400 line-clamp-2">{form.description}</p>
              </CardContent>
            </Card>
          ))}
          {filteredForms.length === 0 && (
            <div className="col-span-full py-16 text-center text-gray-400">
              No forms match your search.
            </div>
          )}
        </div>
      )}

      {/* Submitted */}
      {activeTab === "submitted" && (
        <div className="grid gap-3">
          {submissions.length === 0 ? (
            <div className="py-16 text-center text-gray-400">You haven't submitted any forms yet.</div>
          ) : (
            submissions.map((s: any) => (
              <Card key={s.id} className="hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => router.push(`/dashboard/forms/submission/${s.id}`)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-100 p-2 rounded-md">
                      <ListCollapse className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {s.id.slice(-6).toUpperCase()} — {s.formName}
                      </h4>
                      <p className="text-xs text-gray-400">
                        Submitted {new Date(s.createdAt).toLocaleDateString()} ·{" "}
                        {s.signatories?.length ?? 0} signator{s.signatories?.length === 1 ? "y" : "ies"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusVariant(s.status) as any}>{s.status}</Badge>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
