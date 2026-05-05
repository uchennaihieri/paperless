"use client";

import { useState, useEffect } from "react";
import { X, Loader2, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActionItems } from "@/app/actions/form";
import { useSession } from "next-auth/react";
import { BatchJournalModal } from "./BatchJournalModal";

type ActionItem = {
  id: string;
  reference?: string | null;
  formName: string;
  status: string;
  createdAt: string;
  treaterEmail?: string | null;
  template: { name: string; formOwner: string; formTreater: string };
  submittedBy: { user_name: string; finca_email: string; branch: string } | null;
  hasCommittedJournal?: boolean;
};

export function AddActionItemsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const currentUserEmail = (session?.user as any)?.email?.toLowerCase() ?? "";

  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchItems, setBatchItems] = useState<ActionItem[] | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getActionItems()
        .then((data) => {
          const allItems = data as ActionItem[];
          const assignedToMe = allItems.filter(
            (item) => item.status?.startsWith("Assigned") && item.treaterEmail?.toLowerCase() === currentUserEmail && !item.hasCommittedJournal
          );
          setItems(assignedToMe);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setSelectedIds(new Set()); // reset on close
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleAddSelected = () => {
    const selected = items.filter((i) => selectedIds.has(i.id));
    setBatchItems(selected);
  };

  const handleBatchComplete = () => {
    setBatchItems(null);
    setSelectedIds(new Set());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add Items from Action Center</h2>
            <p className="text-xs text-gray-500">Select items from your action center</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <CheckSquare className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No items found</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-gray-100 border-b border-gray-200 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === items.length && items.length > 0}
                        onChange={toggleAll}
                        className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer w-4 h-4"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold text-xs">Form Name</th>
                    <th className="px-4 py-3 font-semibold text-xs">Reference</th>
                    <th className="px-4 py-3 font-semibold text-xs">Submitted By</th>
                    <th className="px-4 py-3 font-semibold text-xs">Status</th>
                    <th className="px-4 py-3 font-semibold text-xs">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                      onClick={() => toggleSelect(item.id)}
                    >
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{item.template?.name || item.formName}</td>
                      <td className="px-4 py-3 text-primary font-mono text-xs">{item.reference || item.id.slice(-8).toUpperCase()}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{item.submittedBy?.user_name || "Unknown"}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-semibold tracking-wide uppercase whitespace-nowrap">
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-gray-100 shrink-0 bg-white">
          <div className="text-sm text-gray-500 font-medium">
            {selectedIds.size} item{selectedIds.size !== 1 && 's'} selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleAddSelected} disabled={selectedIds.size === 0} className="cursor-pointer bg-primary text-white hover:bg-primary/90">
              Add Selected
            </Button>
          </div>
        </div>
      </div>

      {/* Batch Journal Modal */}
      {batchItems && (
        <BatchJournalModal
          isOpen={true}
          onClose={() => setBatchItems(null)}
          items={batchItems}
          token={(session?.user as any)?.backendToken ?? ""}
          baseUrl={process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app"}
          onComplete={handleBatchComplete}
        />
      )}
    </div>
  );
}
