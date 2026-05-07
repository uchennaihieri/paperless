import IdentityCheckDashboard, { BVN_FIELDS } from "@/components/IdentityCheckDashboard";

export const metadata = { title: "BVN Verification — Extended Services" };

export default function BvnVerificationPage() {
  return (
    <IdentityCheckDashboard
      config={{
        checkType:   "bvn",
        title:       "BVN Verification",
        description: "Confirm a customer's Bank Verification Number (BVN) and retrieve associated biodata from the NIBSS registry.",
        color:       "emerald",
        fields:      BVN_FIELDS,
      }}
    />
  );
}
