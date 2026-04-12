"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileDown, ChevronRight, CheckSquare, X, User } from "lucide-react";
import { assignToSelf, completeProcessWithApprover, searchActiveWorkflowUsers } from "@/app/actions/workflow";

type ActionItem = {
  id: string;
  reference?: string | null;
  formName: string;
  status: string;
  formResponses: Record<string, any>;
  signingType: string;
  createdAt: string;
  template: { name: string; formOwner: string; formTreater: string };
  signatories: Array<{ userName: string; email: string; status: string; signedAt: string; position: number }>;
  submittedBy: { user_name: string; finca_email: string; branch: string } | null;
};

export default function ActionClient({ items }: { items: ActionItem[] }) {
  const [localItems, setLocalItems] = useState<ActionItem[]>(items);
  const [selected, setSelected] = useState<ActionItem | null>(null);

  // Sync a status change across both the list and the detail view
  const updateItemStatus = (id: string, newStatus: string) => {
    setLocalItems(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
    setSelected(prev => prev?.id === id ? { ...prev, status: newStatus } : prev);
  };

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusMode, setStatusMode] = useState<"assign" | "complete" | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedApprover, setSelectedApprover] = useState<any>(null);
  const [isChanging, setIsChanging] = useState(false);

  // Live search — fires on every keystroke
  useEffect(() => {
    if (statusMode !== "complete") return;
    const run = async () => {
      if (searchQuery.length < 1) {
        setSearchResults([{ _none: true }]);
        return;
      }
      const res = await searchActiveWorkflowUsers(searchQuery);
      setSearchResults([{ _none: true }, ...res]);
    };
    const t = setTimeout(run, 250);
    return () => clearTimeout(t);
  }, [searchQuery, statusMode]);

  // Reset complete-mode state when modal opens
  const openStatusModal = () => {
    setStatusMode("");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedApprover(null);
    setShowStatusModal(true);
  };

  const handleAssignSelf = async () => {
    setIsChanging(true);
    const res = await assignToSelf(selected!.id);
    setIsChanging(false);
    if (res.success && res.newStatus) {
      updateItemStatus(selected!.id, res.newStatus);
      setShowStatusModal(false);
      setStatusMode("");
    }
  };

  const handleCompleteProcess = async () => {
    setIsChanging(true);
    const isNone = selectedApprover?._none;
    const email = isNone ? undefined : selectedApprover?.finca_email;
    const name = isNone ? undefined : selectedApprover?.user_name;
    const res = await completeProcessWithApprover(selected!.id, email, name);
    setIsChanging(false);
    if (res.success) {
      const newStatus = email ? "In-review" : "Completed";
      updateItemStatus(selected!.id, newStatus);
      // Remove from local list if no longer belongs to Action Center
      if (!email) {
        setLocalItems(prev => prev.filter(i => i.id !== selected!.id));
      }
      setSelected(null);
      setShowStatusModal(false);
      setStatusMode("");
      setSelectedApprover(null);
      setSearchResults([]);
      setSearchQuery("");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl print:space-y-0">
      <div className="print:hidden">
        <h2 className="text-2xl font-bold tracking-tight">Action Center</h2>
        <p className="text-gray-500">Treat approved and signed forms. View submitted responses and generate documents.</p>
      </div>

      {!selected ? (
        <div className="grid gap-3">
          {localItems.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No completed forms to treat at the moment.</p>
            </div>
          ) : (
            localItems.map((item) => (
              <Card 
                key={item.id} 
                className="hover:shadow-md transition-all cursor-pointer group border-l-4 border-l-green-500" 
                onClick={() => setSelected(item)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-xl">
                      <CheckSquare className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.template.name}</h4>
                      <div className="text-xs text-gray-400 mt-1 flex gap-3">
                        <span>Ref: {item.reference || item.id.slice(-8).toUpperCase()}</span>
                        <span>By: {item.submittedBy?.user_name ?? "Unknown"}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={
                      item.status === "Filed" ? "secondary" :
                      item.status === "Processing" ? "warning" :
                      item.status.startsWith("Assigned") ? "default" : "success"
                    }>
                      {item.status}
                    </Badge>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-center print:hidden">
            <Button variant="outline" onClick={() => setSelected(null)} className="cursor-pointer">
              ← Back to List
            </Button>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={openStatusModal} className="cursor-pointer">
                Change Status
              </Button>
              <a href={`/api/pdf?id=${selected.id}`} download>
                <Button size="sm" className="cursor-pointer">
                  <FileDown className="w-4 h-4 mr-2" /> Download PDF
                </Button>
              </a>
            </div>
          </div>

          <div className="bg-white border shadow-xl max-w-[800px] p-8 md:p-12 mx-auto font-sans text-sm relative print:shadow-none print:border-none print:m-0 print:p-0">
            
            {/* Logo */}
            <div className="flex justify-between items-start mb-10">
              <div className="flex items-center gap-2 text-[#B50938] font-bold text-2xl">
                <div className="h-10 w-10 bg-[#B50938] rounded-full flex items-center justify-center text-white text-xl">F</div>
                <span>FINCA</span>
              </div>
              <div className="text-right">
                <h1 className="text-xl font-bold text-gray-900 uppercase tracking-tight">{selected.template.name}</h1>
                <p className="text-xs text-gray-500 mt-1">Ref: {selected.id.toUpperCase()}</p>
              </div>
            </div>

            {/* Form Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Submitted By</h3>
                  <p className="font-medium text-gray-900">{selected.submittedBy?.user_name}</p>
                  <p className="text-xs text-gray-500">{selected.submittedBy?.branch}</p>
                </div>
                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Date Submitted</h3>
                  <p className="font-medium text-gray-900">{new Date(selected.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Form Treater</h3>
                  <p className="font-medium text-gray-900">{selected.template.formTreater}</p>
                </div>
                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</h3>
                  <Badge variant={
                    selected.status === "Filed" ? "secondary" :
                    selected.status === "Processing" ? "warning" :
                    selected.status.startsWith("Assigned") ? "default" : "success"
                  }>
                    {selected.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="mb-10">
               <div className="bg-gray-900 rounded-t-lg text-white px-4 py-2.5 text-[10px] font-bold flex">
                  <div className="w-1/2">FORM FIELD</div>
                  <div className="w-1/2">VALUE/RESPONSE</div>
               </div>
               <div className="border-x border-b rounded-b-lg border-gray-100 divide-y divide-gray-100">
                  {Object.entries(selected.formResponses).map(([key, val], i) => (
                    <div key={i} className="flex px-4 py-3 text-xs">
                      <div className="w-1/2 font-semibold text-gray-700">{key}</div>
                      <div className="w-1/2 text-gray-600 truncate">{String(val)}</div>
                    </div>
                  ))}
               </div>
            </div>

            {/* Signatures */}
            <div>
               <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Digitally Signed By</h3>
               <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                  {selected.signatories.map((sig, i) => (
                    <div key={i} className="border-b border-gray-100 pb-2">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-xs font-bold text-gray-900">{sig.userName}</span>
                        <span className="text-[8px] text-gray-400">{new Date(sig.signedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mb-2">{sig.email}</div>
                      <div className="h-8 flex items-center">
                         <span className="font-signature text-xl text-[#B50938] opacity-60">~{sig.userName.split(' ')[0]}</span>
                      </div>
                    </div>
                  ))}
               </div>
            </div>

            {/* QR Seal Mockup */}
            <div className="absolute bottom-12 right-12 opacity-10">
               <div className="w-16 h-16 border-4 border-gray-900 flex items-center justify-center p-1">
                  <div className="grid grid-cols-3 grid-rows-3 gap-0.5 w-full h-full">
                     {[...Array(9)].map((_, i) => (
                       <div key={i} className={`bg-gray-900 ${i % 3 === 0 ? 'opacity-100' : 'opacity-40'}`}></div>
                     ))}
                  </div>
               </div>
            </div>

          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
               <h3 className="font-semibold text-gray-800">Change Status</h3>
               <button onClick={() => { setShowStatusModal(false); setStatusMode(""); }} className="text-gray-400 hover:text-gray-600">
                 <X className="w-5 h-5" />
               </button>
            </div>
            <div className="p-6">
              {!statusMode && (
                <div className="flex flex-col gap-3">
                  <Button
                    variant="outline"
                    className="h-14 justify-start px-6 cursor-pointer hover:bg-primary/5 hover:border-primary/50 disabled:opacity-40"
                    disabled={selected.status.startsWith("Assigned")}
                    onClick={() => { setStatusMode("assign"); handleAssignSelf(); }}
                  >
                    <User className="w-5 h-5 mr-3 text-primary" />
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">Assign to Self</div>
                      <div className="text-xs text-gray-500 font-normal">
                        {selected.status.startsWith("Assigned") ? `Already ${selected.status}` : "Take ownership of treating this form"}
                      </div>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-14 justify-start px-6 cursor-pointer hover:bg-green-50 hover:border-green-300" onClick={() => setStatusMode("complete")}>
                    <CheckSquare className="w-5 h-5 mr-3 text-green-600" />
                    <div className="text-left"><div className="font-semibold text-gray-900">Complete Process</div><div className="text-xs text-gray-500 font-normal">Finish treating and optionally route to an approver</div></div>
                  </Button>
                </div>
              )}

              {statusMode === "assign" && (
                 <div className="text-center py-8">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                   <p className="text-sm text-gray-500">Assigning to you...</p>
                 </div>
              )}

              {statusMode === "complete" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <p className="text-sm text-gray-600">Search for a final approver, or choose <strong>None</strong> to complete without routing.</p>

                  <div>
                    <input
                      autoFocus
                      className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                      placeholder="Type a name or email to search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto bg-white divide-y divide-gray-100 shadow-sm">
                      {searchResults.map((u, idx) =>
                        u._none ? (
                          <button
                            key="none"
                            onClick={() => setSelectedApprover({ _none: true })}
                            className={`w-full text-left text-sm p-3 transition-colors cursor-pointer flex items-center gap-2 ${
                              selectedApprover?._none ? "bg-primary text-white" : "hover:bg-gray-50 text-gray-700"
                            }`}
                          >
                            <span className="text-lg">🚫</span>
                            <div>
                              <div className="font-semibold">None</div>
                              <div className="text-xs opacity-70">Complete without routing to an approver</div>
                            </div>
                          </button>
                        ) : (
                          <button
                            key={u.finca_email}
                            onClick={() => setSelectedApprover(u)}
                            className={`w-full text-left text-sm p-3 transition-colors cursor-pointer ${
                              selectedApprover?.finca_email === u.finca_email ? "bg-primary text-white" : "hover:bg-gray-50 text-gray-800"
                            }`}
                          >
                            <div className="font-medium">{u.user_name}</div>
                            <div className="text-xs opacity-70">{u.finca_email}</div>
                          </button>
                        )
                      )}
                    </div>
                  )}

                  {selectedApprover && (
                    <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                      Selected: <strong>{selectedApprover._none ? "None (complete without approver)" : `${selectedApprover.user_name} — ${selectedApprover.finca_email}`}</strong>
                    </div>
                  )}

                  <Button
                    className="w-full cursor-pointer"
                    disabled={!selectedApprover || isChanging}
                    onClick={handleCompleteProcess}
                  >
                    {isChanging ? "Saving..." : "Confirm & Submit"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
