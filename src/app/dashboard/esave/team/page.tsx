import TeamDashboard from "@/components/TeamDashboard";

export default function ESaveTeamPage() {
  return (
    <div className="flex-1 w-full p-4 lg:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <TeamDashboard />
      </div>
    </div>
  );
}
