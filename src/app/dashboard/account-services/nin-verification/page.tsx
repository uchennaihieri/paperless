import IdentityCheckDashboard, { NIN_FIELDS } from "@/components/IdentityCheckDashboard";

export const metadata = { title: "NIN Verification — Extended Services" };

export default function NinVerificationPage() {
  return (
    <IdentityCheckDashboard
      config={{
        checkType:   "nin",
        title:       "NIN Verification",
        description: "Verify a customer's National Identification Number (NIN) against the NIMC registry in real time.",
        color:       "indigo",
        fields:      NIN_FIELDS,
      }}
    />
  );
}
