import { Suspense } from "react";
import { apiClient } from "@/lib/apiClient";
import TemplateDesigner from "./TemplateDesigner";

export default async function TemplateDesignerPage({
  params
}: {
  params: { id: string }
}) {
  const { id } = await params;
  
  let initialData = null;
  try {
    const res = await apiClient(`/templates/${id}`, { cache: "no-store" });
    initialData = res.data;
  } catch (error) {
    console.error("Failed to load template:", error);
    return (
      <div className="p-8 text-center text-red-500 font-medium bg-red-50 rounded-xl border border-red-100">
        Error loading template configuration. Please check backend proxy connection or verify the ID.
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className="p-8 text-center text-gray-500 font-medium">
        Template not found.
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="animate-pulse bg-gray-50 flex-1 p-6 rounded-xl min-h-[500px]">Loading Designer Engine...</div>}>
       <TemplateDesigner templateId={id} initialData={initialData} />
    </Suspense>
  );
}
