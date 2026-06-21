"use client";

import { useState, useEffect } from "react";
import { X, Save, CheckCircle } from "lucide-react";

interface Field {
  id: string;
  label: string;
  type: string;
  [key: string]: any;
}

interface MappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfTemplateId: string;
  pdfFields: any[];
  currentMappings: Record<string, string>;
  onSave: (mappings: Record<string, string>) => void;
  formFields: Field[];
}

export default function MappingModal({
  isOpen, onClose, pdfTemplateId, pdfFields, currentMappings, onSave, formFields
}: MappingModalProps) {
  const [mappings, setMappings] = useState<Record<string, string>>(currentMappings || {});
  const [dict, setDict] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMappings(currentMappings || {});
    setLoading(true);
    fetch(`/api/v1/templates/data-dictionary?templateId=${pdfTemplateId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setDict(d.data);
      })
      .finally(() => setLoading(false));
  }, [isOpen, currentMappings, pdfTemplateId]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(mappings);
    onClose();
  };

  const updateMapping = (fieldName: string, val: string) => {
    setMappings(prev => ({
      ...prev,
      [fieldName]: val
    }));
  };

  // Group dict by category
  const categories = Array.from(new Set(dict.map(d => d.category)));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Map Template Variables</h3>
            <p className="text-xs text-gray-500">Connect PDF/HTML template fields to Form Data or System Variables.</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pdfFields.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">
              No fields found in this template.
            </div>
          ) : (
            pdfFields.map((pf) => {
              const val = mappings[pf.name] || "";
              return (
                <div key={pf.name} className={`p-4 border rounded-xl flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${val ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-white'}`}>
                  <div className="w-1/3 shrink-0">
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                      {val ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                      {pf.name}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-0.5">{pf.type}</p>
                  </div>
                  
                  <div className="flex-1">
                    <select
                      value={val}
                      onChange={e => updateMapping(pf.name, e.target.value)}
                      className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-shadow"
                    >
                      <option value="">— Select Source —</option>
                      
                      <optgroup label="Form Questions">
                        {formFields.filter(f => f.label.trim()).map(f => (
                          <option key={f.id} value={`formResponses.${f.label}`}>
                            {f.label}
                          </option>
                        ))}
                      </optgroup>

                      {categories.map(cat => (
                        <optgroup key={cat} label={cat}>
                          {dict.filter(d => d.category === cat).map(d => (
                            <option key={d.path} value={d.path}>
                              {d.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0 bg-gray-50/50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-sm"
          >
            <Save className="w-4 h-4" /> Save Mappings
          </button>
        </div>

      </div>
    </div>
  );
}
