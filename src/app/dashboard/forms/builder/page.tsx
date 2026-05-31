import { isAdministrator, getBranches, getRoles, getFormTemplate } from "@/app/actions/form";
import FormBuilderClient from "./client-builder";
import { apiClient } from "@/lib/apiClient";

export default async function FormBuilderPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const resolvedParams = await searchParams;
  const [admin, branches, roles] = await Promise.all([isAdministrator(), getBranches(), getRoles()]);
  
  let availableTemplates = [];
  try {
     const tRes = await apiClient("/templates", { next: { revalidate: 0 } });
     availableTemplates = tRes.data || [];
  } catch(e) {}

  let template = null;
  if (resolvedParams?.id) {
    template = await getFormTemplate(resolvedParams.id);
  }
  return <FormBuilderClient isAdmin={admin} branches={branches} roles={roles} initialTemplate={template} availableTemplates={availableTemplates} />;
}
