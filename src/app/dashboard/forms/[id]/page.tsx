import { getFormTemplate } from "@/app/actions/form";
import FormFillerClient from "./client-form";
import { notFound } from "next/navigation";

export default async function FillFormPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const template = await getFormTemplate(resolvedParams.id);
  
  if (!template) {
    notFound();
  }

  return <FormFillerClient template={template} />;
}
