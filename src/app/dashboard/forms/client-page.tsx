"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, FilePlus, ChevronRight, ListCollapse, PlusCircle,
  Edit2, Trash2, AlertTriangle, Pencil, MessageCircle, ChevronDown, ChevronUp, Send, X, MoreVertical, Copy, Eye, EyeOff, Power, PowerOff
} from "lucide-react";
import Link from "next/link";
import { deleteFormTemplate, deleteSubmission, deleteFormRequestBatch, copyFormTemplate, toggleFormVisibility } from "@/app/actions/form";
import { getMySignature } from "@/app/actions/security";
import EditSubmissionModal from "./edit-submission-modal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusVariant(status: string) {
  switch (status) {
    case "Completed":                return "success";
    case "Processing":               return "warning";
    case "In-review":                return "secondary";
    case "Rejected":                 return "destructive";
    case "Awaiting Final Approval":  return "outline";
    case "Pending":
    case "Partially Completed":      return "pending";
    default:                         return "default";
  }
}

const EDITABLE_STATUSES = ["Submitted", "Rejected"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function FormsClientPage({
  templates,
  submissions,
  batches = [],
  pendingRequests = [],
  isAdmin,
}: {
  templates: any[];
  submissions: any[];
  batches?: any[];
  pendingRequests?: any[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ? Number(session.user.id) : null;

  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as any) || "submitted";
  const [activeTab, setActiveTab]           = useState<"back_office" | "account_services" | "submitted">(initialTab);
  const [searchQuery, setSearchQuery]        = useState("");

  // ── Template delete modal ──
  const [templateToDelete, setTemplateToDelete] = useState<any>(null);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);

  // ── Template copy state ──
  const [isCopyingTemplate, setIsCopyingTemplate] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // ── Template toggle visibility state ──
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);

  // ── Submission delete modal ──
  const [submissionToDelete, setSubmissionToDelete] = useState<any>(null);
  const [isDeletingSubmission, startDeleteSubmission] = useTransition();
  const [deleteSubError, setDeleteSubError] = useState("");

  // ── Request delete modal ──
  const [requestToDelete, setRequestToDelete] = useState<any>(null);
  const [isDeletingRequest, startDeleteRequest] = useTransition();
  const [deleteReqError, setDeleteReqError] = useState("");

  // ── Submission edit modal ──
  const [submissionToEdit, setSubmissionToEdit]     = useState<any>(null);

  // ── Rejection reason viewer ──
  const [viewingReason, setViewingReason]           = useState<any | null>(null); // holds the submission
  const [viewingApproval, setViewingApproval]       = useState<any | null>(null);
  const [viewingCorrection, setViewingCorrection]   = useState<any | null>(null);

  const [formNavError, setFormNavError]             = useState("");

  const [closedAccordions, setClosedAccordions]     = useState<Record<string, boolean>>({});

  const toggleAccordion = (owner: string) => {
    setClosedAccordions(prev => ({
      ...prev,
      [owner]: !prev[owner]
    }));
  };

  const allFilteredForms = templates.filter((f: any) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
    f.formOwner !== "System"
  );
  
  const backOfficeForms = allFilteredForms.filter((f: any) => !f.accountServicesEnabled);
  const accountServicesForms = allFilteredForms.filter((f: any) => f.accountServicesEnabled);

  const mobileFilter = searchParams.get("mobile") === "true";
  const statusFilter = searchParams.get("status");

  const activeSubmissions = submissions.filter((s: any) => {
    // If status is specified, only show that status. Otherwise exclude Completed.
    if (statusFilter) {
      if (s.status !== statusFilter) return false;
    } else {
      if (s.status === "Completed") return false;
    }
    
    // If mobile filter is true, only show submissions for mobile-enabled forms
    if (mobileFilter) {
      if (!s.template?.mobileEnabled) return false;
    }
    
    return true;
  });

  const activeBatches = batches.filter((b: any) => {
    if (statusFilter) {
      if (b.status !== statusFilter) return false;
    } else {
      if (b.status === "Completed") return false;
    }
    return true;
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    setIsDeletingTemplate(true);
    const res = await deleteFormTemplate(templateToDelete.id);
    setIsDeletingTemplate(false);
    if (res.success) {
      setTemplateToDelete(null);
      router.refresh();
    } else {
      alert(res.error || "Failed to delete form.");
    }
  };

  const handleCopyTemplate = async (formId: string) => {
    setIsCopyingTemplate(true);
    setOpenMenuId(null);
    const res = await copyFormTemplate(formId);
    setIsCopyingTemplate(false);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to copy form.");
    }
  };

  const handleToggleVisibility = async (formId: string, isHidden?: boolean, isActive?: boolean) => {
    setIsTogglingVisibility(true);
    setOpenMenuId(null);
    const res = await toggleFormVisibility(formId, isHidden, isActive);
    setIsTogglingVisibility(false);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to update form.");
    }
  };

  const handleFormClick = async (formId: string) => {
    setFormNavError("");
    const sigRes = await getMySignature();
    if (!sigRes.success || !sigRes.signatureData) {
      setFormNavError("You must configure your signature in your profile before filling out forms.");
      return;
    }
    router.push(`/dashboard/forms/${formId}`);
  };

  const handleDeleteSubmission = () => {
    if (!submissionToDelete) return;
    setDeleteSubError("");
    startDeleteSubmission(async () => {
      const res = await deleteSubmission(submissionToDelete.id);
      if (res.success) {
        setSubmissionToDelete(null);
        router.refresh();
      } else {
        setDeleteSubError(res.error || "Failed to delete submission.");
      }
    });
  };

  const handleDeleteRequest = () => {
    if (!requestToDelete) return;
    setDeleteReqError("");
    startDeleteRequest(async () => {
      const res = await deleteFormRequestBatch(requestToDelete.id);
      if (res.success) {
        setRequestToDelete(null);
        router.refresh();
      } else {
        setDeleteReqError(res.error || "Failed to delete request.");
      }
    });
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Forms Repository</h2>
          <p className="text-gray-500">Access available forms and track your submissions.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-60 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Search forms…"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {isAdmin && (
            <Link href="/dashboard/forms/builder">
              <Button className="cursor-pointer">
                <PlusCircle className="w-4 h-4 mr-2" /> Create Form
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
        {(["submitted", "back_office", "account_services"] as const).map((tab) => (
          <button
            key={tab}
            id={`forms-tab-${tab}`}
            className={`pb-3 font-medium text-sm transition-colors relative cursor-pointer whitespace-nowrap ${
              activeTab === tab ? "text-primary" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "back_office" && "Back Office Forms"}
            {tab === "account_services" && "Account Forms"}
            {tab === "submitted" && `My Submissions (${activeSubmissions.length})`}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-md" />
            )}
          </button>
        ))}
      </div>

      {/* ── Back Office & Account Services tabs ── */}
      {(activeTab === "back_office" || activeTab === "account_services") && (() => {
        const displayedForms = activeTab === "back_office" ? backOfficeForms : accountServicesForms;
        
        // Group forms by owner
        const groupedForms = displayedForms.reduce((acc: any, form: any) => {
          const owner = form.formOwner || "General";
          if (!acc[owner]) acc[owner] = [];
          acc[owner].push(form);
          return acc;
        }, {});

        const sortedOwners = Object.keys(groupedForms).sort((a, b) => {
          if (a === "General") return 1;
          if (b === "General") return -1;
          return a.localeCompare(b);
        });

        return (
          <div className="space-y-6 pb-8">
            {formNavError && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl mb-4">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                {formNavError}
              </div>
            )}
            
            {sortedOwners.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                No forms found in this category.
              </div>
            ) : (
              sortedOwners.map((owner) => {
                const isClosed = closedAccordions[owner];
                return (
                  <div key={owner} className="bg-white border border-gray-100 rounded-xl shadow-sm">
                    <button
                      className={`w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-100 transition-colors cursor-pointer ${isClosed ? 'rounded-xl' : 'rounded-t-xl'}`}
                      onClick={() => toggleAccordion(owner)}
                    >
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-gray-800 text-base">{owner}</h3>
                        <Badge variant="secondary" className="text-xs bg-white text-gray-500 font-semibold border-gray-200">{groupedForms[owner].length}</Badge>
                      </div>
                      {isClosed ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronUp className="w-5 h-5 text-gray-400" />}
                    </button>
                    
                    {!isClosed && (
                      <div className="p-5 border-t border-gray-100 bg-white rounded-b-xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {groupedForms[owner].map((form: any) => (
                            <Card
                              key={form.id}
                              className={`hover:shadow-md transition-all cursor-pointer border-l-4 group relative ${activeTab === 'account_services' ? 'border-l-indigo-500' : 'border-l-primary'} rounded-xl ${openMenuId === form.id ? 'z-20' : 'z-0'}`}
                              onClick={() => handleFormClick(form.id)}
                            >
                              <CardContent className="p-5">
                                {isAdmin && (
                                <div className={`absolute top-3 right-3 flex items-center justify-end ${openMenuId === form.id ? 'z-20' : 'z-0'}`}>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === form.id ? null : form.id); }}
                                      className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                    
                                    {openMenuId === form.id && (
                                      <>
                                        <div className="fixed inset-0 z-10 cursor-default" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                                        <div className="absolute top-8 right-0 bg-white border border-gray-100 shadow-lg rounded-xl overflow-hidden py-1 min-w-[120px] animate-in fade-in slide-in-from-top-2 z-20">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); router.push(`/dashboard/forms/builder?id=${form.id}`); }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary flex items-center gap-2 cursor-pointer relative z-30"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" /> Edit
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleCopyTemplate(form.id); }}
                                            disabled={isCopyingTemplate}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary flex items-center gap-2 cursor-pointer relative z-30"
                                          >
                                            <Copy className="w-3.5 h-3.5" /> {isCopyingTemplate && openMenuId === form.id ? "..." : "Copy"}
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleToggleVisibility(form.id, !form.isHidden, undefined); }}
                                            disabled={isTogglingVisibility}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary flex items-center gap-2 cursor-pointer relative z-30"
                                          >
                                            {form.isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} {form.isHidden ? "Unhide" : "Hide"}
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleToggleVisibility(form.id, undefined, !form.isActive); }}
                                            disabled={isTogglingVisibility}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary flex items-center gap-2 cursor-pointer relative z-30"
                                          >
                                            {form.isActive ? <PowerOff className="w-3.5 h-3.5 text-red-500" /> : <Power className="w-3.5 h-3.5 text-green-500" />} {form.isActive ? "Deactivate" : "Activate"}
                                          </button>
                                          <div className="h-px bg-gray-100 my-1 relative z-30" />
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setTemplateToDelete(form); }}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer relative z-30"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <div className={`${activeTab === 'account_services' ? 'bg-indigo-100 text-indigo-600' : 'bg-primary/10 text-primary'} w-9 h-9 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                                    <FilePlus className="w-5 h-5" />
                                  </div>
                                  {isAdmin && form.isHidden && <Badge variant="secondary" className="mb-3 h-6">Hidden</Badge>}
                                  {isAdmin && !form.isActive && <Badge variant="destructive" className="mb-3 h-6 bg-red-100 text-red-700 hover:bg-red-200 border-red-200">Deactivated</Badge>}
                                </div>
                                <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1 leading-tight">{form.name}</h3>
                                <p className="text-xs text-gray-400 line-clamp-2">{form.description}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        );
      })()}

      {/* ── My Submissions tab ── */}
      {activeTab === "submitted" && (
        <div className="grid gap-3">
          {(() => {
            const unified = [
              ...pendingRequests.map((req: any) => ({ type: 'pending', data: req, date: new Date(req.createdAt).getTime() })),
              ...activeBatches.map((batch: any) => ({ type: 'batch', data: batch, date: new Date(batch.createdAt).getTime() })),
              ...activeSubmissions.map((s: any) => ({ type: 'submission', data: s, date: new Date(s.createdAt).getTime() }))
            ];
            unified.sort((a, b) => b.date - a.date);

            if (unified.length === 0) {
              return (
                <div className="py-16 text-center text-gray-400">
                  You haven&apos;t submitted any active forms yet.
                </div>
              );
            }

            return unified.map((item, index) => {
              if (item.type === 'pending') {
                const req = item.data;
                return (
                  <Card key={`pending-${req.id}-${index}`} className="hover:shadow-sm transition-shadow border-l-4 border-l-orange-400 bg-orange-50/30">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 cursor-pointer min-w-0" onClick={() => router.push(`/dashboard/forms/${req.batch?.template?.id}?requestToken=${req.token}`)}>
                        <div className="bg-orange-100 p-2 rounded-md shrink-0">
                          <AlertTriangle className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {req.batch?.template?.name || "Form"}
                          </h4>
                          <p className="text-xs text-gray-500">
                            Requested by {req.batch?.requestedBy} on {new Date(req.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600 text-white">Action Required</Badge>
                        <ChevronRight 
                          className="w-4 h-4 text-gray-300 cursor-pointer" 
                          onClick={() => router.push(`/dashboard/forms/${req.batch?.template?.id}?requestToken=${req.token}`)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              if (item.type === 'batch') {
                const batch = item.data;
                const total = batch.requests?.length || 0;
                const completed = batch.requests?.filter((r: any) => r.status === "Completed").length || 0;
                return (
                  <Card key={`batch-${batch.id}-${index}`} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 cursor-pointer min-w-0" onClick={() => router.push(`/dashboard/forms/request/${batch.id}`)}>
                        <div className="bg-blue-100 p-2 rounded-md shrink-0">
                          <Send className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            Request — {batch.template?.name || "Form"}
                          </h4>
                          <p className="text-xs text-gray-500">
                            Requested {new Date(batch.createdAt).toLocaleDateString()} · {completed} of {total} completed
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={batch.status === "Completed" ? "success" : "pending"}>{batch.status}</Badge>
                        <ChevronRight 
                          className="w-4 h-4 text-gray-300 cursor-pointer" 
                          onClick={() => router.push(`/dashboard/forms/request/${batch.id}`)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              if (item.type === 'submission') {
                const s = item.data;
                const canEditOrDelete =
                  (currentUserId === null || s.submittedById === currentUserId) &&
                  EDITABLE_STATUSES.includes(s.status);

                return (
                  <Card
                    key={`sub-${s.id}-${index}`}
                    className="hover:shadow-sm transition-shadow"
                  >
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      {/* Left — click to view */}
                      <div
                        className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                        onClick={() => router.push(`/dashboard/forms/submission/${s.id}`)}
                      >
                        <div className="bg-gray-100 p-2 rounded-md shrink-0">
                          <ListCollapse className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {s.reference || s.id.slice(-8).toUpperCase()} — {s.formName}
                          </h4>
                          <p className="text-xs text-gray-400">
                            Submitted {new Date(s.createdAt).toLocaleDateString()} ·{" "}
                            {s.signatories?.length ?? 0} signator{s.signatories?.length === 1 ? "y" : "ies"}
                          </p>
                        </div>
                      </div>

                      {/* Right — status + actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={statusVariant(s.status) as any}>{s.status}</Badge>

                        {canEditOrDelete && (
                          <>
                            <button
                              id={`edit-submission-${s.id}`}
                              onClick={() => setSubmissionToEdit(s)}
                              title="Edit & Resubmit"
                              className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              id={`delete-submission-${s.id}`}
                              onClick={() => { setDeleteSubError(""); setSubmissionToDelete(s); }}
                              title="Delete Submission"
                              className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* Rejection reason icon — only when Rejected and has reason */}
                        {s.status === "Rejected" &&
                          s.signatories?.some((sig: any) => sig.status === "Declined" && sig.declineReason) && (
                            <button
                              id={`view-reason-${s.id}`}
                              onClick={() => setViewingReason(s)}
                              title="View rejection reason"
                              className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}

                        {/* Approval comment icon — only when signed and has comment */}
                        {s.signatories?.some((sig: any) => sig.status === "Signed" && sig.approvalComment) && (
                            <button
                              id={`view-approval-${s.id}`}
                              onClick={(e) => { e.stopPropagation(); setViewingApproval(s); }}
                              title="View approval comments"
                              className="p-1.5 rounded-md text-green-500 hover:text-green-700 hover:bg-green-50 transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}

                        {/* Correction message icon — only when Awaiting Correction and has correctionRequests */}
                        {s.status === "Awaiting Correction" && s.correctionRequests && Object.keys(s.correctionRequests).length > 0 && (
                            <button
                              id={`view-correction-${s.id}`}
                              onClick={(e) => { e.stopPropagation(); setViewingCorrection(s); }}
                              title="View correction messages"
                              className="p-1.5 rounded-md text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}

                        <ChevronRight
                          className="w-4 h-4 text-gray-300 cursor-pointer"
                          onClick={() => router.push(`/dashboard/forms/submission/${s.id}`)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              return null;
            });
          })()}
        </div>
      )}

      {/* ── Template delete modal ── */}
      {templateToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden text-center">
            <div className="p-6">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Template?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-gray-900">&ldquo;{templateToDelete.name}&rdquo;</span>?
                This action cannot be undone.
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => setTemplateToDelete(null)} disabled={isDeletingTemplate}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 cursor-pointer"
                  onClick={handleDeleteTemplate}
                  disabled={isDeletingTemplate}
                >
                  {isDeletingTemplate ? "Deleting…" : "Delete Template"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Submission delete modal ── */}
      {submissionToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden text-center">
            <div className="p-6">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Submission?</h3>
              <p className="text-sm text-gray-500 mb-2">
                Are you sure you want to permanently delete{" "}
                <span className="font-semibold text-gray-900">
                  {submissionToDelete.reference
                    ? `${submissionToDelete.reference} — ${submissionToDelete.formName}`
                    : submissionToDelete.formName}
                </span>?
              </p>
              <p className="text-xs text-gray-400 mb-5">
                This will also remove all signatory records. This action cannot be undone.
              </p>
              {deleteSubError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{deleteSubError}</p>
              )}
              <div className="flex justify-center gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setSubmissionToDelete(null)} disabled={isDeletingSubmission}>
                  Cancel
                </Button>
                <Button
                  id="confirm-delete-submission-btn"
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDeleteSubmission}
                  disabled={isDeletingSubmission}
                >
                  {isDeletingSubmission ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit submission modal ── */}
      {submissionToEdit && (
        <EditSubmissionModal
          submission={submissionToEdit}
          onClose={() => setSubmissionToEdit(null)}
          onSaved={() => {
            setSubmissionToEdit(null);
            router.refresh();
          }}
        />
      )}

      {/* ── Rejection reason modal ── */}
      {viewingReason && (() => {
        const declined = (viewingReason.signatories ?? []).filter(
          (sig: any) => sig.status === "Declined" && sig.declineReason
        );
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-red-100 shrink-0">
                      <MessageCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Rejection Reason</h3>
                      <p className="text-xs text-gray-400">
                        {viewingReason.reference
                          ? `${viewingReason.reference} · `
                          : ""}{viewingReason.formName}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingReason(null)}
                    className="p-1.5 rounded-full hover:bg-gray-100 transition-colors shrink-0 text-gray-400 hover:text-gray-600 text-xl leading-none"
                    aria-label="Close"
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-3">
                  {declined.map((sig: any) => (
                    <div key={sig.id} className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-red-800">{sig.userName}</span>
                        <span className="text-xs text-red-400">{sig.email}</span>
                      </div>
                      <p className="text-sm text-red-700 leading-relaxed">{sig.declineReason}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <Button variant="outline" onClick={() => setViewingReason(null)}>Close</Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Approval comment modal ── */}
      {viewingApproval && (() => {
        const approved = (viewingApproval.signatories ?? []).filter(
          (sig: any) => sig.status === "Signed" && sig.approvalComment
        );
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-green-100 shrink-0">
                      <MessageCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Approval Comments</h3>
                      <p className="text-xs text-gray-400">
                        {viewingApproval.reference
                          ? `${viewingApproval.reference} · `
                          : ""}{viewingApproval.formName}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingApproval(null)}
                    className="p-1.5 rounded-full hover:bg-gray-100 transition-colors shrink-0 text-gray-400 hover:text-gray-600 text-xl leading-none"
                    aria-label="Close"
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {approved.map((sig: any) => (
                    <div key={sig.id} className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-green-800">{sig.userName}</span>
                        <span className="text-xs text-green-600">{sig.email}</span>
                      </div>
                      <p className="text-sm text-green-800 leading-relaxed">{sig.approvalComment}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <Button variant="outline" onClick={() => setViewingApproval(null)}>Close</Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Correction messages modal ── */}
      {viewingCorrection && (() => {
        const requests = viewingCorrection.correctionRequests || {};
        const entries = Object.entries(requests);
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-amber-100 shrink-0">
                      <MessageCircle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Correction Requests</h3>
                      <p className="text-xs text-gray-400">
                        {viewingCorrection.reference
                          ? `${viewingCorrection.reference} · `
                          : ""}{viewingCorrection.formName}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingCorrection(null)}
                    className="p-1.5 rounded-full hover:bg-gray-100 transition-colors shrink-0 text-gray-400 hover:text-gray-600 text-xl leading-none"
                    aria-label="Close"
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {entries.map(([fieldId, message]: [string, any], i) => (
                    <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-amber-800">Field Needs Correction</span>
                      </div>
                      <p className="text-sm text-amber-800 leading-relaxed">{message}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setViewingCorrection(null)}>Close</Button>
                  <Button onClick={() => router.push(`/dashboard/forms/submission/${viewingCorrection.id}`)}>
                    View Submission
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
