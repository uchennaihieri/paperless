import IdentityCheckDashboard from "@/components/IdentityCheckDashboard";

export const metadata = { title: "CreditRegistry CRB — Extended Services" };

export default function CreditRegistryCrbPage() {
  return (
    <IdentityCheckDashboard
      config={{
        checkType:   "creditregistry",
        title:       "CreditRegistry CRB",
        description: "Perform a CreditRegistry bureau check to evaluate credit history and repayment behaviour.",
        color:       "purple",
        comingSoon:  true,
      }}
    />
  );
}
