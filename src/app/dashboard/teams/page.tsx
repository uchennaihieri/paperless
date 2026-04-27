import { getDistinctUsers } from "@/app/actions/team";
import { getBranches, getFormTemplates } from "@/app/actions/form";
import TeamsClientPage from "./client-page";
import { redirect } from "next/navigation";

export const metadata = {
  title: 'Teams Management - Paperless',
};

export default async function TeamsPage() {
  try {
    const [groupedUsers, branches, templates] = await Promise.all([
      getDistinctUsers(),
      getBranches(),
      getFormTemplates()
    ]);
    
    return <TeamsClientPage users={groupedUsers} branches={branches} templates={templates} />;
  } catch (error) {
    // If not admin, redirect to dashboard
    redirect("/dashboard/workflow");
  }
}
