"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileDown, Printer, ChevronRight, CheckSquare, X, User, Calendar, FileText } from "lucide-react";
import { fileAttachments } from "@/app/actions/form";

type ActionItem = {
  id: string;
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
  const [selected, setSelected] = useState<ActionItem | null>(null);
  const [isFiling, startFiling] = useTransition();

  const handleFileAction = () => {
    if (!selected || selected.status === "Filed") return;
    startFiling(async () => {
      const res = await fileAttachments(selected.id);
      if (res.success) {
        // Optimistically update the selected object
        setSelected({ ...selected, status: "Filed" });
      } else {
        alert(res.error || "Failed to file attachments.");
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl print:space-y-0">
      <div className="print:hidden">
        <h2 className="text-2xl font-bold tracking-tight">Action Center</h2>
        <p className="text-gray-500">Treat approved and signed forms. View submitted responses and generate documents.</p>
      </div>

      {!selected ? (
        <div className="grid gap-3">
          {items.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No completed forms to treat at the moment.</p>
            </div>
          ) : (
            items.map((item) => (
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
                        <span>Ref: {item.id.slice(-8).toUpperCase()}</span>
                        <span>By: {item.submittedBy?.user_name ?? "Unknown"}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={item.status === "Filed" ? "secondary" : "success"}>
                      {item.status === "Filed" ? "Filed" : "Completed"}
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
              <a href={`/api/pdf?id=${selected.id}`} download>
                <Button size="sm" className="cursor-pointer">
                  <FileDown className="w-4 h-4 mr-2" /> Download PDF
                </Button>
              </a>
              <Button size="sm" variant="outline" onClick={() => window.open(`/api/pdf?id=${selected.id}&action=print`, "_blank")} className="cursor-pointer">
                <Printer className="w-4 h-4 mr-2" /> Print
              </Button>
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={handleFileAction} 
                disabled={selected.status === "Filed" || isFiling}
                className="cursor-pointer bg-blue-50 text-blue-600 hover:bg-blue-100 border-transparent"
              >
                <FileText className="w-4 h-4 mr-2" /> 
                {isFiling ? "Filing..." : selected.status === "Filed" ? "Filed" : "File"}
              </Button>
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
                  <Badge variant={selected.status === "Filed" ? "secondary" : "success"}>
                    {selected.status === "Filed" ? "Filed" : "Fully Approved & Signed"}
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
    </div>
  );
}
