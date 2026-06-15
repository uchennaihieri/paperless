import { getFormTemplates, getMySubmissions, isAdministrator, getMyRequestBatches, getMyPendingRequests } from "@/app/actions/form";
import FormsClientPage from "./client-page";

export default async function FormsPage() {
  const [templates, submissions, batches, admin, pendingRequests] = await Promise.all([
    getFormTemplates(),
    getMySubmissions(),
    getMyRequestBatches(),
    isAdministrator(),
    getMyPendingRequests(),
  ]);

  return <FormsClientPage templates={templates} submissions={submissions as any} batches={batches} isAdmin={admin} pendingRequests={pendingRequests} />;
}
