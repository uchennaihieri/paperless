import { getAccountServicesStats } from "@/app/actions/dashboard";
import AccountServicesClientPage from "./client-page";

export default async function AccountServicesPage() {
  const stats = await getAccountServicesStats();

  return <AccountServicesClientPage initialStats={stats} />;
}
