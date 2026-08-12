import BankDashboard from "@/components/BankDashboard";

export const metadata = {
  title: "Bank Management — E-Save",
};

export default function ESaveBankPage() {
  return (
    <div className="p-4 md:p-6 w-full mx-auto">
      <BankDashboard />
    </div>
  );
}
