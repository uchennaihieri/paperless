"use client";

import { useState } from "react";
import { X, Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function JournalUploadModal({
  isOpen,
  onClose,
  token,
  baseUrl,
}: {
  isOpen: boolean;
  onClose: (uploaded?: boolean) => void;
  token: string;
  baseUrl: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [totalDebit, setTotalDebit] = useState("");
  const [totalCredit, setTotalCredit] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const ext = selected.name.split(".").pop()?.toLowerCase();
      if (ext !== "xlsx" && ext !== "xls") {
        setError("Only .xlsx and .xls files are accepted.");
        setFile(null);
        return;
      }
      setFile(selected);
      setError("");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file.");
      return;
    }
    const debitVal = parseFloat(totalDebit);
    const creditVal = parseFloat(totalCredit);
    if (isNaN(debitVal) || debitVal < 0) {
      setError("Total Debit must be a valid positive number.");
      return;
    }
    if (isNaN(creditVal) || creditVal < 0) {
      setError("Total Credit must be a valid positive number.");
      return;
    }

    setIsUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("totalDebit", String(debitVal));
      formData.append("totalCredit", String(creditVal));

      const res = await fetch(`${baseUrl}/api/v1/journal/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Upload failed");

      setSuccess(`Uploaded successfully — ID: ${data.data.uploadId}`);
      setTimeout(() => {
        setFile(null);
        setTotalDebit("");
        setTotalCredit("");
        setSuccess("");
        onClose(true);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Upload className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Upload Excel Journal</h2>
              <p className="text-xs text-gray-500">Upload an Excel file to the general ledger</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClose()}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleUpload} className="p-5 space-y-4">
          {/* File picker */}
          <div>
            <Label className="text-xs mb-1.5 block font-semibold">Excel File *</Label>
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                id="journal-file-input"
              />
              <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                file ? "border-emerald-300 bg-emerald-50" : "border-gray-200 hover:border-gray-300"
              }`}>
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700 truncate max-w-[250px]">
                      {file.name}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-6 h-6 mx-auto text-gray-400" />
                    <p className="text-xs text-gray-500">Click or drag an Excel file here</p>
                    <p className="text-[10px] text-gray-400">.xlsx or .xls only</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Total Debit */}
          <div>
            <Label className="text-xs mb-1.5 block font-semibold">Total Debit (₦) *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              required
              value={totalDebit}
              onChange={(e) => setTotalDebit(e.target.value)}
              placeholder="0.00"
              className="tabular-nums"
            />
          </div>

          {/* Total Credit */}
          <div>
            <Label className="text-xs mb-1.5 block font-semibold">Total Credit (₦) *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              required
              value={totalCredit}
              onChange={(e) => setTotalCredit(e.target.value)}
              placeholder="0.00"
              className="tabular-nums"
            />
          </div>

          {/* Error / Success */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-emerald-700 text-sm bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 cursor-pointer"
              onClick={() => onClose()}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isUploading || !file}
            >
              {isUploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Upload</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
