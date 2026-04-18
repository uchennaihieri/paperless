import { getSubmission } from "@/app/actions/form";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText } from "lucide-react";
import { AttachmentLink } from "./attachment-link";
import { RegeneratePdfButton } from "./regenerate-button";
import { RemindButton } from "./remind-button";

function statusVariant(status: string) {
  switch (status) {
    case "Completed": return "success";
    case "Processing": return "warning";
    case "In-review": return "secondary";
    case "Rejected": return "destructive";
    default: return "default";
  }
}

export default async function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const submission = await getSubmission(id);

  if (!submission) notFound();

  const responses = submission.formResponses as Record<string, any>;
  const signatories = submission.signatories;
  const submitterEmail = (submission as any).submittedBy?.finca_email ?? null;

  const completedPdfArr = responses["CompletedFormPDF"];
  // Remove it from the general display loop so it isn't shown generically
  const filteredResponses = Object.entries(responses).filter(([q]) => q !== "CompletedFormPDF");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/dashboard/forms" className="inline-flex items-center text-sm text-gray-500 hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to forms
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{submission.formName}</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Ref: {submission.reference || submission.id.slice(-8).toUpperCase()} · Submitted {new Date(submission.createdAt).toLocaleString()}
          </p>
        </div>
        <Badge variant={statusVariant(submission.status) as any} className="text-sm px-3">{submission.status}</Badge>
      </div>

      {/* Form Responses */}
      <div>
        <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-3">
          <h3 className="text-xs font-semibold text-primary uppercase tracking-widest">Form Responses</h3>
          {submission.status === "Completed" && (
            <RegeneratePdfButton submissionId={submission.id} />
          )}
        </div>
        <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-white text-xs">
                <th className="px-4 py-3 text-left font-semibold w-1/2">Question</th>
                <th className="px-4 py-3 text-left font-semibold w-1/2">Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredResponses.map(([q, a], i) => {
                const isAttachmentArray = Array.isArray(a) && a.every(item => item && item.isAttachment);
                return (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 font-medium text-gray-700">{q}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {isAttachmentArray ? (
                        <div className="flex flex-col gap-2">
                          {(a as any[]).map((file, idx) => (
                            <AttachmentLink key={idx} file={file} />
                          ))}
                        </div>
                      ) : (
                        String(a) || <span className="italic text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Completed Form Viewer */}
      {completedPdfArr && completedPdfArr.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-primary uppercase tracking-widest border-b border-gray-200 pb-2 mb-3">Generated Form Document</h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm p-4">
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                  <FileText className="w-5 h-5 text-red-500" />
                  {completedPdfArr[0].name}
               </div>
               <a 
                 href={completedPdfArr[0].url} 
                 download={completedPdfArr[0].name}
                 className="px-4 py-1.5 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
                 target="_blank"
                 rel="noopener noreferrer"
               >
                 Download PDF
               </a>
             </div>
             <iframe 
               src={completedPdfArr[0].url} 
               className="w-full h-[650px] border border-gray-200 rounded-lg bg-gray-50"
               title="Completed Form PDF View"
             />
          </div>
        </div>
      )}

      {/* Signatories */}
      <div>
        <h3 className="text-xs font-semibold text-primary uppercase tracking-widest border-b border-gray-200 pb-2 mb-3">Signatories</h3>
        <div className="space-y-2">
          {signatories?.map((s: any) => (
            <div key={s.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                {s.position}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{s.userName}</p>
                <p className="text-xs text-gray-400">{s.email}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant={
                  s.status === "Signed" ? "success" :
                  s.status === "Declined" ? "destructive" : "secondary"
                }>{s.status}</Badge>
                {s.signedAt && <span className="text-xs text-gray-400">{new Date(s.signedAt).toLocaleDateString()}</span>}
                {/* Show Send Reminder only when signatory is pending AND is not the submitter themselves */}
                {s.status === "Pending" && s.email !== submitterEmail && (
                  <RemindButton submissionId={submission.id} signatoryId={s.id} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
