import { notFound } from "next/navigation";
import { Metadata } from "next";

async function getTrackingData(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_EXTERNAL_BACKEND_URL
      ? `${process.env.NEXT_PUBLIC_EXTERNAL_BACKEND_URL}/api/v1`
      : (process.env.BACKEND_API_URL || "https://paperlessbackend-production.up.railway.app/api/v1");
      
    const res = await fetch(`${baseUrl}/public-forms/track/${id}`, {
      cache: "no-store",
    });

    const data = await res.json();
    if (data.success && data.data) {
      return data.data;
    }
  } catch (err) {
    console.error(err);
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const tracking = await getTrackingData(resolvedParams.id);
  if (!tracking?.submission) return { title: "Tracker Not Found" };
  return { title: `Track: ${tracking.submission.formName}` };
}

export default async function PublicTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const tracking = await getTrackingData(resolvedParams.id);

  if (!tracking?.submission) {
    return notFound();
  }

  const { submission, signatories } = tracking;
  
  // Status color mapping
  const statusColors: Record<string, string> = {
    "Submitted": "bg-blue-500 text-white border-transparent",
    "In-review": "bg-neutral-100 text-neutral-900 border-transparent",
    "Processing": "bg-amber-500 text-white border-transparent",
    "Completed": "bg-green-500 text-white border-transparent",
    "Correction Requested": "bg-white text-neutral-950 border border-neutral-200",
    "Rejected": "bg-red-500 text-white border-transparent",
  };

  const currentStatusBadge = statusColors[submission.status] || "bg-gray-100 text-gray-800";

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-8 text-primary font-bold text-2xl">
          <img src="/logo.png" alt="FINCALite Logo" className="h-10 w-10 object-contain rounded-full bg-white shadow-sm" />
          FINCALite
        </div>
        
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="bg-primary px-6 py-8 border-b border-primary/20">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-white">{submission.formName}</h1>
                <p className="text-white/80 mt-1 text-sm font-medium">Ref: {submission.reference || "N/A"}</p>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide ${currentStatusBadge}`}>
                {submission.status}
              </span>
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded-lg shadow-sm">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Submitted By</p>
                <p className="font-medium text-gray-900 mt-1">{submission.publicSubmitterName || "Unknown"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Date Submitted</p>
                <p className="font-medium text-gray-900 mt-1">{new Date(submission.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Approval Progress</h3>
            
            {signatories && signatories.length > 0 ? (
              <div className="space-y-6">
                {signatories.map((sig: any, idx: number) => {
                  const isCompleted = sig.status === "Approved";
                  const isRejected = sig.status === "Rejected";
                  const isCurrent = sig.status === "Pending";
                  
                  return (
                    <div key={idx} className="relative pl-8">
                      {/* Timeline line connecting items */}
                      {idx !== signatories.length - 1 && (
                        <div className="absolute left-3.5 top-8 bottom-[-24px] w-0.5 bg-gray-200"></div>
                      )}
                      
                      {/* Status indicator node */}
                      <div className={`absolute left-0 top-1.5 h-7 w-7 rounded-full flex items-center justify-center border-2 
                        ${isCompleted ? 'bg-green-100 border-green-500 text-green-600' : 
                          isRejected ? 'bg-red-100 border-red-500 text-red-600' : 
                          isCurrent ? 'bg-blue-100 border-blue-500 text-blue-600 shadow-[0_0_0_4px_rgba(59,130,246,0.1)]' : 
                          'bg-gray-50 border-gray-300 text-gray-400'}`}>
                        {isCompleted ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        ) : isRejected ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        ) : (
                          <div className={`h-2.5 w-2.5 rounded-full ${isCurrent ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                        )}
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 transition-all hover:shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-900">{sig.userName}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{sig.role || "Signatory"}</p>
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-md font-medium
                            ${isCompleted ? 'bg-green-100 text-green-700' : 
                              isRejected ? 'bg-red-100 text-red-700' : 
                              isCurrent ? 'bg-blue-100 text-blue-700' : 
                              'bg-gray-200 text-gray-600'}`}>
                            {sig.status}
                          </span>
                        </div>
                        {sig.signedAt && (
                          <p className="text-xs text-gray-400 mt-3 flex items-center">
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {new Date(sig.signedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500 text-sm">No signatories defined for this workflow yet.</p>
              </div>
            )}
            
            {submission.template?.formTreater && submission.template.formTreater.toLowerCase() !== "none" && (
              <div className="mt-8 border-t border-gray-100 pt-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Final Processing</h4>
                <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-4 
                    ${submission.status === "Completed" ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-500"}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Branch / HQ Operations</p>
                    <p className="text-xs text-gray-500">Route to: {submission.template.formTreater}</p>
                  </div>
                  <div className="ml-auto">
                    <span className={`text-xs px-2.5 py-1 rounded-md font-medium
                      ${submission.status === "Completed" ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                      {submission.status === "Completed" ? "Treated" : "Waiting"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <p className="text-center text-gray-400 text-xs mt-8">
          Powered by FINCALite Operations Platform
        </p>
      </div>
    </div>
  );
}
