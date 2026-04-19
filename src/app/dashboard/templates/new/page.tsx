"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, FileText, Code2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";

export default function NewTemplatePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<"document" | "html">("document");
  const [fileName, setFileName] = useState("");

  const prefix = type === "html" ? "htmltemplates/" : "templates/";
  const sharepointPath = fileName ? `${prefix}${fileName}` : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) { setError("File name is required."); return; }
    setLoading(true);
    setError(null);
    try {
      const token = (session?.user as any)?.backendToken;
      const res = await fetch(`${BASE_URL}/api/v1/templates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, type, sharepointPath }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create template");
      }
      router.push("/dashboard/templates");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/templates" className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">New Template</h2>
          <p className="text-sm text-gray-500">Register a new PDF template from SharePoint.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md text-sm font-medium border border-red-100">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Template Name */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Template Name</label>
            <input
              required
              className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary focus:ring-primary text-sm p-3 border"
              placeholder="e.g. Petty Cash Form V1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Template Type */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Template Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("document")}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-left ${
                  type === "document"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <FileText className={`w-6 h-6 ${type === "document" ? "text-primary" : "text-gray-400"}`} />
                <div>
                  <p className={`text-sm font-semibold ${type === "document" ? "text-primary" : "text-gray-700"}`}>Document PDF</p>
                  <p className="text-xs text-gray-400 mt-0.5">Overlay text & signatures on an existing PDF file</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setType("html")}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-left ${
                  type === "html"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <Code2 className={`w-6 h-6 ${type === "html" ? "text-primary" : "text-gray-400"}`} />
                <div>
                  <p className={`text-sm font-semibold ${type === "html" ? "text-primary" : "text-gray-700"}`}>HTML PDF</p>
                  <p className="text-xs text-gray-400 mt-0.5">Full Handlebars HTML layout rendered to PDF via Puppeteer</p>
                </div>
              </button>
            </div>
          </div>

          {/* File Name */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">File Name</label>
            <div className="flex items-stretch rounded-lg border border-gray-300 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary">
              <span className="flex items-center px-3 bg-gray-50 border-r border-gray-300 text-xs text-gray-500 font-mono whitespace-nowrap shrink-0">
                {prefix}
              </span>
              <input
                required
                className="flex-1 text-sm p-3 font-mono bg-white focus:outline-none"
                placeholder={type === "html" ? "petty_cash.html" : "deposit-v1.pdf"}
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500">
              Full SharePoint path will be: <span className="font-mono text-primary">{sharepointPath || `${prefix}(your-filename)`}</span>
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              {loading ? "Saving..." : "Create Template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
