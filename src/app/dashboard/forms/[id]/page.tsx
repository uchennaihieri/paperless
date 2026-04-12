import { getFormTemplate } from "@/app/actions/form";
import FormFillerClient from "./client-form";
import { notFound } from "next/navigation";
import { auth } from "@/auth";

export default async function FillFormPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const template = await getFormTemplate(resolvedParams.id);
  
  if (!template) {
    notFound();
  }

  const session = await auth();
  const userName = session?.user?.name || "Unknown";
  const email = session?.user?.email || "";

  return <FormFillerClient template={template} currentUser={{ userName, email }} />;
}
