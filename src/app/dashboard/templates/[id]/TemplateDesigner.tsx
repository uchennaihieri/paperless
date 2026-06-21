"use client";

import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import Draggable from "react-draggable";
import {
  Save, ArrowLeft, Type, PenTool, Image as ImageIcon, X, Code2,
  Plus, Trash2, CheckCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import Link from "next/link";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocField {
  id?: string;
  name: string;
  type: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isNew?: boolean;
}

interface HtmlField {
  /** cuid from DB if already saved, or a temp key */
  localId: string;
  name: string;          // Handlebars variable name e.g. "formName"
  type: string;          // "text" | "block"
  saved?: boolean;
}

// ─── DraggableFieldBox (Document mode) ───────────────────────────────────────

const DraggableFieldBox = ({
  field, idx, isSelected, clientWidth, clientHeight, updateFieldBounds, setSelectedFieldIdx,
}: {
  field: DocField; idx: number; isSelected: boolean;
  clientWidth: number; clientHeight: number;
  updateFieldBounds: (i: number, x: number, y: number) => void;
  setSelectedFieldIdx: (i: number) => void;
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: field.x * clientWidth, y: field.y * clientHeight }}
      onStop={(_e, d) => updateFieldBounds(idx, d.x, d.y)}
      bounds="parent"
    >
      <div
        ref={nodeRef}
        onClick={(e) => { e.stopPropagation(); setSelectedFieldIdx(idx); }}
        style={{
          position: "absolute",
          width: `${field.width * 100}%`, height: `${field.height * 100}%`,
          border: isSelected ? "2px dashed blue" : "1px solid #666",
          backgroundColor: isSelected ? "rgba(0,0,255,0.1)" : "rgba(0,0,0,0.05)",
          cursor: "move", zIndex: isSelected ? 50 : 10,
        }}
        className="flex items-center justify-center rounded overflow-hidden shadow-sm"
      >
        <span className="text-xs font-bold text-gray-800 bg-white/70 px-1 rounded truncate max-w-full pointer-events-none">
          {field.name}
        </span>
      </div>
    </Draggable>
  );
};



// ─── Main Component ───────────────────────────────────────────────────────────

