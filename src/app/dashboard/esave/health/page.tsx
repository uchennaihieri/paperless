import HealthDashboard from "@/components/HealthDashboard";

export const metadata = {
  title: "System Health — E-Save",
};

export default function ESaveHealthPage() {
  return (
    <div className="p-4 md:p-6 w-full max-w-7xl mx-auto">
      <HealthDashboard />
    </div>
  );
}
