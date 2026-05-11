import { getSubmission, getFormTemplate } from "@/app/actions/form";
import { getPrerequisites } from "@/app/actions/prerequisites";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, FileDown, AlertTriangle, Link2, CheckCircle2, Clock } from "lucide-react";
import { AttachmentLink } from "./attachment-link";
import { RegeneratePdfButton } from "./regenerate-button";
import { RemindButton } from "./remind-button";
import { PrereqRemindButton } from "./prereq-remind-button";
import { FormResponseCell } from "./form-response-cell";

function statusVariant(status: string) {
  switch (status) {
    case "Completed": return "success";
    case "Processing": return "warning";
    case "In-review": return "secondary";
    case "Rejected": return "destructive";
    case "Blocked - Awaiting Prerequisites": return "destructive";
    default: return "default";
  }
}

function prereqStatusColor(status: string) {
  switch (status) {
    case "Approved": return "bg-green-50 text-green-700 border-green-200";
    case "Submitted": return "bg-blue-50 text-blue-700 border-blue-200";
    default: return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

function PrereqStatusIcon({ status }: { status: string }) {
  if (status === "Approved") return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
  if (status === "Submitted") return <Clock className="w-3.5 h-3.5 text-blue-500" />;
  return <Clock className="w-3.5 h-3.5 text-amber-500" />;
}

export default async function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [submission, prerequisites] = await Promise.all([
    getSubmission(id),
    getPrerequisites(id),
  ]);

  if (!submission) notFound();

  const template = await getFormTemplate(submission.templateId);
  const templateFields: any[] = typeof template?.fields === "string"
    ? JSON.parse(template.fields)
    : (template?.fields || []);

  const responses = submission.formResponses as Record<string, any>;
  const signatories = submission.signatories;
  const submitterEmail = (submission as any).submittedBy?.finca_email ?? null;
  const completedPdfArr = responses["CompletedFormPDF"];
  const signedContractDocs: any[] = ((submission as any).documents ?? []).filter((d: any) => d.fieldName === "SignedContract");
  const isBlocked = submission.status === "Blocked - Awaiting Prerequisites";
  // Use the Next.js proxy (/api/v1/...) so the browser request is forwarded
  // with the session token automatically — no auth error on direct <a> links.
  const FILE_PROXY = "/api/v1/file";

  // Use template fields to determine order and human-readable label
  const orderedResponses: { label: string; key: string; value: any; isPrerequisite?: boolean; targetFormTemplateId?: string }[] = [];
  const processedKeys = new Set<string>();

  templateFields.forEach((field: any) => {
    const key = field.id || field.label;
    if (responses[key] !== undefined) {
      orderedResponses.push({
        label: field.label || key,
        key,
        value: responses[key],
        isPrerequisite: field.isPrerequisite,
        targetFormTemplateId: field.targetFormTemplateId,
      });
      processedKeys.add(key);
    }
  });

  Object.entries(responses).forEach(([q, a]) => {
    if (q !== "CompletedFormPDF" && !processedKeys.has(q)) {
      const fallbackLabel = q.charAt(0).toUpperCase() + q.slice(1).replace(/([A-Z])/g, " $1");
      orderedResponses.push({ label: fallbackLabel, key: q, value: a });
    }
  });

  // Map targetFormId → prereq record for inline row lookup
  const prereqByFormId: Record<string, any> = {};
  for (const pr of prerequisites) {
    prereqByFormId[pr.targetFormId] = pr;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/dashboard/forms" className="inline-flex items-center text-sm text-gray-500 hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to forms
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{submission.formName}</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Ref: {submission.reference || submission.id.slice(-8).toUpperCase()} · Submitted{" "}
            {new Date(submission.createdAt).toLocaleString()}
          </p>
        </div>
        <Badge variant={statusVariant(submission.status) as any} className="text-sm px-3">
          {submission.status}
        </Badge>
      </div>

      {/* Blocked banner */}
      {isBlocked && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Awaiting Prerequisite Forms</p>
            <p className="text-xs text-amber-700 mt-0.5">
              This submission is blocked until all linked prerequisite forms below have been
              independently filled and approved. Signatories will be notified automatically once
              all prerequisites are met.
            </p>
          </div>
        </div>
      )}

      {/* Prerequisites section */}
      {prerequisites.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-orange-700 uppercase tracking-widest border-b border-orange-100 pb-2 mb-3 flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5" /> Prerequisite Forms
          </h3>
          <div className="space-y-2">
            {prerequisites.map((pr: any) => (
              <div
                key={pr.id}
                className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {pr.targetForm?.name ?? "Prerequisite Form"}
                    </p>
                    <p className="text-xs text-gray-400">Required from: {pr.targetEmail}</p>
                    {pr.prereqSubmission?.reference && (
                      <p className="text-xs text-gray-400">Ref: {pr.prereqSubmission.reference}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${prereqStatusColor(pr.status)}`}>
                    <PrereqStatusIcon status={pr.status} />
                    {pr.status}
                  </span>
                  {pr.status === "Pending" && (
                    <PrereqRemindButton prereqId={pr.id} />
                  )}
                  {pr.prereqSubmissionId && (
                    <Link
                      href={`/dashboard/forms/submission/${pr.prereqSubmissionId}`}
                      className="text-xs text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                    >
                      View →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form Responses */}
      <div>
        <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-3">
          <h3 className="text-xs font-semibold text-primary uppercase tracking-widest">Form Responses</h3>
          {(submission.status === "Completed" || submission.status === "Processing") && (
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
              {orderedResponses.map(({ label, key, value, isPrerequisite, targetFormTemplateId }, i) => {
                const linkedPrereq =
                  isPrerequisite && targetFormTemplateId
                    ? prereqByFormId[targetFormTemplateId]
                    : null;
                return (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 font-medium text-gray-700">
                      <span>{label}</span>
                      {isPrerequisite && (
                        <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700 font-semibold border border-orange-200">
                          <Link2 className="w-2.5 h-2.5" /> prereq
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {linkedPrereq ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-gray-500 text-sm">{String(value)}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${prereqStatusColor(linkedPrereq.status)}`}>
                            <PrereqStatusIcon status={linkedPrereq.status} />
                            {linkedPrereq.status}
                          </span>
                          {linkedPrereq.prereqSubmissionId && (
                            <Link
                              href={`/dashboard/forms/submission/${linkedPrereq.prereqSubmissionId}`}
                              className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
                            >
                              View
                            </Link>
                          )}
                        </div>
                      ) : (
                        <FormResponseCell label={key} value={value} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Completed Generated Documents */}
      {((completedPdfArr && completedPdfArr.length > 0) || signedContractDocs.length > 0) && (
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-primary uppercase tracking-widest border-b border-gray-200 pb-2 mb-3">
            Completed Generated Document
          </h3>
          <div className="space-y-3">
            {/* Auto-Generated PDF */}
            {completedPdfArr && completedPdfArr.length > 0 && (
              <div className="border border-gray-200 rounded-xl bg-gray-50 p-5 flex items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                    <FileDown className="w-5 h-5 text-[#b50938]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{completedPdfArr[0].name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Generated PDF document</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={completedPdfArr[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#b50938] text-white text-xs font-semibold rounded-lg hover:bg-[#9a0730] transition-colors shadow-sm"
                  >
                    <FileDown className="w-3.5 h-3.5" /> Open PDF
                  </a>
                  <a
                    href={completedPdfArr[0].url}
                    download
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
                  >
                    Download
                  </a>
                </div>
              </div>
            )}

            {/* Signed Contract Documents */}
            {signedContractDocs.map((doc: any) => {
              const downloadUrl = `${FILE_PROXY}?docId=${doc.id}`;
              return (
                <div key={doc.id} className="border border-gray-200 rounded-xl bg-gray-50 p-5 flex items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                      <FileDown className="w-5 h-5 text-[#b50938]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{doc.originalName || "Signed_Contract.pdf"}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Signed Contract document</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#b50938] text-white text-xs font-semibold rounded-lg hover:bg-[#9a0730] transition-colors shadow-sm"
                    >
                      <FileDown className="w-3.5 h-3.5" /> Open PDF
                    </a>
                    <a
                      href={downloadUrl}
                      download
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
                    >
                      Download
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Signatories */}
      <div>
        <h3 className="text-xs font-semibold text-primary uppercase tracking-widest border-b border-gray-200 pb-2 mb-3">
          Signatories
        </h3>
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
                <Badge
                  variant={
                    s.status === "Signed"
                      ? "success"
                      : s.status === "Declined"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {s.status}
                </Badge>
                {s.signedAt && (
                  <span className="text-xs text-gray-400">{new Date(s.signedAt).toLocaleString()}</span>
                )}
                {s.status === "Pending" && s.email !== submitterEmail && !isBlocked && (
                  <RemindButton submissionId={submission.id} signatoryId={s.id} />
                )}
                {s.status === "Pending" && isBlocked && (
                  <span className="text-xs text-amber-600 italic">blocked</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