export default function TemplateDesigner({
  templateId, initialData,
}: { templateId: string; initialData: any }) {
  const isHtml = initialData?.type === "html";

  // ── Document mode state ──────────────────────────────────────────────────────
  const [numPages, setNumPages] = useState<number | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [selectedFieldIdx, setSelectedFieldIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [docFields, setDocFields] = useState<DocField[]>(initialData.fields || []);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── HTML mode state ──────────────────────────────────────────────────────────
  const [htmlFields, setHtmlFields] = useState<HtmlField[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractResult, setExtractResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load existing DB fields + data dictionary when in HTML mode
  useEffect(() => {
    if (!isHtml) return;

    // Seed from initialData.fields
    const existing: HtmlField[] = (initialData.fields || []).map((f: any) => ({
      localId: f.id,
      name: f.name,
      type: f.type ?? "text",
      saved: true,
    }));
    setHtmlFields(existing);
  }, [isHtml, initialData.fields]);

  // ── HTML field helpers ───────────────────────────────────────────────────────
  const addHtmlField = () => {
    setSyncDone(false);
    setHtmlFields((prev) => [
      ...prev,
      { localId: `new_${Date.now()}`, name: "", type: "text", saved: false },
    ]);
  };

  const updateHtmlField = (localId: string, patch: Partial<HtmlField>) => {
    setSyncDone(false);
    setHtmlFields((prev) => prev.map((f) => f.localId === localId ? { ...f, ...patch, saved: false } : f));
  };

  const removeHtmlField = (localId: string) => {
    setSyncDone(false);
    setHtmlFields((prev) => prev.filter((f) => f.localId !== localId));
  };

  const confirmAutoExtractHtml = async () => {
    setExtracting(true);
    setExtractResult(null);
    try {
      const res = await fetch(`/api/v1/templates/${templateId}/extract-fields`, { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Extraction failed");
      
      const newFields = json.data.map((f: any) => ({
        localId: `ext_${Math.random().toString(36).substring(7)}`,
        name: f.name,
        type: f.type,
        saved: false
      }));
      
      setHtmlFields(newFields);
      setSyncDone(false);
      setExtractResult({ success: true, message: `Successfully extracted ${newFields.length} fields! Click "Save All" when you're ready to save.` });
    } catch (e: any) {
      setExtractResult({ success: false, message: e.message || "Failed to auto-extract fields" });
    } finally {
      setExtracting(false);
    }
  };

  const saveAllHtml = async () => {
    const invalid = htmlFields.filter((f) => !f.name.trim());
    if (invalid.length) { alert("All fields need a variable name."); return; }

    setSyncing(true);
    try {
      const payload = htmlFields.map((f) => ({
        name: f.name.trim(),
        type: f.type,
      }));
      const res = await fetch(`/api/v1/templates/${templateId}/sync-fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: payload }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSyncDone(true);
      setHtmlFields((prev) => prev.map((f) => ({ ...f, saved: true })));
    } catch (e: any) {
      alert("Save failed: " + e.message);
    } finally {
      setSyncing(false);
    }
  };

  // ── Document mode helpers ────────────────────────────────────────────────────
  const addDocField = (type: string) => {
    const f: DocField = {
      name: `New_${type}_${Date.now()}`, type,
      page: activePage - 1,
      x: 0.1, y: 0.1,
      width: 0.2, height: type === "signature" ? 0.08 : 0.05,
      isNew: true, id: `temp_${Date.now()}`,
    };
    setDocFields([...docFields, f]);
    setSelectedFieldIdx(docFields.length);
  };

  const updateFieldBounds = (idx: number, newPxX: number, newPxY: number) => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    setDocFields((prev) => {
      const nf = [...prev];
      const f = { ...nf[idx] };
      f.x = Math.max(0, Math.min(1 - f.width, newPxX / clientWidth));
      f.y = Math.max(0, Math.min(1 - f.height, newPxY / clientHeight));
      nf[idx] = f;
      return nf;
    });
  };

  const saveSelectedDocField = async () => {
    if (selectedFieldIdx === null) return;
    setSaving(true);
    const field = docFields[selectedFieldIdx];
    try {
      const url = field.isNew
        ? `/api/v1/templates/${templateId}/fields`
        : `/api/v1/templates/${templateId}/fields/${field.id}`;
      const res = await fetch(url, {
        method: field.isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: field.name, type: field.type, page: field.page, x: field.x, y: field.y, width: field.width, height: field.height }),
      });
      if (!res.ok) throw new Error("Failed to save field");
      const data = await res.json();
      setDocFields((prev) => {
        const nf = [...prev];
        nf[selectedFieldIdx] = { ...nf[selectedFieldIdx], isNew: false };
        if (data.data?.id) nf[selectedFieldIdx].id = data.data.id;
        return nf;
      });
      alert("Field saved!");
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const removeSelectedDocField = async () => {
    if (selectedFieldIdx === null) return;
    const field = docFields[selectedFieldIdx];
    if (!field.isNew && field.id && !field.id.startsWith("temp_")) {
      try { await fetch(`/api/v1/templates/${templateId}/fields/${field.id}`, { method: "DELETE" }); }
      catch { alert("Failed to delete"); return; }
    }
    setDocFields((prev) => prev.filter((_, i) => i !== selectedFieldIdx));
    setSelectedFieldIdx(null);
  };

  // ─── HTML Template Designer UI ───────────────────────────────────────────────
  if (isHtml) {

    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col">

        {/* Header */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-5 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/templates" className="p-1.5 rounded-md hover:bg-gray-100 transition-colors border border-gray-200">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </Link>
            <Code2 className="w-5 h-5" style={{ color: "#b50938" }} />
            <h2 className="font-semibold text-gray-800 text-sm">
              <span style={{ color: "#b50938" }}>HTML Template: </span>
              {initialData.name}
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wide uppercase border"
              style={{ background: "#b5093815", color: "#b50938", borderColor: "#b5093830" }}>
              Handlebars
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Auto Extract Fields */}
            <button
              onClick={() => { setShowExtractModal(true); setExtractResult(null); }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold rounded-md border border-blue-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Auto Extract
            </button>
            {/* Test PDF button */}
            <button
              onClick={async () => {
                window.open(`/api/v1/templates/${templateId}/generate-test-pdf`, "_blank");
              }}
              disabled={htmlFields.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-md border border-gray-200 transition-colors disabled:opacity-40"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Test PDF
            </button>
            {/* Save All */}
            <button
              onClick={saveAllHtml}
              disabled={syncing || htmlFields.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50 shadow-sm"
              style={{ background: syncing ? "#888" : "#b50938" }}
            >
              <Save className="w-3.5 h-3.5" />
              {syncing ? "Saving…" : syncDone ? "Saved ✓" : "Save All"}
            </button>
            <Link
              href="/dashboard/templates"
              className="px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-600 text-xs font-medium rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1.5"
            >
              Done <X className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">

          {/* Main panel */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">

            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-sm shadow-sm">
                <span className="text-gray-500">Fields:</span>
                <span className="font-bold text-gray-800">{htmlFields.length}</span>
              </div>

              {syncDone && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200 text-sm text-green-700">
                  <CheckCircle className="w-3.5 h-3.5" /> All saved
                </div>
              )}
            </div>

            {/* Field rows */}
            <div className="space-y-2">
              {htmlFields.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                  <Code2 className="w-10 h-10 opacity-30" />
                  <p className="text-sm font-medium text-gray-500">No fields yet.</p>
                  <p className="text-xs opacity-70">Click &quot;Add Field&quot; to start mapping your Handlebars variables.</p>
                </div>
              )}

              {htmlFields.map((f, idx) => {
                return (
                  <div
                    key={f.localId}
                    className={`flex items-start gap-3 p-4 rounded-xl border bg-white shadow-sm transition-colors ${
                      f.saved
                        ? "border-green-200"
                        : "border-amber-200"
                    }`}
                  >
                    {/* Row number */}
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 font-bold shrink-0 mt-1">
                      {idx + 1}
                    </div>

                    {/* Variable name */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                        Handlebars Variable Name
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm font-mono shrink-0">&lbrace;&lbrace;</span>
                        <input
                          type="text"
                          value={f.name}
                          onChange={(e) => updateHtmlField(f.localId, { name: e.target.value.replace(/\s/g, "_") })}
                          placeholder="e.g. formName, signatories, responses"
                          className="flex-1 bg-gray-50 border border-gray-300 rounded-lg py-1.5 px-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-1 focus:border-transparent transition-shadow font-mono"
                          style={{ outline: "none" }}
                          onFocus={e => e.currentTarget.style.boxShadow = "0 0 0 2px #b5093840"}
                          onBlur={e => e.currentTarget.style.boxShadow = ""}
                        />
                        <span className="text-gray-400 text-sm font-mono shrink-0">&rbrace;&rbrace;</span>
                      </div>
                    </div>

                    {/* Type toggle */}
                    <div className="shrink-0 space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block">
                        Type
                      </label>
                      <div className="flex rounded-lg overflow-hidden border border-gray-200">
                        {(["text", "block"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => updateHtmlField(f.localId, { type: t })}
                            className="px-3 py-1.5 text-xs font-medium transition-colors"
                            style={{
                              background: f.type === t ? "#b50938" : "#f9fafb",
                              color: f.type === t ? "#fff" : "#6b7280",
                            }}
                          >
                            {t === "block" ? "#each" : "text"}
                          </button>
                        ))}
                      </div>
                    </div>



                    {/* Status & delete */}
                    <div className="shrink-0 pt-5 flex items-center gap-1.5">
                      {f.saved
                        ? <CheckCircle className="w-4 h-4 text-green-500" />
                        : <div className="w-2 h-2 rounded-full bg-amber-500 mt-0.5" title="Unsaved" />
                      }
                      <button
                        onClick={() => removeHtmlField(f.localId)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add field button */}
            <button
              onClick={addHtmlField}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-sm font-medium transition-colors"
              style={{ borderColor: "#b5093840", color: "#b50938" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#b5093808"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ""; }}
            >
              <Plus className="w-4 h-4" /> Add Field
            </button>
          </div>

        </div>

        {/* Auto Extract Modal */}
        {showExtractModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
              {!extractResult ? (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Auto Extract Fields</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    This will scan your HTML source file and replace all the fields currently listed below. Are you sure you want to proceed?
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setShowExtractModal(false)}
                      disabled={extracting}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmAutoExtractHtml}
                      disabled={extracting}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {extracting ? "Extracting..." : "Yes, Extract"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${extractResult.success ? "bg-green-100" : "bg-red-100"}`}>
                    {extractResult.success ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <X className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {extractResult.success ? "Extraction Complete" : "Extraction Failed"}
                  </h3>
                  <p className={`text-sm mb-6 ${extractResult.success ? "text-gray-600" : "text-red-600"}`}>
                    {extractResult.message}
                  </p>
                  <button
                    onClick={() => setShowExtractModal(false)}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Document (pdf-lib) mode — unchanged ─────────────────────────────────────
  const renderDocFields = () => {
    if (!containerRef.current) return null;
    const { clientWidth, clientHeight } = containerRef.current;
    return docFields.map((field, idx) => {
      if (field.page !== activePage - 1) return null;
      return (
        <DraggableFieldBox
          key={field.id || `f_${idx}`}
          field={field} idx={idx}
          isSelected={selectedFieldIdx === idx}
          clientWidth={clientWidth} clientHeight={clientHeight}
          updateFieldBounds={updateFieldBounds}
          setSelectedFieldIdx={setSelectedFieldIdx}
        />
      );
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-100 flex flex-col">
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/templates" className="p-1.5 hover:bg-gray-100 rounded-md transition-colors border border-gray-200">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <h2 className="font-semibold text-gray-800 text-lg flex items-center gap-2">
            <span className="text-primary font-bold">Template Designer:</span> {initialData.name}
          </h2>
        </div>
        <Link href="/dashboard/templates" className="px-4 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors flex items-center gap-2">
          Save & Close <X className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex-1 overflow-hidden flex flex-row">
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col z-10 shadow-sm">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-2">
            <button onClick={() => addDocField("text")} className="flex-1 flex flex-col items-center gap-1 p-2 bg-white rounded border border-gray-200 hover:border-primary hover:text-primary transition-colors shadow-sm">
              <Type className="w-4 h-4" /><span className="text-xs font-medium">Text</span>
            </button>
            <button onClick={() => addDocField("signature")} className="flex-1 flex flex-col items-center gap-1 p-2 bg-white rounded border border-gray-200 hover:border-primary hover:text-primary transition-colors shadow-sm">
              <PenTool className="w-4 h-4" /><span className="text-xs font-medium">Sign</span>
            </button>
            <button onClick={() => addDocField("image")} className="flex-1 flex flex-col items-center gap-1 p-2 bg-white rounded border border-gray-200 hover:border-primary hover:text-primary transition-colors shadow-sm">
              <ImageIcon className="w-4 h-4" /><span className="text-xs font-medium">Image</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {selectedFieldIdx !== null && docFields[selectedFieldIdx] ? (
              <div className="space-y-5 bg-gray-50 border border-gray-100 p-4 rounded-lg shadow-inner">
                <div className="text-sm font-bold text-gray-800 flex items-center justify-between">
                  Field Properties
                  <div className="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {docFields[selectedFieldIdx].type}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Field Name / Key</label>
                  <input type="text" value={docFields[selectedFieldIdx].name}
                    onChange={(e) => { const nf = [...docFields]; nf[selectedFieldIdx].name = e.target.value; setDocFields(nf); }}
                    className="w-full border border-gray-300 rounded-md py-1.5 px-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary bg-white shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Field Type</label>
                  <select value={docFields[selectedFieldIdx].type}
                    onChange={(e) => { const nf = [...docFields]; nf[selectedFieldIdx].type = e.target.value; setDocFields(nf); }}
                    className="w-full border border-gray-300 rounded-md py-1.5 px-3 text-sm bg-white shadow-sm">
                    <option value="text">Text Field</option>
                    <option value="signature">Signature</option>
                    <option value="image">Image</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(["width", "height"] as const).map((dim) => (
                    <div key={dim} className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 block capitalize">{dim} (%)</label>
                      <input type="number" step="0.5" max="100" min="0.1"
                        value={Math.round(docFields[selectedFieldIdx][dim] * 1000) / 10}
                        onChange={(e) => {
                          const nf = [...docFields]; const val = parseFloat(e.target.value);
                          if (!isNaN(val)) (nf[selectedFieldIdx] as any)[dim] = val / 100;
                          setDocFields(nf);
                        }}
                        className="w-full border border-gray-300 rounded-md py-1.5 px-3 text-sm bg-white shadow-sm"
                      />
                    </div>
                  ))}
                </div>
                <div className="pt-2 flex gap-2">
                  <button onClick={saveSelectedDocField} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-white py-2 shadow-sm rounded text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                    <Save className="w-4 h-4" /> Save
                  </button>
                  <button onClick={removeSelectedDocField}
                    className="flex items-center justify-center p-2 bg-white text-red-500 rounded border border-gray-200 hover:bg-red-50 transition-colors shadow-sm">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-3 px-4 py-10">
                <Type className="w-8 h-8 opacity-20" />
                <p className="text-sm font-medium text-gray-500">No Field Selected</p>
                <p className="text-xs">Click a field on the PDF canvas or add one from the toolbar above.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 bg-gray-200/60 overflow-auto relative p-8 flex flex-col items-center shadow-inner">
          <div className="sticky top-0 mb-6 flex items-center gap-3 bg-white/90 backdrop-blur p-2 rounded-full shadow border border-gray-200 z-50">
            <button disabled={activePage <= 1} onClick={() => setActivePage((p) => p - 1)}
              className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-full text-xs disabled:opacity-50 transition-colors">Previous</button>
            <span className="text-sm font-bold text-gray-700 min-w-[100px] text-center">
              Page {activePage} of {numPages || "-"}
            </span>
            <button disabled={numPages === null || activePage >= numPages} onClick={() => setActivePage((p) => p + 1)}
              className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-full text-xs disabled:opacity-50 transition-colors">Next</button>
          </div>
          <div ref={containerRef} onClick={() => setSelectedFieldIdx(null)}
            className="relative shadow-2xl bg-white select-none ring-1 ring-gray-200"
            style={{ margin: "0 auto", display: "inline-block" }}
          >
            <Document
              file={`/api/v1/templates/${templateId}/file`}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              loading={<div className="p-32 text-center text-gray-500 flex flex-col items-center gap-4"><div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" /><span className="font-medium animate-pulse">Loading Document…</span></div>}
            >
              <Page pageNumber={activePage} width={800} renderTextLayer={false} renderAnnotationLayer={false} />
            </Document>
            {containerRef.current && (
              <div className="absolute inset-0 z-10 pointer-events-none">
                <div className="relative w-full h-full pointer-events-auto">{renderDocFields()}</div>
              </div>
            )}
          </div>
          <div className="h-12 w-full shrink-0" />
        </div>
      </div>
    </div>
  );
}
