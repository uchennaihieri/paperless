import { getFormTemplates, getMySubmissions, isAdministrator } from "@/app/actions/form";
import FormsClientPage from "./client-page";

export default async function FormsPage() {
  const [templates, submissions, admin] = await Promise.all([
    getFormTemplates(),
    getMySubmissions(),
    isAdministrator(),
  ]);

  return <FormsClientPage templates={templates} submissions={submissions as any} isAdmin={admin} />;
}
