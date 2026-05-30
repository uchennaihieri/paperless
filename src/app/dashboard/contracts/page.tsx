import { apiClient } from "@/lib/apiClient";
import ClientContractsPage from "./client-contracts";

export const dynamic = 'force-dynamic';

export default async function ContractsPage() {
  let contracts = [];
  try {
    const res = await apiClient("/contracts/pending", { method: "GET", next: { revalidate: 0 } });
    if (res?.contracts) {
      contracts = res.contracts;
    }
  } catch (err) {
    console.error("Failed to fetch pending contracts:", err);
  }

  return <ClientContractsPage initialContracts={contracts} />;
}
