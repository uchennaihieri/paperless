"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewTemplatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    sharepointPath: "templates/"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
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
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Template Name</label>
            <input 
              required
              className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary focus:ring-primary text-sm p-3 border"
              placeholder="e.g. Deposit Form V1"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">SharePoint Path</label>
            <input 
              required
              className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary focus:ring-primary text-sm p-3 border font-mono"
              placeholder="templates/deposit-v1.pdf"
              value={formData.sharepointPath}
              onChange={(e) => setFormData({...formData, sharepointPath: e.target.value})}
            />
            <p className="text-xs text-gray-500">The exact path of the PDF file inside the SharePoint documents library.</p>
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
