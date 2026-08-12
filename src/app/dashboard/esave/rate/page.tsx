import InterestRateDashboard from "@/components/InterestRateDashboard";

export const metadata = {
  title: "Interest Rate Policy — E-Save",
};

export default function ESaveRatePage() {
  return (
    <div className="p-4 md:p-6 w-full max-w-7xl mx-auto">
      <InterestRateDashboard />
    </div>
  );
}
