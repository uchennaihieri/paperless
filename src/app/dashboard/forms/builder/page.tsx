import { isAdministrator, getBranches, getFormTemplate } from "@/app/actions/form";
import FormBuilderClient from "./client-builder";

export default async function FormBuilderPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const resolvedParams = await searchParams;
  const [admin, branches] = await Promise.all([isAdministrator(), getBranches()]);
  let template = null;
  if (resolvedParams?.id) {
    template = await getFormTemplate(resolvedParams.id);
  }
  return <FormBuilderClient isAdmin={admin} branches={branches} initialTemplate={template} />;
}
