import { isAdministrator, getBranches, getFormTemplate } from "@/app/actions/form";
import FormBuilderClient from "./client-builder";
import { apiClient } from "@/lib/apiClient";

export default async function FormBuilderPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const resolvedParams = await searchParams;
  const [admin, branches] = await Promise.all([isAdministrator(), getBranches()]);
  
  let availableTemplates = [];
  try {
     const tRes = await apiClient("/templates", { next: { revalidate: 0 } });
     availableTemplates = tRes.data || [];
  } catch(e) {}

  let template = null;
  if (resolvedParams?.id) {
    template = await getFormTemplate(resolvedParams.id);
  }
  return <FormBuilderClient isAdmin={admin} branches={branches} initialTemplate={template} availableTemplates={availableTemplates} />;
}
