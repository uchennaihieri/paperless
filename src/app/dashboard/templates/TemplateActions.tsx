"use client";

import React, { useState } from "react";
import { Edit, Layout, Trash2, X, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TemplateActions({ template }: { template: any }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [name, setName] = useState(template.name);
  const [sharepointPath, setSharepointPath] = useState(template.sharepointPath || "");
  const [availableFor, setAvailableFor] = useState<string[]>(template.availableFor || ["forms", "contracts", "events"]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/v1/templates/${template.id}`, { method: 'DELETE' });
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Failed to delete template");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/v1/templates/${template.id}`, {
        method: 'PATCH',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sharepointPath, availableFor }),
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        router.refresh();
      } else {
        alert(data.error || "Failed to update template");
      }
    } catch (e) {
      console.error(e);
      alert("Error updating template");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAvailability = (type: string) => {
    setAvailableFor(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  return (
    <>
      <div className="flex justify-end items-center gap-2">
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-2 text-gray-500 hover:text-primary bg-gray-50 rounded-md hover:bg-primary/10 transition-colors"
          title="Edit Details"
        >
          <Edit className="h-4 w-4" />
        </button>
        <Link 
          href={`/dashboard/templates/${template.id}`}
          className="p-2 text-gray-500 hover:text-blue-600 bg-gray-50 rounded-md hover:bg-blue-50 transition-colors"
          title="Design Template"
        >
          <Layout className="h-4 w-4" />
        </Link>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-2 text-gray-500 hover:text-red-600 bg-gray-50 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
          title="Delete Template"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Edit Template Details</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SharePoint Folder Path</label>
                <input
                  type="text"
                  value={sharepointPath}
                  onChange={(e) => setSharepointPath(e.target.value)}
                  placeholder="/Shared Documents/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to use default path.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Available For</label>
                <div className="flex gap-2">
                  {["forms", "contracts", "events"].map((type) => {
                    const isSelected = availableFor.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleAvailability(type)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                          isSelected 
                            ? "bg-primary/10 border-primary text-primary" 
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
