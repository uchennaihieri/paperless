import { Suspense } from "react";
import Link from "next/link";
import { Plus, FileText, Trash2, Edit, Code2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { redirect } from "next/navigation";

interface Template {
  id: string;
  name: string;
  type: "document" | "html";
  sharepointPath: string;
  createdAt: string;
}

export default async function TemplatesPage() {
  let templates: Template[] = [];
  try {
    const res = await apiClient("/templates", { next: { revalidate: 0 } });
    templates = res.data || [];
  } catch (err: any) {
    console.error("Failed to load templates:", err);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">PDF Templates</h2>
          <p className="text-muted-foreground text-gray-500">
            Manage reusable PDF templates and map form fields.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/templates/lists"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium text-sm transition-colors border border-gray-200"
          >
            <FileText className="h-4 w-4" />
            Reusable Lists
          </Link>
          <Link 
            href="/dashboard/templates/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 font-medium text-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Template
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
            <tr>
              <th className="px-6 py-4 font-medium">Template Name</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">SharePoint Path</th>
              <th className="px-6 py-4 font-medium">Created Date</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {templates.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                  <p>No templates created yet.</p>
                  <p className="text-xs mt-1">Get started by adding your first PDF template map.</p>
                </td>
              </tr>
            ) : (
              templates.map((tpl) => (
                <tr key={tpl.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 border-l-4 border-transparent hover:border-primary">
                    {tpl.name}
                  </td>
                  <td className="px-6 py-4">
                    {tpl.type === "html" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                        <Code2 className="w-3 h-3" /> HTML
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        <FileText className="w-3 h-3" /> Document
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                    {tpl.sharepointPath}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(tpl.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-2">
                       <Link 
                         href={`/dashboard/templates/${tpl.id}`}
                         className="p-2 text-gray-500 hover:text-primary bg-gray-50 rounded-md hover:bg-primary/10 transition-colors"
                         title="Edit Field Map"
                       >
                         <Edit className="h-4 w-4" />
                       </Link>
                       <form action={async () => {
                          "use server";
                          try {
                            await apiClient(`/templates/${tpl.id}`, { method: 'DELETE' });
                          } catch (e) {
                            console.error(e);
                          }
                          redirect("/dashboard/templates");
                       }}>
                         <button
                           type="submit"
                           className="p-2 text-gray-500 hover:text-red-600 bg-gray-50 rounded-md hover:bg-red-50 transition-colors"
                           title="Delete Template"
                         >
                           <Trash2 className="h-4 w-4" />
                         </button>
                       </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
