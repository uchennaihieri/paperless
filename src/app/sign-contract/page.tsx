import { apiClient } from "@/lib/apiClient";
import ClientSignContract from "./client"; // fixed

export const dynamic = 'force-dynamic';

export default async function SignContractPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token;
  
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-500">The link you followed is missing a secure token.</p>
        </div>
      </div>
    );
  }

  let contractData = null;
  let error = null;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}/contracts/external/${token}`, {
      method: "GET",
      cache: "no-store",
    });
    const data = await res.json();
    
    if (data.success) {
      contractData = data;
    } else {
      error = data.error || "Failed to load contract details.";
    }
  } catch (err) {
    error = "Network error. Unable to load the contract.";
  }

  if (error || !contractData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">!</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Contract Unavailable</h1>
          <p className="text-gray-500">{error || "The contract may have already been signed or the link is invalid."}</p>
        </div>
      </div>
    );
  }

  return <ClientSignContract token={token} contractData={contractData} />;
}
