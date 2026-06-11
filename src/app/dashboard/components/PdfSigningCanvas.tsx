"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, CheckCircle2, Loader2, Type, Pen } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Input } from "@/components/ui/input";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface AnnotationObj {
  id: string;
  type: "signature" | "text";
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
}

export function PdfSigningCanvas({
  pdfUrl,
  token,
  signatureImage,
  isSubmitting,
  error,
  onConfirm,
  onCancel,
}: {
  pdfUrl: string;
  token: string;
  signatureImage: string | null;
  isSubmitting?: boolean;
  error?: string;
  onConfirm: (annotations: any[], tokenInput: string) => void;
  onCancel: () => void;
}) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [annotations, setAnnotations] = useState<AnnotationObj[]>([]);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [popupMenu, setPopupMenu] = useState<{ x: number; y: number; page: number } | null>(null);
  const [signatureToken, setSignatureToken] = useState("");
  
  const pdfFileOptions = React.useMemo(() => ({
    url: pdfUrl,
    httpHeaders: { Authorization: `Bearer ${token}` }
  }), [pdfUrl, token]);

  const pageRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const onPageLoadSuccess = (pageInfo: any) => {
    setPageDimensions({
      width: pageInfo.originalWidth,
      height: pageInfo.originalHeight,
    });
  };

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Ignore clicks if they originate from an annotation or the popup menu itself
    if ((e.target as HTMLElement).closest(".annotation-layer") || (e.target as HTMLElement).closest(".popup-menu")) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setPopupMenu({ x, y, page: pageNumber });
  };

  const handleAddSignature = () => {
    if (!popupMenu || !signatureImage) return;
    setAnnotations((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        type: "signature",
        page: popupMenu.page,
        x: popupMenu.x,
        y: popupMenu.y,
        width: 150, // default logical width
        height: 50,
      },
    ]);
    setPopupMenu(null);
  };

  const handleAddText = () => {
    if (!popupMenu) return;
    setAnnotations((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        type: "text",
        page: popupMenu.page,
        x: popupMenu.x,
        y: popupMenu.y,
        width: 200,
        height: 30,
        text: "Type here...",
        fontSize: 14,
      },
    ]);
    setPopupMenu(null);
  };

  const handleRemoveAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  };

  const handleTextChange = (id: string, newText: string) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, text: newText } : a))
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-100 relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => setScale((s) => Math.min(3.0, s + 0.1))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4">
            <Button variant="outline" size="sm" onClick={() => { setPageNumber((p) => Math.max(1, p - 1)); setPopupMenu(null); }} disabled={pageNumber <= 1}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <span className="text-sm text-gray-600">
              Page {pageNumber} of {numPages || "--"}
            </span>
            <Button variant="outline" size="sm" onClick={() => { setPageNumber((p) => Math.min(numPages || 1, p + 1)); setPopupMenu(null); }} disabled={pageNumber >= (numPages || 1)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {error && <span className="text-sm font-semibold text-red-600">{error}</span>}
          <Input 
            type="password" 
            placeholder="Signature Token" 
            className="w-36 h-9 text-sm text-center tracking-widest font-mono border-gray-300" 
            value={signatureToken}
            onChange={(e) => setSignatureToken(e.target.value)}
          />
          <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            className="bg-[#b50938] hover:bg-[#9a0730] text-white" 
            onClick={() => onConfirm(annotations, signatureToken)}
            disabled={isSubmitting || signatureToken.length < 8}
          >
            {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing...</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Sign & Submit</>}
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto bg-gray-100 flex justify-center p-8">
        <div className="relative shadow-xl bg-white transition-all" style={{ width: pageDimensions ? pageDimensions.width * scale : 'auto' }}>
          <Document
            file={pdfFileOptions as any}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className="p-10 text-center text-gray-500 flex flex-col items-center"><Loader2 className="w-8 h-8 animate-spin mb-4" />Loading PDF...</div>}
            error={<div className="p-10 text-red-500 bg-red-50 border border-red-200 m-10 rounded">Failed to load PDF.</div>}
          >
            <div ref={pageRef} className="relative shadow-sm" onClick={handlePageClick}>
              <Page
                pageNumber={pageNumber}
                scale={scale}
                onLoadSuccess={onPageLoadSuccess}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="select-none"
              />

              {/* Popup Menu */}
              {popupMenu && popupMenu.page === pageNumber && (
                <div 
                  className="popup-menu absolute bg-white shadow-xl rounded-xl border border-gray-200 z-30 p-2 flex flex-col gap-1 w-44 animate-in zoom-in-95 duration-100"
                  style={{
                    left: popupMenu.x * scale,
                    top: popupMenu.y * scale,
                  }}
                >
                  <Button variant="ghost" size="sm" className="justify-start font-medium cursor-pointer" onClick={handleAddSignature} disabled={!signatureImage}>
                    <Pen className="w-4 h-4 mr-2 text-blue-500" /> Signature
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start font-medium cursor-pointer" onClick={handleAddText}>
                    <Type className="w-4 h-4 mr-2 text-gray-500" /> Text Field
                  </Button>
                </div>
              )}

              {/* Render Annotations for CURRENT PAGE */}
              {annotations
                .filter((a) => a.page === pageNumber)
                .map((ann) => (
                  <div
                    key={ann.id}
                    className="annotation-layer absolute border border-transparent hover:border-blue-400 group"
                    style={{
                      left: ann.x * scale,
                      top: ann.y * scale,
                      width: ann.width * scale,
                      height: ann.height * scale,
                    }}
                  >
                    {/* Delete Button */}
                    <button
                      className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-0.5 hidden group-hover:flex items-center justify-center z-40 cursor-pointer shadow-md"
                      onClick={(e) => { e.stopPropagation(); handleRemoveAnnotation(ann.id); }}
                    >
                      <X className="w-3 h-3" />
                    </button>

                    {ann.type === "signature" && signatureImage ? (
                      <img
                        src={signatureImage}
                        alt="Signature"
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    ) : (
                      <Input
                        autoFocus
                        value={ann.text}
                        onChange={(e) => handleTextChange(ann.id, e.target.value)}
                        className="w-full h-full border-none bg-blue-50/50 focus-visible:ring-1 focus-visible:ring-blue-400 text-black px-1"
                        style={{ fontSize: (ann.fontSize || 14) * scale }}
                        onMouseDown={(e) => e.stopPropagation()} 
                      />
                    )}
                  </div>
                ))}
            </div>
          </Document>
        </div>
      </div>
    </div>
  );
}
