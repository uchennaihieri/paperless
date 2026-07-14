"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, CheckCircle2, Loader2, Type, Pen } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Input } from "@/components/ui/input";
import { SignatureSelectionModal } from "./SignatureSelectionModal";

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
  customSignatureData?: string;
  isLocked?: boolean;
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
  signatureImage?: string | null; // Kept for backwards compatibility if needed, but not used globally anymore
  isSubmitting?: boolean;
  error?: string;
  onConfirm: (annotations: any[], tokenInput?: string) => void;
  onCancel: () => void;
}) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [annotations, setAnnotations] = useState<AnnotationObj[]>([]);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [popupMenu, setPopupMenu] = useState<{ x: number; y: number; page: number } | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ x: number; y: number; page: number } | null>(null);

  const [dragState, setDragState] = useState<{ id: string; startX: number; startY: number; initialAnnX: number; initialAnnY: number } | null>(null);
  const [resizeState, setResizeState] = useState<{ id: string; startX: number; startY: number; initialWidth: number; initialHeight: number; initialFontSize?: number } | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState) {
        const deltaX = (e.clientX - dragState.startX) / scale;
        const deltaY = (e.clientY - dragState.startY) / scale;
        setAnnotations((prev) =>
          prev.map((ann) => {
            if (ann.id !== dragState.id) return ann;
            const newX = Math.max(0, Math.min((pageDimensions?.width || 1000) - ann.width, dragState.initialAnnX + deltaX));
            const newY = Math.max(0, Math.min((pageDimensions?.height || 1000) - ann.height, dragState.initialAnnY + deltaY));
            return { ...ann, x: newX, y: newY };
          })
        );
      } else if (resizeState) {
        const deltaX = (e.clientX - resizeState.startX) / scale;
        const deltaY = (e.clientY - resizeState.startY) / scale;
        setAnnotations((prev) =>
          prev.map((ann) => {
            if (ann.id !== resizeState.id) return ann;
            if (ann.type === "signature") {
              const newWidth = Math.max(20, resizeState.initialWidth + deltaX);
              const ratio = newWidth / resizeState.initialWidth;
              const newHeight = resizeState.initialHeight * ratio;
              return { ...ann, width: newWidth, height: newHeight };
            } else {
              const newWidth = Math.max(50, resizeState.initialWidth + deltaX);
              const newHeight = Math.max(20, resizeState.initialHeight + deltaY);
              const heightRatio = newHeight / resizeState.initialHeight;
              const newFontSize = (resizeState.initialFontSize || 14) * heightRatio;
              return { ...ann, width: newWidth, height: newHeight, fontSize: newFontSize };
            }
          })
        );
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
      setResizeState(null);
    };

    if (dragState || resizeState) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, resizeState, scale, pageDimensions]);
  
  const [pdfFileOptions, setPdfFileOptions] = useState({
    url: pdfUrl,
    httpHeaders: { Authorization: `Bearer ${token}` }
  });

  useEffect(() => {
    setPdfFileOptions((prev) => {
      if (prev.url === pdfUrl && prev.httpHeaders.Authorization === `Bearer ${token}`) {
        return prev; // Absolute reference stability
      }
      return {
        url: pdfUrl,
        httpHeaders: { Authorization: `Bearer ${token}` }
      };
    });
  }, [pdfUrl, token]);

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

    if (popupMenu && popupMenu.page === pageNumber) {
      // If clicking near the same position (within 20 points), close the menu
      const dist = Math.sqrt(Math.pow(popupMenu.x - x, 2) + Math.pow(popupMenu.y - y, 2));
      if (dist < 20) {
        setPopupMenu(null);
        return;
      }
    }
    
    setPopupMenu({ x, y, page: pageNumber });
  };

  const handleAddSignature = () => {
    if (!popupMenu) return;
    setPendingCoords(popupMenu);
    setPopupMenu(null);
    setIsModalOpen(true);
  };

  const handleSignatureSuccess = (base64Str: string) => {
    if (!pendingCoords) return;
    setAnnotations((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        type: "signature",
        page: pendingCoords.page,
        x: pendingCoords.x,
        y: pendingCoords.y,
        width: 150,
        height: 50,
        customSignatureData: base64Str,
      },
    ]);
    setIsModalOpen(false);
    setPendingCoords(null);
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
          <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            className="bg-[#b50938] hover:bg-[#9a0730] text-white" 
            onClick={() => onConfirm(annotations)}
            disabled={isSubmitting || annotations.length === 0}
          >
            {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing...</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Sign & Submit</>}
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto bg-gray-100 p-8">
        <div className="relative shadow-xl bg-white transition-all mx-auto" style={{ width: pageDimensions ? pageDimensions.width * scale : 'auto' }}>
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
                  <Button variant="ghost" size="sm" className="justify-start font-medium cursor-pointer" onClick={handleAddSignature}>
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
                    className={`annotation-layer absolute border ${dragState?.id === ann.id ? "border-blue-500" : "border-transparent hover:border-blue-400"} group`}
                    style={{
                      left: ann.x * scale,
                      top: ann.y * scale,
                      width: ann.width * scale,
                      height: ann.height * scale,
                      cursor: dragState?.id === ann.id ? "grabbing" : "grab",
                    }}
                    onMouseDown={(e) => {
                      if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return;
                      e.stopPropagation();
                      setDragState({
                        id: ann.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        initialAnnX: ann.x,
                        initialAnnY: ann.y,
                      });
                    }}
                  >
                    {/* Delete Button */}
                    <button
                      className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-0.5 hidden group-hover:flex items-center justify-center z-40 cursor-pointer shadow-md"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); handleRemoveAnnotation(ann.id); }}
                    >
                      <X className="w-3 h-3" />
                    </button>

                    {/* Resize Handle */}
                    <div
                      className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-500 rounded-sm hidden group-hover:block z-40 cursor-se-resize shadow-sm"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setResizeState({
                          id: ann.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          initialWidth: ann.width,
                          initialHeight: ann.height,
                          initialFontSize: ann.fontSize || 14,
                        });
                      }}
                    />

                    {ann.type === "signature" && ann.customSignatureData ? (
                      <img
                        src={ann.customSignatureData}
                        alt="Signature"
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    ) : ann.isLocked ? (
                      <div
                        className="w-full h-full bg-blue-50/20 text-black px-1 flex items-center overflow-hidden whitespace-nowrap cursor-grab select-none pointer-events-none"
                        style={{ fontSize: (ann.fontSize || 14) * scale }}
                      >
                        {ann.text}
                      </div>
                    ) : (
                      <Input
                        autoFocus
                        value={ann.text}
                        onChange={(e) => handleTextChange(ann.id, e.target.value)}
                        onBlur={() => {
                          if (ann.text?.trim()) {
                            setAnnotations(prev => prev.map(a => a.id === ann.id ? { ...a, isLocked: true } : a));
                          }
                        }}
                        className="w-full h-full border-none bg-blue-50/50 focus-visible:ring-1 focus-visible:ring-blue-400 text-black px-1 cursor-text"
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

      <SignatureSelectionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPendingCoords(null);
        }}
        onSuccess={handleSignatureSuccess}
        token={token}
      />
    </div>
  );
}
