import AuditLogDashboard from "@/components/AuditLogDashboard";

export const metadata = {
  title: "Audit Logs — E-Save",
};

export default function ESaveAuditPage() {
  return (
    <div className="p-4 md:p-6 w-full mx-auto">
      <AuditLogDashboard />
    </div>
  );
}
