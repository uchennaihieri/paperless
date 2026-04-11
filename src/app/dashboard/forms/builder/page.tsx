import { isAdministrator, getBranches } from "@/app/actions/form";
import FormBuilderClient from "./client-builder";

export default async function FormBuilderPage() {
  const [admin, branches] = await Promise.all([isAdministrator(), getBranches()]);
  return <FormBuilderClient isAdmin={admin} branches={branches} />;
}
