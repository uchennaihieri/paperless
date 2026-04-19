"use client";

import dynamic from "next/dynamic";

const TemplateDesigner = dynamic(() => import("./TemplateDesigner"), { ssr: false });

export default function ClientTemplateDesigner({ templateId, initialData }: { templateId: string, initialData: any }) {
  return <TemplateDesigner templateId={templateId} initialData={initialData} />;
}
