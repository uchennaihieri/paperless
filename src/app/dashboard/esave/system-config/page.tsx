import SystemConfigDashboard from "@/components/SystemConfigDashboard";

export const metadata = {
  title: "System Config — E-Save",
};

export default function ESaveSystemConfigPage() {
  return (
    <div className="p-4 md:p-6 w-full mx-auto">
      <SystemConfigDashboard />
    </div>
  );
}
