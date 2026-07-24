import { useState, useEffect } from "react";
import { X, Folder, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileToFolderModalProps {
  submissionId: string;
  submissionItem?: any;
  userBranch?: string;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
  baseUrl: string;
}

export function FileToFolderModal({ submissionId, submissionItem, userBranch, onClose, onSuccess, token, baseUrl }: FileToFolderModalProps) {
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [error, setError] = useState("");

  const [folderSearch, setFolderSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/v1/folders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFolders(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFolderId) {
      setError("Please select a folder.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/api/v1/folders/${selectedFolderId}/add-submission`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ submissionId })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || data.message || "Failed to file submission.");
      }
    } catch (err: any) {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(folderSearch.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-visible animate-in zoom-in-95 duration-200">
        <div className="p-6 space-y-5">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-50" style={{ color: "#B50938" }}>
                <Folder className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">File to Folder</h3>
                <p className="text-xs text-gray-500">Move this completed submission into a manual folder</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {(() => {
            const hasAutomated = submissionItem && userBranch && (
              (submissionItem.template?.formOwner?.toLowerCase() === userBranch?.toLowerCase()) || 
              (submissionItem.treaterBranch?.toLowerCase() === userBranch?.toLowerCase()) || 
              (submissionItem.formResponses?.Branch === userBranch) || 
              (submissionItem.formResponses?.branch === userBranch)
            );
            
            const systemFolderName = hasAutomated ? (submissionItem.formResponses?.Branch || submissionItem.formResponses?.branch || submissionItem.template?.name || submissionItem.formName || "Other Forms") : null;
            const existingManualFolders = submissionItem?.manualFolders?.map((mf: any) => mf.folder) || [];
            
            const goToFolder = (type: 'system' | 'manual', folderData: any) => {
              window.dispatchEvent(new CustomEvent('open-file-room', { 
                detail: { type, folder: folderData } 
              }));
              onClose();
            };

            if (!systemFolderName && existingManualFolders.length === 0) return null;

            return (
              <div className="space-y-2 border-b border-gray-100 pb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Already Filed In:</p>
                <div className="space-y-2">
                  {systemFolderName && (
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md border border-gray-100">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Folder className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-700 truncate">{systemFolderName} <span className="text-[10px] text-gray-400 ml-1">(Automated)</span></span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => goToFolder('system', systemFolderName)}>Go</Button>
                    </div>
                  )}
                  {existingManualFolders.map((mf: any) => (
                    <div key={mf.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md border border-gray-100">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Folder className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-700 truncate">{mf.name} <span className="text-[10px] text-gray-400 ml-1">(Manual)</span></span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => goToFolder('manual', mf)}>Go</Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : folders.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500 bg-gray-50 rounded-lg border border-gray-100">
              No manual folders found. You can create one in the File Room.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 relative">
                <label className="text-sm font-medium text-gray-700">Select Destination Folder</label>
                
                <div className="relative">
                  <div
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm cursor-pointer flex justify-between items-center bg-white hover:border-gray-400 transition-colors"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                  >
                    <span className={selectedFolderId ? "text-gray-900 truncate" : "text-gray-500"}>
                      {selectedFolderId 
                        ? (() => {
                            const f = folders.find(f => f.id === selectedFolderId);
                            return f ? `${f.name} (Created by ${f.createdBy?.user_name})` : "-- Select a folder --";
                          })()
                        : "-- Select a folder --"}
                    </span>
                    <span className="text-gray-400 text-[10px] ml-2">▼</span>
                  </div>
                  
                  {dropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 flex flex-col overflow-hidden">
                      <div className="p-2 border-b border-gray-100 shrink-0 bg-gray-50/50">
                        <input
                          type="text"
                          autoFocus
                          placeholder="Search folders..."
                          value={folderSearch}
                          onChange={(e) => setFolderSearch(e.target.value)}
                          className="w-full border border-gray-300 rounded p-1.5 text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 shadow-inner"
                        />
                      </div>
                      <div className="overflow-y-auto flex-1 p-1">
                        {filteredFolders.length === 0 ? (
                          <div className="p-3 text-sm text-gray-500 text-center italic">No folders found</div>
                        ) : (
                          filteredFolders.map(f => (
                            <div
                              key={f.id}
                              className={`p-2.5 text-sm cursor-pointer rounded-md transition-colors ${selectedFolderId === f.id ? 'bg-red-50 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
                              style={selectedFolderId === f.id ? { color: "#B50938" } : {}}
                              onClick={() => {
                                setSelectedFolderId(f.id);
                                setDropdownOpen(false);
                                setFolderSearch("");
                                setError("");
                              }}
                            >
                              {f.name} <span className="text-xs text-gray-400 font-normal ml-1">(Created by {f.createdBy?.user_name})</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              className="flex-1 text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#B50938" }}
              disabled={saving || !selectedFolderId || folders.length === 0}
              onClick={handleSubmit}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {saving ? "Saving..." : "File Submission"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
