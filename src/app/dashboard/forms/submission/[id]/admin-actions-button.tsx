"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, Settings, UserPlus, XOctagon, SkipForward, ChevronDown } from "lucide-react";
import { softDeleteSubmission, reassignSubmitter, forceRejectSubmission, bypassCorrection } from "@/app/actions/form";

type ActionType = "Reassign" | "ForceReject" | "BypassCorrection" | "Delete" | null;

export function AdminActionsButton({ submissionId, users }: { submissionId: string, users: any[] }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  
  const [reason, setReason] = useState("");
  const [newSubmitterId, setNewSubmitterId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleActionClick(action: ActionType) {
    setActiveAction(action);
    setMenuOpen(false);
    setReason("");
    setNewSubmitterId("");
    setError("");
  }

  async function handleSubmit() {
    if (!reason.trim()) {
      setError("Please enter a reason.");
      return;
    }
    
    if (activeAction === "Reassign" && !newSubmitterId) {
      setError("Please select a new submitter.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let res;
      if (activeAction === "Reassign") res = await reassignSubmitter(submissionId, Number(newSubmitterId), reason);
      else if (activeAction === "ForceReject") res = await forceRejectSubmission(submissionId, reason);
      else if (activeAction === "BypassCorrection") res = await bypassCorrection(submissionId, reason);
      else if (activeAction === "Delete") res = await softDeleteSubmission(submissionId, reason);
      
      if (res?.success === false) throw new Error(res.error || "Action failed");
      
      setActiveAction(null);
      router.refresh();
      if (activeAction === "Delete") router.push("/dashboard/forms");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const getActionConfig = () => {
    switch(activeAction) {
      case "Reassign": return { title: "Reassign Submitter", desc: "Transfer ownership of this submission to a different user.", icon: <UserPlus className="w-5 h-5 text-blue-600" />, bg: "bg-blue-100", btnClass: "bg-blue-600 hover:bg-blue-700" };
      case "ForceReject": return { title: "Force Reject", desc: "Forcibly terminate this submission. It will be marked as Rejected.", icon: <XOctagon className="w-5 h-5 text-red-600" />, bg: "bg-red-100", btnClass: "bg-red-600 hover:bg-red-700" };
      case "BypassCorrection": return { title: "Bypass Correction", desc: "Move this submission from 'Awaiting Correction' back to 'Processing'.", icon: <SkipForward className="w-5 h-5 text-amber-600" />, bg: "bg-amber-100", btnClass: "bg-amber-600 hover:bg-amber-700" };
      case "Delete": return { title: "Soft Delete", desc: "Mark this submission as deleted and remove it from standard views.", icon: <Trash2 className="w-5 h-5 text-red-600" />, bg: "bg-red-100", btnClass: "bg-red-600 hover:bg-red-700" };
      default: return null;
    }
  };

  const config = getActionConfig();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors shadow-sm"
      >
        <Settings className="w-4 h-4" />
        Admin Actions
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="py-1">
            <button onClick={() => handleActionClick("Reassign")} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left">
              <UserPlus className="w-4 h-4 text-blue-500" /> Reassign Submitter
            </button>
            <button onClick={() => handleActionClick("ForceReject")} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left">
              <XOctagon className="w-4 h-4 text-red-500" /> Force Reject
            </button>
            <button onClick={() => handleActionClick("BypassCorrection")} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left">
              <SkipForward className="w-4 h-4 text-amber-500" /> Bypass Correction
            </button>
            <div className="h-px bg-gray-200 my-1"></div>
            <button onClick={() => handleActionClick("Delete")} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left">
              <Trash2 className="w-4 h-4" /> Delete Submission
            </button>
          </div>
        </div>
      )}

      {activeAction && config && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${config.bg}`}>
                {config.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{config.title}</h3>
              <p className="text-sm text-gray-500 mb-6">{config.desc}</p>

              <div className="space-y-4">
                {activeAction === "Reassign" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select New Submitter</label>
                    <select
                      value={newSubmitterId}
                      onChange={(e) => setNewSubmitterId(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    >
                      <option value="" disabled>Search users...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.user_name} ({u.finca_email})</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason for override</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter justification for the audit log"
                    rows={3}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setActiveAction(null)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !reason.trim() || (activeAction === "Reassign" && !newSubmitterId)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${config.btnClass}`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : config.icon}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
