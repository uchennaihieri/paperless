import AccountServicesClientPage from "./client-page";
import { apiClient } from "@/lib/apiClient";

export default async function AccountServicesPage() {
  let pendingCount = 0;
  try {
    const res = await apiClient("/contracts/pending", { method: "GET" });
    if (res?.contracts) {
      pendingCount = res.contracts.length;
    }
  } catch (err) {
    console.error("Failed to fetch pending contracts count");
  }

  return <AccountServicesClientPage pendingContractsCount={pendingCount} />;
}
