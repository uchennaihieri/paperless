"use client";

import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import Draggable from "react-draggable";
import { Save, Plus, Trash2, ArrowLeft, Type, PenTool, Image as ImageIcon, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Initialize pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Field {
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

const DraggableFieldBox = ({ 
  field, 
  idx, 
  isSelected, 
  clientWidth, 
  clientHeight, 
  updateFieldBounds, 
  setSelectedFieldIdx 
}: {
  field: Field;
  idx: number;
  isSelected: boolean;
  clientWidth: number;
  clientHeight: number;
  updateFieldBounds: (idx: number, dx: number, dy: number) => void;
  setSelectedFieldIdx: (idx: number) => void;
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  
  const dragPxX = field.x * clientWidth;
  const dragPxY = field.y * clientHeight;

  return (
    <Draggable 
      nodeRef={nodeRef}
      position={{ x: dragPxX, y: dragPxY }}
      onStop={(e, data) => updateFieldBounds(idx, data.x, data.y)}
      bounds="parent"
    >
      <div 
         ref={nodeRef}
         onClick={(e) => { e.stopPropagation(); setSelectedFieldIdx(idx); }}
         style={{ 
           position: 'absolute', 
           width: `${field.width * 100}%`, 
           height: `${field.height * 100}%`,
           border: isSelected ? '2px dashed blue' : '1px solid #666',
           backgroundColor: isSelected ? 'rgba(0, 0, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
           cursor: 'move',
           zIndex: isSelected ? 50 : 10
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

export default function TemplateDesigner({ templateId, initialData }: { templateId: string, initialData: any }) {
  const router = useRouter();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [activePage, setActivePage] = useState<number>(1);
  const [fields, setFields] = useState<Field[]>(initialData.fields || []);
  const [selectedFieldIdx, setSelectedFieldIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const addField = (type: string) => {
    const newField: Field = {
      name: `New_${type}_${Date.now()}`,
      type,
      page: activePage - 1,
      x: 0.1,
      y: 0.1,
      width: 0.2, // Default 20% width
      height: type === 'signature' ? 0.08 : 0.05,
      isNew: true,
      id: `temp_${Date.now()}`
    };
    setFields([...fields, newField]);
    setSelectedFieldIdx(fields.length);
  };

  const updateFieldBounds = (idx: number, newPxX: number, newPxY: number) => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    
    setFields(prev => {
      const newFields = [...prev];
      const field = { ...newFields[idx] };
      // Map the true dragged absolute pixels back into 0-1 percentages
      field.x = Math.max(0, Math.min(1 - field.width, newPxX / clientWidth));
      field.y = Math.max(0, Math.min(1 - field.height, newPxY / clientHeight));
      newFields[idx] = field;
      return newFields;
    });
  };

  const saveSelectedField = async () => {
    if (selectedFieldIdx === null) return;
    setSaving(true);
    const field = fields[selectedFieldIdx];
    try {
      const url = field.isNew 
        ? `/api/v1/templates/${templateId}/fields` 
        : `/api/v1/templates/${templateId}/fields/${field.id}`;
      
      const res = await fetch(url, {
        method: field.isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: field.name,
          type: field.type,
          page: field.page,
          x: field.x,
          y: field.y,
          width: field.width,
          height: field.height
        })
      });

      if (!res.ok) throw new Error("Failed to save field");
      
      const data = await res.json();
      
      setFields(prev => {
        const nf = [...prev];
        nf[selectedFieldIdx] = { ...nf[selectedFieldIdx], isNew: false };
        if (data.data?.id) nf[selectedFieldIdx].id = data.data.id;
        return nf;
      });
      alert('Field Saved Successfully!');
    } catch (e: any) {
      alert(e.message);
    } finally {
       setSaving(false);
    }
  };

  const removeSelectedField = async () => {
    if (selectedFieldIdx === null) return;
    const field = fields[selectedFieldIdx];
    
    if (!field.isNew && field.id && !field.id.startsWith('temp_')) {
      try {
        await fetch(`/api/v1/templates/${templateId}/fields/${field.id}`, { method: 'DELETE' });
      } catch (e) {
        alert('Failed to delete on server');
        return;
      }
    }

    setFields(prev => prev.filter((_, i) => i !== selectedFieldIdx));
    setSelectedFieldIdx(null);
  };

  const fileUrl = `/api/v1/templates/${templateId}/file`;

  const renderFields = () => {
    if (!containerRef.current) return null;
    const { clientWidth, clientHeight } = containerRef.current;
    
    return fields.map((field, idx) => {
      if (field.page !== activePage - 1) return null;
      return (
        <DraggableFieldBox
          key={field.id || `f_${idx}`}
          field={field}
          idx={idx}
          isSelected={selectedFieldIdx === idx}
          clientWidth={clientWidth}
          clientHeight={clientHeight}
          updateFieldBounds={updateFieldBounds}
          setSelectedFieldIdx={setSelectedFieldIdx}
        />
      );
    });
  };

  // Full screen absolute layout overlay
  return (
    <div className="fixed inset-0 z-[100] bg-gray-100 flex flex-col">
      {/* Top Header */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
         <div className="flex items-center gap-3">
           <Link href="/dashboard/templates" className="p-1.5 hover:bg-gray-100 rounded-md transition-colors border border-gray-200">
             <ArrowLeft className="w-4 h-4 text-gray-600" />
           </Link>
           <h2 className="font-semibold text-gray-800 text-lg flex items-center gap-2">
             <span className="text-primary font-bold">Template Designer:</span> {initialData.name}
           </h2>
         </div>
         <Link 
           href="/dashboard/templates" 
           className="px-4 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors flex items-center gap-2"
         >
           Save & Close <X className="w-4 h-4" />
         </Link>
      </div>

      <div className="flex-1 overflow-hidden flex flex-row">
        {/* Sidebar Tools */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col z-10 shadow-sm">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-2">
             <button onClick={() => addField('text')} className="flex-1 flex flex-col items-center gap-1 p-2 bg-white rounded border border-gray-200 hover:border-primary hover:text-primary transition-colors shadow-sm">
                <Type className="w-4 h-4" />
                <span className="text-xs font-medium">Text</span>
             </button>
             <button onClick={() => addField('signature')} className="flex-1 flex flex-col items-center gap-1 p-2 bg-white rounded border border-gray-200 hover:border-primary hover:text-primary transition-colors shadow-sm">
                <PenTool className="w-4 h-4" />
                <span className="text-xs font-medium">Sign</span>
             </button>
             <button onClick={() => addField('image')} className="flex-1 flex flex-col items-center gap-1 p-2 bg-white rounded border border-gray-200 hover:border-primary hover:text-primary transition-colors shadow-sm">
                <ImageIcon className="w-4 h-4" />
                <span className="text-xs font-medium">Image</span>
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
             {selectedFieldIdx !== null && fields[selectedFieldIdx] ? (
               <div className="space-y-5 bg-gray-50 border border-gray-100 p-4 rounded-lg shadow-inner">
                  <div className="text-sm font-bold text-gray-800 flex items-center justify-between">
                     Field Properties
                     <div className="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                       {fields[selectedFieldIdx].type}
                     </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Field Name / Key</label>
                    <input 
                      type="text" 
                      value={fields[selectedFieldIdx].name}
                      onChange={(e) => {
                        const nf = [...fields];
                        nf[selectedFieldIdx].name = e.target.value;
                        setFields(nf);
                      }}
                      className="w-full border border-gray-300 rounded-md py-1.5 px-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-shadow bg-white shadow-sm"
                    />
                    <p className="text-[10px] text-gray-500 leading-tight">Match this key strictly in your JSON submission logic to map inputs.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Field Type</label>
                    <select 
                      value={fields[selectedFieldIdx].type}
                      onChange={(e) => {
                        const nf = [...fields];
                        nf[selectedFieldIdx].type = e.target.value;
                        setFields(nf);
                      }}
                      className="w-full border border-gray-300 rounded-md py-1.5 px-3 text-sm bg-white shadow-sm focus:ring-1 focus:ring-primary"
                    >
                      <option value="text">Text Field</option>
                      <option value="signature">Signature</option>
                      <option value="image">Image Attachment</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1.5">
                       <label className="text-xs font-semibold text-gray-700 block truncate">Width (%)</label>
                       <input 
                         type="number" step="0.5" max="100" min="0.1"
                         value={Math.round(fields[selectedFieldIdx].width * 1000) / 10}
                         onChange={(e) => {
                            const nf = [...fields];
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) nf[selectedFieldIdx].width = val / 100;
                            setFields(nf);
                         }}
                         className="w-full border border-gray-300 rounded-md py-1.5 px-3 text-sm bg-white shadow-sm"
                       />
                     </div>
                     <div className="space-y-1.5">
                       <label className="text-xs font-semibold text-gray-700 block truncate">Height (%)</label>
                       <input 
                         type="number" step="0.5" max="100" min="0.1"
                         value={Math.round(fields[selectedFieldIdx].height * 1000) / 10}
                         onChange={(e) => {
                            const nf = [...fields];
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) nf[selectedFieldIdx].height = val / 100;
                            setFields(nf);
                         }}
                         className="w-full border border-gray-300 rounded-md py-1.5 px-3 text-sm bg-white shadow-sm"
                       />
                     </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                     <button 
                       onClick={saveSelectedField}
                       disabled={saving}
                       className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-white py-2 shadow-sm rounded border border-transparent text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                     >
                       <Save className="w-4 h-4" /> Save
                     </button>
                     <button 
                       onClick={removeSelectedField}
                       className="flex items-center justify-center p-2 bg-white text-red-500 rounded border border-gray-200 hover:bg-red-50 transition-colors shadow-sm"
                       title="Remove Field"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-3 px-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                     <Type className="w-5 h-5 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">No Field Selected</p>
                  <p className="text-xs">Click on an existing boundary box on the PDF canvas or add a new field from the toolbar above to edit its configurations here.</p>
               </div>
             )}
          </div>
        </div>

        {/* Main Designer Canvas */}
        <div className="flex-1 bg-gray-200/60 overflow-auto relative p-8 flex flex-col items-center shadow-inner">
           
           <div className="sticky top-0 mb-6 flex items-center gap-3 bg-white/90 backdrop-blur p-2 rounded-full shadow border border-gray-200 z-50 transition-all hover:bg-white">
             <button 
               disabled={activePage <= 1} 
               onClick={() => setActivePage(p => p - 1)}
               className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-full text-xs disabled:opacity-50 transition-colors"
             >Previous</button>
             <span className="text-sm font-bold text-gray-700 min-w-[100px] text-center">
               Page {activePage} of {numPages || '-'}
             </span>
             <button 
               disabled={numPages === null || activePage >= numPages} 
               onClick={() => setActivePage(p => p + 1)}
               className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-full text-xs disabled:opacity-50 transition-colors"
             >Next</button>
           </div>

           {/* PDF Wrapper - explicitly relative for exact drag bounds */}
           <div 
             ref={containerRef} 
             onClick={() => setSelectedFieldIdx(null)}
             className="relative shadow-2xl bg-white select-none ring-1 ring-gray-200"
             style={{ margin: '0 auto', display: 'inline-block' }}
           >
             <Document 
               file={fileUrl} 
               onLoadSuccess={onDocumentLoadSuccess}
               loading={
                 <div className="p-32 text-center text-gray-500 flex flex-col items-center justify-center gap-4">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
                    <span className="font-medium animate-pulse">Loading Document Canvas...</span>
                 </div>
               }
             >
               <Page 
                 pageNumber={activePage} 
                 width={800} // Locked width so coordinates stay visually consistent
                 renderTextLayer={false} 
                 renderAnnotationLayer={false} 
               />
             </Document>

             {/* Overlaid bounding boxes */}
             {containerRef.current && (
               <div className="absolute inset-0 z-10 pointer-events-none">
                 <div className="relative w-full h-full pointer-events-auto">
                   {renderFields()}
                 </div>
               </div>
             )}
           </div>
           
           {/* Bottom padding for scrolling comfort */}
           <div className="h-12 w-full shrink-0"></div>
        </div>
      </div>
    </div>
  );
}
