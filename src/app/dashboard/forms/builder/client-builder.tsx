"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFormTemplate, updateFormTemplate } from "@/app/actions/form";
import { ArrowLeft, Plus, Trash2, Save, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";

type Field = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  description: string;
  mappedPdfField?: string;
};

const SELECT_CLASS = "flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer shadow-sm";

export default function FormBuilderClient({
  isAdmin,
  branches,
  initialTemplate,
  availableTemplates = []
}: {
  isAdmin: boolean;
  branches: string[];
  initialTemplate?: any;
  availableTemplates?: any[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialTemplate?.name || "");
  const [description, setDescription] = useState(initialTemplate?.description || "");
  const [formOwner, setFormOwner] = useState(initialTemplate?.formOwner || "");
  const [formTreater, setFormTreater] = useState(initialTemplate?.formTreater || "");
  const [pdfTemplateId, setPdfTemplateId] = useState(initialTemplate?.pdfTemplateId || "");
  const [pdfFields, setPdfFields] = useState<any[]>([]);
  const [fields, setFields] = useState<Field[]>(initialTemplate?.fields || [
    { id: "f1", label: "", type: "text", required: true, description: "", mappedPdfField: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch fields corresponding to the selected PDF template
  useEffect(() => {
    if (pdfTemplateId) {
       // Check if fields were already fed from initialTemplate if editing
       if (initialTemplate?.pdfTemplateId === pdfTemplateId && initialTemplate?.pdfFields) {
           setPdfFields(initialTemplate.pdfFields);
       } else {
           fetch(`/api/v1/templates/${pdfTemplateId}`)
             .then(res => res.json())
             .then(data => {
                if (data.success && data.data?.fields) {
                   setPdfFields(data.data.fields);
                } else {
                   setPdfFields([]);
                }
             })
             .catch(() => setPdfFields([]));
       }
    } else {
      setPdfFields([]);
    }
  }, [pdfTemplateId, initialTemplate]);

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-500 mb-6">
          Only users with the <strong>Administrator</strong> role can create new form templates.
        </p>
        <Link href="/dashboard/forms">
          <Button variant="outline" className="cursor-pointer">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Forms
          </Button>
        </Link>
      </div>
    );
  }

  const addField = () => {
    setFields([...fields, { id: `f${Date.now()}`, label: "", type: "text", required: false, description: "", mappedPdfField: "" }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: keyof Field, value: any) => {
    const updated = [...fields];
    (updated[index] as any)[key] = value;
    setFields(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Form name is required.");
    if (fields.length === 0) return setError("Add at least one field.");
    if (fields.some((f) => !f.label.trim())) return setError("All fields must have a label.");

    setIsSubmitting(true);
    let res;

    if (initialTemplate?.id) {
      res = await updateFormTemplate(
        initialTemplate.id,
        name.trim(),
        description,
        fields,
        formOwner || undefined,
        formTreater || undefined,
        pdfTemplateId || undefined
      );
    } else {
      res = await createFormTemplate(
        name.trim(),
        description,
        fields,
        formOwner || undefined,
        formTreater || undefined,
        pdfTemplateId || undefined
      );
    }
    
    setIsSubmitting(false);

    if (res.success) {
      router.push("/dashboard/forms");
    } else {
      setError(res.error ?? "Failed to save template.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="mb-4">
        <Link href="/dashboard/forms" className="inline-flex items-center text-sm text-gray-500 hover:text-primary transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to forms
        </Link>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">{initialTemplate ? "Edit Form Template" : "Form Builder"}</h2>
        <p className="text-gray-500">{initialTemplate ? "Update an existing form template." : "Create a new form template for the organisation."}</p>
      </div>

      <Card className="border-t-4 border-t-primary shadow-lg">
        <form onSubmit={handleSubmit}>
          <CardHeader className="bg-gray-50 border-b border-gray-100">
            <CardTitle>Template Details</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 pt-8">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <Label htmlFor="form-name">Form Name <span className="text-red-500">*</span></Label>
                <Input className="bg-white shadow-sm" id="form-name" placeholder="e.g. VISITOR LOG" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="form-desc">Description</Label>
                <Input className="bg-white shadow-sm" id="form-desc" placeholder="Brief purpose of this form" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              {/* Form Owner */}
              <div className="space-y-1">
                <Label htmlFor="form-owner">
                  Form Owner Branch
                  <span className="text-xs text-gray-400 ml-1">(branch that owns this form)</span>
                </Label>
                <select
                  id="form-owner"
                  value={formOwner}
                  onChange={(e) => setFormOwner(e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">— Select branch —</option>
                  {branches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Form Treater */}
              <div className="space-y-1">
                <Label htmlFor="form-treater">
                  Form Treater Branch
                  <span className="text-xs text-gray-400 ml-1">(branch that processes this form)</span>
                </Label>
                <select
                  id="form-treater"
                  value={formTreater}
                  onChange={(e) => setFormTreater(e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">— Select branch —</option>
                  {branches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* PDF Template Configuration */}
              <div className="md:col-span-2 space-y-3 bg-gray-50 border border-gray-100 rounded-lg p-5 mt-2">
                <div className="space-y-1">
                  <Label htmlFor="form-pdf-template" className="font-semibold text-gray-800">
                    PDF Generator Template
                  </Label>
                  <p className="text-xs text-gray-500 pb-2">Select a predefined PDF template layout to automatically map answers submitted for this form.</p>
                  <select
                    id="form-pdf-template"
                    value={pdfTemplateId}
                    onChange={(e) => setPdfTemplateId(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    <option value="">— No PDF Integration —</option>
                    {availableTemplates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                    ))}
                  </select>
                </div>

                {pdfTemplateId && pdfFields.length > 0 && (
                  <div className="pt-3 border-t border-gray-200">
                    <Label className="text-xs font-semibold text-gray-600 block mb-2">Required Template Mappings</Label>
                    <div className="flex flex-wrap gap-2">
                      {pdfFields.map(pf => {
                        const isPaired = fields.some(f => f.mappedPdfField === pf.name);
                        return (
                          <div 
                            key={pf.id} 
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-sm transition-colors ${
                              isPaired 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                             {isPaired ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                             {pf.name}
                          </div>
                        );
                      })}
                    </div>
                    {pdfFields.every(pf => fields.some(f => f.mappedPdfField === pf.name)) ? (
                      <p className="text-xs text-green-600 font-medium mt-2">All PDF fields have been successfully paired! 🎉</p>
                    ) : (
                      <p className="text-xs text-red-500 mt-2">Please ensure you pair every red template field with a form input below to guarantee generation logic.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Inputs</h3>

              <div className="space-y-4">
                {fields.map((field, idx) => (
                  <div key={field.id} className="p-5 border border-gray-200 rounded-lg bg-white group hover:border-primary/40 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all shadow-sm">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Field {idx + 1}</span>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => removeField(idx)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded cursor-pointer transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">Display Label <span className="text-red-500">*</span></Label>
                        <Input className="bg-gray-50/50" placeholder="e.g. Beneficiary Name" value={field.label} onChange={(e) => updateField(idx, "label", e.target.value)} required />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">Input Type</Label>
                        <select
                          value={field.type}
                          onChange={(e) => updateField(idx, "type", e.target.value)}
                          className={SELECT_CLASS}
                        >
                          <option value="text">Single line text</option>
                          <option value="textarea">Multi-line text</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="file">File Upload</option>
                        </select>
                      </div>
                      
                      {pdfTemplateId && pdfFields?.length > 0 && (
                        <div className="md:col-span-2 space-y-1.5 bg-blue-50/50 p-3 rounded-md border border-blue-100">
                          <Label className="text-xs font-semibold text-blue-800">Assign to PDF Template Field</Label>
                          <select
                            value={field.mappedPdfField || ""}
                            onChange={(e) => updateField(idx, "mappedPdfField", e.target.value)}
                            className={SELECT_CLASS}
                          >
                            <option value="">— Do not map —</option>
                            {pdfFields.map(pf => (
                              <option key={pf.id} value={pf.name}>{pf.name} ({pf.type})</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">Help Text</Label>
                        <Input className="bg-gray-50/50" placeholder="e.g. Enter your full account number" value={field.description} onChange={(e) => updateField(idx, "description", e.target.value)} />
                      </div>
                      
                      <div className="md:col-span-2 flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id={`req-${field.id}`}
                          checked={field.required}
                          onChange={(e) => updateField(idx, "required", e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <Label htmlFor={`req-${field.id}`} className="text-sm cursor-pointer font-medium text-gray-700">Required field</Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addField}
                className="w-full mt-6 border-dashed border-2 py-8 text-primary hover:text-primary hover:bg-primary/5 hover:border-primary cursor-pointer font-medium"
              >
                <Plus className="w-5 h-5 mr-2" /> Add Field
              </Button>
            </div>
          </CardContent>

          <CardFooter className="bg-gray-50 border-t border-gray-100 p-6 flex justify-end">
            <Button type="submit" disabled={isSubmitting} size="lg" className="cursor-pointer shadow-md">
              {isSubmitting ? "Saving…" : (<><Save className="w-5 h-5 mr-2" /> Publish Form Template</>)}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
