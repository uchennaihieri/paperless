"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFormTemplate, updateFormTemplate } from "@/app/actions/form";
import { ArrowLeft, ArrowUp, ArrowDown, Plus, Trash2, Save, CheckCircle, XCircle, Wand2 } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Copy } from "lucide-react";

// ────────────────────────────────────────────────────────────────────────────

type Field = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  description: string;
  mappedPdfField?: string;
  derivedOperator?: string;
  derivedFirstField?: string;
  derivedSecondField?: string;
  isPrerequisite?: boolean;
  targetFormTemplateId?: string;
  prerequisiteOrder?: number;
  defaultPrereqBranch?: string;
  defaultPrereqRole?: string;
  // conditional logic extras
  conditionSourceFieldId?: string;
  conditionOperator?: string;
  conditionCompareValue?: string;
  trueResultType?: "fixed" | "field" | "absolute_field";
  trueResultValue?: string;
  falseResultType?: "fixed" | "field" | "absolute_field";
  falseResultValue?: string;
  // select / searchable_select extras
  optionsSource?: "array" | "database" | "reusable_list";
  optionsArray?: string;
  optionsTable?: string;
  reusableListId?: string;
  // section_header / instructions extras
  sectionSubtitle?: string;
  instructionsContent?: string;
  // extended service
  extendedService?: string;
};

const SELECT_CLASS = "flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer shadow-sm";

export default function FormBuilderClient({
  isAdmin,
  branches,
  initialTemplate,
  availableTemplates = [],
  roles
}: {
  isAdmin: boolean;
  branches: string[];
  initialTemplate?: any;
  availableTemplates?: any[];
  roles: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialTemplate?.name || "");
  const [description, setDescription] = useState(initialTemplate?.description || "");
  const [isInternal, setIsInternal] = useState(initialTemplate?.isInternal || false);
  const [accountServicesEnabled, setAccountServicesEnabled] = useState(initialTemplate?.accountServicesEnabled || false);
  const [formOwner, setFormOwner] = useState(initialTemplate?.formOwner || "");
  const [formTreater, setFormTreater] = useState(initialTemplate?.formTreater || "");
  const [formTreaterRole, setFormTreaterRole] = useState(initialTemplate?.formTreaterRole || "");
  const [isPublic, setIsPublic] = useState(initialTemplate?.isPublic || false);
  const [publicSlug, setPublicSlug] = useState(initialTemplate?.publicSlug || "");
  const [automatedSignatories, setAutomatedSignatories] = useState<{branch: string, role: string, signingType: string}[]>(
    typeof initialTemplate?.automatedSignatories === "string" ? JSON.parse(initialTemplate.automatedSignatories) : (initialTemplate?.automatedSignatories || [])
  );
  const [automatedSigningType, setAutomatedSigningType] = useState(initialTemplate?.automatedSigningType || "sequential");
  const [generatesExcel, setGeneratesExcel] = useState(initialTemplate?.generatesExcel || false);
  const [pdfTemplateId, setPdfTemplateId] = useState(initialTemplate?.pdfTemplateId || "");
  // Derive initial pdfType from the stored pdfGeneratorType field ("document" | "html" | "")
  const [pdfType, setPdfType] = useState<"document" | "html" | "">(
    initialTemplate?.pdfGeneratorType === "document" ? "document" :
    initialTemplate?.pdfGeneratorType === "html" ? "html" : ""
  );
  const [pdfFields, setPdfFields] = useState<any[]>([]);
  const [needsContract, setNeedsContract] = useState(initialTemplate?.needsContract || false);
  const [contractTemplateId, setContractTemplateId] = useState(initialTemplate?.contractTemplateId || "");
  const [filteredTemplates, setFilteredTemplates] = useState<any[]>(availableTemplates);
  const [allFormTemplates, setAllFormTemplates] = useState<any[]>([]);
  const [fields, setFields] = useState<Field[]>(initialTemplate?.fields || [
    { id: "f1", label: "", type: "text", required: true, description: "", mappedPdfField: "" },
  ]);
  const [reusableLists, setReusableLists] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch all form templates (for prerequisite dropdown)
  useEffect(() => {
    fetch("/api/v1/forms")
      .then(r => r.json())
      .then(data => setAllFormTemplates(Array.isArray(data.data) ? data.data : []))
      .catch(() => setAllFormTemplates([]));
  }, []);

  // Fetch reusable lists
  useEffect(() => {
    fetch("/api/v1/lists")
      .then(r => r.json())
      .then(data => setReusableLists(Array.isArray(data.data) ? data.data : []))
      .catch(() => setReusableLists([]));
  }, []);

  // Track whether pdfType has changed since the component mounted (user-initiated change)
  const pdfTypeMounted = useRef(false);
  // Guard: set to true just before a programmatic setPdfType call so the
  // pdfType effect knows not to reset pdfTemplateId in that case.
  const pdfTypeSetProgrammatically = useRef(false);

  // Fetch templates filtered by type whenever pdfType changes (skip on first mount)
  useEffect(() => {
    if (!pdfTypeMounted.current) {
      pdfTypeMounted.current = true;
      // On first render, if a type is pre-selected from initialTemplate, load its templates
      if (pdfType) {
        fetch(`/api/v1/templates?type=${pdfType}`)
          .then(r => r.json())
          .then(data => setFilteredTemplates(Array.isArray(data.data) ? data.data : []))
          .catch(() => setFilteredTemplates([]));
      }
      return;
    }
    // If this change was triggered programmatically (auto-detected from saved template),
    // skip the destructive reset so pdfTemplateId stays intact.
    if (pdfTypeSetProgrammatically.current) {
      pdfTypeSetProgrammatically.current = false;
      return;
    }
    // User changed the type manually — reset the template selection
    setPdfTemplateId("");
    setPdfFields([]);
    if (!pdfType) {
      setFilteredTemplates(availableTemplates);
      return;
    }
    fetch(`/api/v1/templates?type=${pdfType}`)
      .then(r => r.json())
      .then(data => setFilteredTemplates(Array.isArray(data.data) ? data.data : []))
      .catch(() => setFilteredTemplates([]));
  }, [pdfType]);

  // Track whether pdfType has been resolved from an existing template on mount
  const pdfTypeResolved = useRef(false);

  // Fetch template fields when template selection changes.
  // On initial mount with an existing pdfTemplateId, also set pdfType from the
  // fetched PDF template's own `type` field so the dropdown shows correctly.
  useEffect(() => {
    if (!pdfTemplateId) { setPdfFields([]); return; }
    if (initialTemplate?.pdfTemplateId === pdfTemplateId && initialTemplate?.pdfFields) {
      setPdfFields(initialTemplate.pdfFields);
      return;
    }
    fetch(`/api/v1/templates/${pdfTemplateId}`)
      .then(r => r.json())
      .then(data => {
        setPdfFields(data.success && data.data?.fields ? data.data.fields : []);
        // On first load, auto-detect pdfType from the PDF template's own type field
        if (!pdfTypeResolved.current && data.success && data.data?.type) {
          pdfTypeResolved.current = true;
          const detectedType = data.data.type as "document" | "html";
          // Signal that this setPdfType call is programmatic (not user-driven)
          pdfTypeSetProgrammatically.current = true;
          setPdfType(detectedType);
          // Load the filtered list for this type so the template select has options
          fetch(`/api/v1/templates?type=${detectedType}`)
            .then(r => r.json())
            .then(listData => setFilteredTemplates(Array.isArray(listData.data) ? listData.data : []))
            .catch(() => {});
        }
      })
      .catch(() => setPdfFields([]));
  }, [pdfTemplateId, initialTemplate]);

  // Split by mappingPath: null = needs Form Builder pairing; non-null = auto-populated
  const unmappedPdfFields = pdfFields.filter((pf: any) => pf.mappingPath === null || pf.mappingPath === undefined);
  const autoMappedPdfFields = pdfFields.filter((pf: any) => pf.mappingPath && pf.mappingPath !== "FormInput");

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
    setFields([...fields, { id: `f${Date.now()}`, label: "", type: "text", required: false, description: "", mappedPdfField: "", isPrerequisite: false, targetFormTemplateId: "" }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const moveFieldUp = (index: number) => {
    if (index === 0) return;
    const updated = [...fields];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setFields(updated);
  };

  const moveFieldDown = (index: number) => {
    if (index === fields.length - 1) return;
    const updated = [...fields];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setFields(updated);
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
    if (fields.some((f: any) => f.isPrerequisite && !f.targetFormTemplateId))
      return setError("All prerequisite fields must have a target form selected.");

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
        formTreaterRole || undefined,
        pdfTemplateId || undefined,
        false, // mobileEnabled removed
        accountServicesEnabled,
        isInternal,
        needsContract,
        contractTemplateId || undefined,
        automatedSignatories,
        automatedSigningType,
        generatesExcel,
        pdfType || "none"
      );
    } else {
      res = await createFormTemplate(
        name.trim(),
        description,
        fields,
        formOwner || undefined,
        formTreater || undefined,
        formTreaterRole || undefined,
        pdfTemplateId || undefined,
        false, // mobileEnabled removed
        accountServicesEnabled,
        isInternal,
        needsContract,
        contractTemplateId || undefined,
        automatedSignatories,
        automatedSigningType,
        generatesExcel,
        pdfType || "none"
      );
    }
    
    setIsSubmitting(false);

    if (res.success) {
      router.push("/dashboard/forms");
    } else {
      setError(res.error ?? "Failed to save template.");
    }
  };

  const handleTogglePublic = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.checked;
    setIsPublic(nextVal);
    if (!initialTemplate?.id) {
      // Allow them to toggle state, but we don't save until the form is created.
      // Wait, we actually can't generate a slug without an ID easily, or we can just tell them to save first.
      alert("Please save the form template first before enabling the public link.");
      setIsPublic(false);
      return;
    }
    
    try {
      // You may need to adapt your session token logic or use apiClient if available
      const res = await fetch(`/api/v1/forms/${initialTemplate.id}/toggle-public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: nextVal })
      });
      const data = await res.json();
      if (data.success) {
        setPublicSlug(data.data.publicSlug || "");
      } else {
        alert("Failed to toggle public link.");
        setIsPublic(!nextVal);
      }
    } catch(err) {
      alert("Failed to toggle public link.");
      setIsPublic(!nextVal);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <Link href="/dashboard/forms" className="inline-flex items-center text-sm text-gray-500 hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to forms
      </Link>


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

              {/* Visibility Toggles */}
              <div className="md:col-span-2 space-y-3 mt-2">
                <div className="flex flex-col sm:flex-row gap-4 mb-2">
                  {/* Account Services toggle */}
                  <div className="flex-1 flex items-center gap-2 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                    <input
                      type="checkbox"
                      id="account-services"
                      checked={accountServicesEnabled}
                      onChange={(e) => setAccountServicesEnabled(e.target.checked)}
                      className="h-5 w-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer flex-shrink-0"
                    />
                    <div className="flex flex-col">
                      <Label htmlFor="account-services" className="text-sm cursor-pointer font-bold text-indigo-900">
                        Enable Account Services Integration
                      </Label>
                      <span className="text-xs text-indigo-700">Form can be assigned to customer profiles during account opening.</span>
                    </div>
                  </div>

                  {/* Internal Form toggle */}
                  <div className="flex-1 flex items-center gap-2 bg-orange-50 p-4 rounded-lg border border-orange-100">
                    <input
                      type="checkbox"
                      id="internal-form"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="h-5 w-5 rounded border-orange-300 text-orange-600 focus:ring-orange-600 cursor-pointer flex-shrink-0"
                    />
                    <div className="flex flex-col">
                      <Label htmlFor="internal-form" className="text-sm cursor-pointer font-bold text-orange-900">
                        Mark as Internal Form
                      </Label>
                      <span className="text-xs text-orange-700">This form will be hidden from the main list and can be attached to other forms.</span>
                    </div>
                  </div>
                </div>

                {/* Public Link Toggle */}
                {initialTemplate?.id && (
                  <div className="flex flex-col gap-2 bg-green-50 p-4 rounded-lg border border-green-100">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="public-form"
                        checked={isPublic}
                        onChange={handleTogglePublic}
                        className="h-5 w-5 rounded border-green-300 text-green-600 focus:ring-green-600 cursor-pointer flex-shrink-0"
                      />
                      <div className="flex flex-col">
                        <Label htmlFor="public-form" className="text-sm cursor-pointer font-bold text-green-900">
                          Enable Public Link
                        </Label>
                        <span className="text-xs text-green-700">Generate a unique link that external users can fill out without logging in.</span>
                      </div>
                    </div>
                    {isPublic && publicSlug && (
                      <div className="mt-2 pl-7 flex items-center gap-2">
                        <div className="bg-white border border-green-200 px-3 py-1.5 rounded-md text-sm font-mono text-green-800 flex-1">
                          {`${process.env.NEXT_PUBLIC_FRONTEND_URL || typeof window !== 'undefined' ? window.location.origin : ''}/${publicSlug}`}
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon" 
                          className="shrink-0 text-green-600 border-green-200 hover:bg-green-100 cursor-pointer"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/${publicSlug}`);
                            alert("Copied to clipboard!");
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
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
                  <option value="">— None (No Treater Required) —</option>
                  {branches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Form Treater Role */}
              <div className="space-y-1">
                <Label htmlFor="form-treater-role">
                  Form Treater Role
                  <span className="text-xs text-gray-400 ml-1">(role that processes this form)</span>
                </Label>
                <select
                  id="form-treater-role"
                  value={formTreaterRole}
                  onChange={(e) => setFormTreaterRole(e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">— Any Role —</option>
                  {roles.map((r: any) => (
                    <option key={r.id || r} value={r.name || r}>{r.name || r}</option>
                  ))}
                </select>
              </div>

              {/* PDF Template Configuration */}
              <div className="md:col-span-2 space-y-4 bg-gray-50 border border-gray-100 rounded-lg p-5 mt-2">
                <Label className="font-semibold text-gray-800">PDF Generator Template</Label>
                <p className="text-xs text-gray-500">Select a predefined PDF template to automatically generate a document when this form is fully signed.</p>

                {/* Step 1 – Type selector */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPdfType("")}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                      pdfType === "" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    No PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfType("document")}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                      pdfType === "document" ? "border-primary bg-primary text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    📄 Document PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfType("html")}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                      pdfType === "html" ? "border-purple-600 bg-purple-600 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {'</>'} HTML PDF
                  </button>
                </div>

                {/* Step 2 – Template dropdown (only when type is selected) */}
                {pdfType && (
                  <div className="space-y-1">
                    <Label htmlFor="form-pdf-template" className="text-xs font-semibold text-gray-700">
                      Select {pdfType === "html" ? "HTML" : "Document"} Template
                    </Label>
                    <select
                      id="form-pdf-template"
                      value={pdfTemplateId}
                      onChange={(e) => setPdfTemplateId(e.target.value)}
                      className={SELECT_CLASS}
                    >
                      <option value="">— Select template —</option>
                      {filteredTemplates.map((tpl: any) => (
                        <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                      ))}
                    </select>
                    {filteredTemplates.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">No {pdfType} templates found. <a href="/dashboard/templates/new" className="underline">Create one first.</a></p>
                    )}
                  </div>
                )}

                {pdfTemplateId && pdfFields.length > 0 && (
                  <div className="pt-3 border-t border-gray-200 space-y-4">

                    {/* Auto-populated fields — green info badges, no pairing needed */}
                    {autoMappedPdfFields.length > 0 && (
                      <div>
                        <Label className="text-xs font-semibold text-gray-600 block mb-2">Auto-populated Variables</Label>
                        <div className="flex flex-wrap gap-2">
                          {autoMappedPdfFields.map((pf: any) => (
                            <div key={pf.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              <code className="font-mono">{`{{${pf.name}}}`}</code>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-green-600 mt-1.5">These are filled automatically — no pairing needed.</p>
                      </div>
                    )}

                    {/* Unmapped fields — need Form Builder pairing */}
                    {unmappedPdfFields.length > 0 ? (
                      <div>
                        <Label className="text-xs font-semibold text-gray-600 block mb-2">Required Mappings</Label>
                        <div className="flex flex-wrap gap-2">
                          {unmappedPdfFields.map((pf: any) => {
                            const isPaired = fields.some(f => f.mappedPdfField === pf.name);
                            return (
                              <div
                                key={pf.id}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-sm transition-colors ${
                                  isPaired ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                                }`}
                              >
                                {isPaired ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                                {pf.name}
                              </div>
                            );
                          })}
                        </div>
                        {unmappedPdfFields.every((pf: any) => fields.some(f => f.mappedPdfField === pf.name)) ? (
                          <p className="text-xs text-green-600 font-medium mt-2">All fields paired! 🎉</p>
                        ) : (
                          <p className="text-xs text-red-500 mt-2">Pair every red field with a form input below using the &quot;Assign to PDF Template Field&quot; selector.</p>
                        )}
                      </div>
                    ) : (
                      pdfFields.length > 0 && autoMappedPdfFields.length === pdfFields.length && (
                        <p className="text-xs text-green-600 font-medium">All template variables are auto-populated. No form pairing needed. 🎉</p>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Contract Configuration */}
              <div className="md:col-span-2 space-y-4 bg-gray-50 border border-gray-100 rounded-lg p-5 mt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-semibold text-gray-800">Needs Contract</Label>
                    <p className="text-xs text-gray-500">Enable this to generate a signing request for the form submitter after internal approval.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={needsContract} onChange={(e) => setNeedsContract(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {needsContract && (
                  <div className="space-y-1 mt-4">
                    <Label htmlFor="contract-template" className="text-xs font-semibold text-gray-700">
                      Select Contract Template (HTML PDF)
                    </Label>
                    <select
                      id="contract-template"
                      value={contractTemplateId}
                      onChange={(e) => setContractTemplateId(e.target.value)}
                      className={SELECT_CLASS}
                    >
                      <option value="">— Select template —</option>
                      {availableTemplates.filter(t => t.type === "html").map((tpl: any) => (
                        <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                      ))}
                    </select>
                    {availableTemplates.filter(t => t.type === "html").length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">No HTML templates found. <a href="/dashboard/templates/new" className="underline">Create one first.</a></p>
                    )}
                  </div>
                )}
              </div>

              {/* Automated Signatories Configuration */}
              <div className="md:col-span-2 space-y-4 bg-gray-50 border border-gray-100 rounded-lg p-5 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <Label className="font-semibold text-gray-800">Automated Signatories</Label>
                    <p className="text-xs text-gray-500">Define signatories that will be automatically assigned when this form is submitted.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAutomatedSignatories([...automatedSignatories, { branch: "", role: "", signingType: "sequential" }])}
                    className="flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Signatory
                  </Button>
                </div>

                {automatedSignatories.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b">
                      <Label className="text-sm font-semibold text-gray-700">Signing Order Strategy</Label>
                      <select
                        value={automatedSigningType}
                        onChange={(e) => setAutomatedSigningType(e.target.value)}
                        className="h-8 rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                      >
                        <option value="sequential">Sequential (One by one)</option>
                        <option value="parallel">Parallel (All at once)</option>
                      </select>
                    </div>

                    {automatedSignatories.map((sig, index) => (
                      <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-lg border shadow-sm">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                          {automatedSigningType === "sequential" ? index + 1 : "-"}
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <select
                            value={sig.branch}
                            onChange={(e) => {
                              const updated = [...automatedSignatories];
                              updated[index].branch = e.target.value;
                              setAutomatedSignatories(updated);
                            }}
                            className={SELECT_CLASS}
                          >
                            <option value="">— Select branch —</option>
                            {branches.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                          <select
                            value={sig.role}
                            onChange={(e) => {
                              const updated = [...automatedSignatories];
                              updated[index].role = e.target.value;
                              setAutomatedSignatories(updated);
                            }}
                            className={SELECT_CLASS}
                          >
                            <option value="">— Select role —</option>
                            {roles.map((r: any) => <option key={r.id || r} value={r.name || r}>{r.name || r}</option>)}
                          </select>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setAutomatedSignatories(automatedSignatories.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Excel Data Dump */}
              <div className="md:col-span-2 space-y-4 bg-emerald-50 border border-emerald-100 rounded-lg p-5 mt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-semibold text-emerald-900">Generate Excel Data Dump</Label>
                    <p className="text-xs text-emerald-700 mt-0.5">When enabled, this form can be selected as a data source when creating a Report. Admins can then spool an Excel export of all submissions at any time.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={generatesExcel} onChange={(e) => setGeneratesExcel(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Inputs</h3>

              <div className="space-y-4">
                {fields.map((field, idx) => (
                  <div key={field.id} className="p-5 border border-gray-200 rounded-lg bg-white group hover:border-primary/40 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all shadow-sm">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                         {(field as any).type === 'section_header' ? '📌 Section Header' :
                          (field as any).type === 'instructions' ? '📄 Instructions Block' :
                          `Field ${idx + 1}`}
                       </span>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => moveFieldUp(idx)} disabled={idx === 0} className="text-gray-400 hover:text-primary hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent p-1.5 rounded cursor-pointer transition-colors" title="Move Up">
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => moveFieldDown(idx)} disabled={idx === fields.length - 1} className="text-gray-400 hover:text-primary hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent p-1.5 rounded cursor-pointer transition-colors" title="Move Down">
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        {fields.length > 1 && (
                          <button type="button" onClick={() => removeField(idx)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded cursor-pointer transition-colors ml-2 border-l border-gray-100 pl-3">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">
                           {field.type === 'section_header' ? 'Section Title' :
                            field.type === 'instructions' ? 'Block Heading (optional)' :
                            <>Display Label <span className="text-red-500">*</span></>}
                         </Label>
                        <Input className="bg-gray-50/50" placeholder={
                           field.type === 'section_header' ? 'e.g. Personal Information' :
                           field.type === 'instructions' ? 'e.g. Terms & Conditions' :
                           'e.g. Beneficiary Name'
                         } value={field.label} onChange={(e) => updateField(idx, "label", e.target.value)} required={field.type !== 'instructions'} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">Input Type</Label>
                        <select
                          value={field.type}
                          onChange={(e) => updateField(idx, "type", e.target.value)}
                          className={SELECT_CLASS}
                        >
                          <optgroup label="Standard Fields">
                             <option value="text">Single line text</option>
                             <option value="textarea">Multi-line text</option>
                             <option value="number">Number</option>
                             <option value="date">Date</option>
                             <option value="file">File Upload</option>
                             <option value="select">Dropdown Select</option>
                             <option value="searchable_select">Searchable Select (Combobox)</option>
                             <option
                               value="derived_arithmetically"
                               disabled={fields.filter(f => f.type === 'number' && f.id !== field.id).length < 2 && field.type !== "derived_arithmetically"}
                             >
                               Derived Arithmetically {fields.filter(f => f.type === 'number' && f.id !== field.id).length < 2 && field.type !== "derived_arithmetically" ? "(requires 2 numeric fields)" : ""}
                             </option>
                             <option
                               value="to_words"
                               disabled={fields.filter(f => f.type === 'number' && f.id !== field.id).length === 0 && field.type !== 'to_words'}
                             >
                               🔤 Number to Words {fields.filter(f => f.type === 'number' && f.id !== field.id).length === 0 && field.type !== 'to_words' ? '(requires a numeric field)' : ''}
                             </option>
                             <option
                               value="conditional"
                               disabled={fields.filter(f => f.type === 'number' || f.type === 'derived_arithmetically').length === 0 && field.type !== 'conditional'}
                             >
                               🔀 Conditional Logic {fields.filter(f => f.type === 'number' || f.type === 'derived_arithmetically').length === 0 && field.type !== 'conditional' ? '(requires a numeric field)' : ''}
                             </option>
                           </optgroup>
                           <optgroup label="Layout & Content">
                             <option value="section_header">📌 Section Header</option>
                             <option value="instructions">📄 Instructions / Contract</option>
                             <option 
                               value="signable_document"
                               disabled={fields.filter(f => f.type === 'signable_document' && f.id !== field.id).length > 0}
                             >
                               ✍️ Signable Document (Replaces Form PDF)
                             </option>
                           </optgroup>
                           <optgroup label="Integrations">
                             <option value="extended_service">🔗 Data from Extended Services</option>
                           </optgroup>
                        </select>
                      </div>

                      {field.type === "extended_service" && (
                        <div className="md:col-span-2 bg-blue-50/50 p-4 rounded-md border border-blue-100 space-y-4">
                          <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest border-b border-blue-200 pb-2 mb-3">Service Configuration</h4>
                          <div className="space-y-1.5 max-w-sm">
                            <Label className="text-xs font-semibold text-blue-800">Target Service <span className="text-red-500">*</span></Label>
                            <select
                              value={field.extendedService || ""}
                              onChange={(e) => updateField(idx, "extendedService", e.target.value)}
                              className={SELECT_CLASS}
                            >
                              <option value="">— Select service —</option>
                              <option value="nin">NIN Verification</option>
                              <option value="bvn">BVN Verification</option>
                              <option value="firstcentral">FirstCentral CRB</option>
                              <option value="creditregistry">CreditRegistry CRB</option>
                            </select>
                            <p className="text-xs text-blue-600 mt-1">
                              When filling out the form, users will enter a reference number. The system will look up the reference and attach the generated PDF.
                            </p>
                          </div>
                        </div>
                      )}

                      {field.type === "derived_arithmetically" && (
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 bg-purple-50/50 p-4 rounded-md border border-purple-100">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-purple-800">First Field</Label>
                            <select
                              value={field.derivedFirstField || ""}
                              onChange={(e) => updateField(idx, "derivedFirstField", e.target.value)}
                              className={SELECT_CLASS}
                            >
                              <option value="">— Select numeric field —</option>
                              {fields.filter(f => f.type === 'number' && f.id !== field.id).map(f => (
                                <option key={f.id} value={f.id}>{f.label || `Field ${f.id}`}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-purple-800">Operator</Label>
                            <select
                              value={field.derivedOperator || ""}
                              onChange={(e) => updateField(idx, "derivedOperator", e.target.value)}
                              className={SELECT_CLASS}
                            >
                              <option value="">— Select operator —</option>
                              <option value="+">+ (Add)</option>
                              <option value="-">- (Subtract)</option>
                              <option value="*">× (Multiply)</option>
                              <option value="/">÷ (Divide)</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-purple-800">Second Field</Label>
                            <select
                              value={field.derivedSecondField || ""}
                              onChange={(e) => updateField(idx, "derivedSecondField", e.target.value)}
                              className={SELECT_CLASS}
                            >
                              <option value="">— Select numeric field —</option>
                              {fields.filter(f => f.type === 'number' && f.id !== field.id).map(f => (
                                <option key={f.id} value={f.id}>{f.label || `Field ${f.id}`}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Conditional logic config */}
                      {field.type === 'conditional' && (
                        <div className="md:col-span-2 bg-amber-50/50 p-4 rounded-md border border-amber-100 space-y-4">
                          <h4 className="text-xs font-bold text-amber-800 uppercase tracking-widest border-b border-amber-200 pb-2 mb-3">IF Condition</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-amber-800">Source Field <span className="text-red-500">*</span></Label>
                              <select
                                value={(field as any).conditionSourceFieldId || ""}
                                onChange={(e) => updateField(idx, "conditionSourceFieldId" as any, e.target.value)}
                                className={SELECT_CLASS}
                              >
                                <option value="">— Select field —</option>
                                {fields.filter(f => (f.type === 'number' || f.type === 'derived_arithmetically') && f.id !== field.id).map(f => (
                                  <option key={f.id} value={f.id}>{f.label || `Field ${f.id}`}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-amber-800">Operator <span className="text-red-500">*</span></Label>
                              <select
                                value={(field as any).conditionOperator || ""}
                                onChange={(e) => updateField(idx, "conditionOperator" as any, e.target.value)}
                                className={SELECT_CLASS}
                              >
                                <option value="">— Operator —</option>
                                <option value="<">Less Than (&lt;)</option>
                                <option value=">">Greater Than (&gt;)</option>
                                <option value="<=">Less or Equal (&lt;=)</option>
                                <option value=">=">Greater or Equal (&gt;=)</option>
                                <option value="==">Equals (==)</option>
                                <option value="!=">Not Equals (!=)</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-amber-800">Compare Value <span className="text-red-500">*</span></Label>
                              <Input
                                type="number"
                                className="bg-white border-neutral-300"
                                placeholder="e.g. 0"
                                value={(field as any).conditionCompareValue || ""}
                                onChange={(e) => updateField(idx, "conditionCompareValue" as any, e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {/* THEN */}
                            <div className="space-y-3 border-r border-amber-200 pr-4">
                              <h4 className="text-xs font-bold text-green-700 uppercase tracking-widest">THEN (If True)</h4>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-green-800">Output Type</Label>
                                <select
                                  value={(field as any).trueResultType || "fixed"}
                                  onChange={(e) => {
                                    updateField(idx, "trueResultType" as any, e.target.value);
                                    updateField(idx, "trueResultValue" as any, ""); // Reset value on type change
                                  }}
                                  className={SELECT_CLASS}
                                >
                                  <option value="fixed">Fixed Value (Number/Text)</option>
                                  <option value="field">Value of Another Field</option>
                                  <option value="absolute_field">Absolute Value of Another Field</option>
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-green-800">Output Value <span className="text-red-500">*</span></Label>
                                {((field as any).trueResultType || "fixed") === "field" || ((field as any).trueResultType || "fixed") === "absolute_field" ? (
                                  <select
                                    value={(field as any).trueResultValue || ""}
                                    onChange={(e) => updateField(idx, "trueResultValue" as any, e.target.value)}
                                    className={SELECT_CLASS}
                                  >
                                    <option value="">— Select field —</option>
                                    {fields.filter(f => f.id !== field.id && f.type !== "section_header" && f.type !== "instructions").map(f => (
                                      <option key={f.id} value={f.id}>{f.label || `Field ${f.id}`}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <Input
                                    className="bg-white border-neutral-300"
                                    placeholder="e.g. 500 or N/A"
                                    value={(field as any).trueResultValue || ""}
                                    onChange={(e) => updateField(idx, "trueResultValue" as any, e.target.value)}
                                  />
                                )}
                              </div>
                            </div>
                            
                            {/* ELSE */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-red-700 uppercase tracking-widest">ELSE (If False)</h4>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-red-800">Output Type</Label>
                                <select
                                  value={(field as any).falseResultType || "fixed"}
                                  onChange={(e) => {
                                    updateField(idx, "falseResultType" as any, e.target.value);
                                    updateField(idx, "falseResultValue" as any, "");
                                  }}
                                  className={SELECT_CLASS}
                                >
                                  <option value="fixed">Fixed Value (Number/Text)</option>
                                  <option value="field">Value of Another Field</option>
                                  <option value="absolute_field">Absolute Value of Another Field</option>
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-red-800">Output Value <span className="text-red-500">*</span></Label>
                                {((field as any).falseResultType || "fixed") === "field" || ((field as any).falseResultType || "fixed") === "absolute_field" ? (
                                  <select
                                    value={(field as any).falseResultValue || ""}
                                    onChange={(e) => updateField(idx, "falseResultValue" as any, e.target.value)}
                                    className={SELECT_CLASS}
                                  >
                                    <option value="">— Select field —</option>
                                    {fields.filter(f => f.id !== field.id && f.type !== "section_header" && f.type !== "instructions").map(f => (
                                      <option key={f.id} value={f.id}>{f.label || `Field ${f.id}`}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <Input
                                    className="bg-white border-neutral-300"
                                    placeholder="e.g. 0"
                                    value={(field as any).falseResultValue || ""}
                                    onChange={(e) => updateField(idx, "falseResultValue" as any, e.target.value)}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* To Words config */}
                      {field.type === 'to_words' && (
                        <div className="md:col-span-2 bg-teal-50/50 p-4 rounded-md border border-teal-100 space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-teal-800">Source Numeric Field <span className="text-red-500">*</span></Label>
                            <select
                              value={(field as any).sourceFieldId || ""}
                              onChange={(e) => updateField(idx, "sourceFieldId" as any, e.target.value)}
                              className={SELECT_CLASS}
                            >
                              <option value="">— Select the numeric field —</option>
                              {fields.filter(f => (f.type === 'number' || f.type === 'derived_arithmetically') && f.id !== field.id).map(f => (
                                <option key={f.id} value={f.id}>{f.label || `Field ${f.id}`}</option>
                              ))}
                            </select>
                          </div>
                          <p className="text-xs text-teal-700">This field will automatically display the selected number in British-English words (e.g. "One Million Two Hundred And Seventy-Five Thousand Only").</p>
                        </div>
                      )}
                      
                      {pdfTemplateId && unmappedPdfFields.length > 0 && (
                        <div className="md:col-span-2 space-y-1.5 bg-blue-50/50 p-3 rounded-md border border-blue-100">
                          <Label className="text-xs font-semibold text-blue-800">Assign to PDF Template Field</Label>
                          <select
                            value={field.mappedPdfField || ""}
                            onChange={(e) => updateField(idx, "mappedPdfField", e.target.value)}
                            className={SELECT_CLASS}
                          >
                            <option value="">— Do not map —</option>
                            {unmappedPdfFields.map((pf: any) => (
                              <option key={pf.id} value={pf.name}>{pf.name} ({pf.type})</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Section Header extras */}
                      {field.type === 'section_header' && (
                        <div className="md:col-span-2 space-y-1.5 bg-slate-50 border border-slate-200 rounded-lg p-3">
                          <Label className="text-xs font-semibold text-slate-700">Subtitle / Description (optional)</Label>
                          <Input
                            className="bg-white"
                            placeholder="e.g. Please provide your personal details below"
                            value={(field as any).sectionSubtitle || ""}
                            onChange={(e) => updateField(idx, "sectionSubtitle" as any, e.target.value)}
                          />
                        </div>
                      )}

                      {/* Instructions Block extras */}
                      {field.type === 'instructions' && (() => {
                        const SYSTEM_TOKENS = [
                          { key: 'date',        label: 'Today\'s Date' },
                          { key: 'user.name',   label: 'Customer Name' },
                          { key: 'user.email',  label: 'Customer Email' },
                          { key: 'user.branch', label: 'Customer Branch' },
                        ];
                        const fieldTokens = fields
                          .filter((f: any) => f.type !== 'section_header' && f.type !== 'instructions' && f.label?.trim())
                          .map((f: any) => ({ key: f.label.trim(), label: f.label.trim() }));

                        const insertToken = (token: string) => {
                          const current: string = (field as any).instructionsContent || '';
                          updateField(idx, 'instructionsContent' as any, current + `{{${token}}}`);
                        };

                        return (
                          <div className="md:col-span-2 space-y-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <Label className="text-xs font-semibold text-amber-800">
                              Instructions / Contract Content <span className="text-red-500">*</span>
                            </Label>
                            <RichTextEditor
                              content={(field as any).instructionsContent || ''}
                              onChange={(html) => updateField(idx, 'instructionsContent' as any, html)}
                              placeholder="e.g. I, {{user.name}}, hereby agree to the terms below on {{date}}…"
                            />

                            {/* Placeholder helper */}
                            <div className="space-y-2 pt-1 border-t border-amber-200">
                              <p className="text-xs font-semibold text-amber-800">
                                Available placeholders — click to insert at end:
                              </p>

                              <div className="flex flex-wrap gap-1.5">
                                <span className="text-xs text-amber-700 font-medium mr-1 self-center">System:</span>
                                {SYSTEM_TOKENS.map(t => (
                                  <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => insertToken(t.key)}
                                    title={`Insert {{${t.key}}}`}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono bg-white border border-amber-400 text-amber-800 hover:bg-amber-100 hover:border-amber-600 transition-colors cursor-pointer"
                                  >
                                    {`{{${t.key}}}`}
                                    <span className="font-sans text-amber-500 text-[10px] ml-0.5">({t.label})</span>
                                  </button>
                                ))}
                              </div>

                              {fieldTokens.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  <span className="text-xs text-amber-700 font-medium mr-1 self-center">Fields:</span>
                                  {fieldTokens.map((t: any) => (
                                    <button
                                      key={t.key}
                                      type="button"
                                      onClick={() => insertToken(t.key)}
                                      title={`Insert {{${t.key}}}`}
                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 hover:border-amber-500 transition-colors cursor-pointer"
                                    >
                                      {`{{${t.key}}}`}
                                    </button>
                                  ))}
                                </div>
                              )}

                              <p className="text-xs text-amber-600 italic">
                                Placeholders are filled in live as the submitter fills the form. Unfilled ones show as <em>[field name]</em> until entered.
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Select / Searchable Select config */}
                      {(field.type === 'select' || field.type === 'searchable_select') && (
                        <div className="md:col-span-2 bg-blue-50/50 p-4 rounded-md border border-blue-100 space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-blue-800">Options Source</Label>
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 text-sm text-blue-900">
                                <input
                                  type="radio"
                                  name={`optionsSource-${field.id}`}
                                  checked={field.optionsSource !== 'database'}
                                  onChange={() => {
                                    updateField(idx, "optionsSource", "array");
                                    updateField(idx, "optionsTable", "");
                                  }}
                                  className="text-blue-600 focus:ring-blue-600"
                                />
                                Static List (Comma-separated)
                              </label>
                              <label className="flex items-center gap-2 text-sm text-blue-900">
                                <input
                                  type="radio"
                                  name={`optionsSource-${field.id}`}
                                  checked={field.optionsSource === 'database'}
                                  onChange={() => {
                                    updateField(idx, "optionsSource", "database");
                                    updateField(idx, "optionsArray", "");
                                    updateField(idx, "reusableListId", "");
                                  }}
                                  className="text-blue-600 focus:ring-blue-600"
                                />
                                Database Table
                              </label>
                              <label className="flex items-center gap-2 text-sm text-blue-900">
                                <input
                                  type="radio"
                                  name={`optionsSource-${field.id}`}
                                  checked={field.optionsSource === 'reusable_list'}
                                  onChange={() => {
                                    updateField(idx, "optionsSource", "reusable_list");
                                    updateField(idx, "optionsArray", "");
                                    updateField(idx, "optionsTable", "");
                                  }}
                                  className="text-blue-600 focus:ring-blue-600"
                                />
                                Reusable List
                              </label>
                            </div>
                          </div>

                          {field.optionsSource === 'database' ? (
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-blue-800">Database Table Name</Label>
                              <Input
                                placeholder="e.g. users"
                                value={field.optionsTable || ""}
                                onChange={(e) => updateField(idx, "optionsTable", e.target.value)}
                                className="bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                              />
                              <p className="text-[11px] text-blue-600">The backend will fetch from the "Options" column of this table.</p>
                            </div>
                          ) : field.optionsSource === 'reusable_list' ? (
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-blue-800">Select Reusable List</Label>
                              <select
                                value={field.reusableListId || ""}
                                onChange={(e) => updateField(idx, "reusableListId", e.target.value)}
                                className="flex h-10 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-blue-900"
                              >
                                <option value="">— Select List —</option>
                                {reusableLists.map((list) => (
                                  <option key={list.id} value={list.id}>{list.name}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-blue-800">Options (Comma-separated)</Label>
                              <Input
                                placeholder="e.g. Apple, Banana, Orange"
                                value={field.optionsArray || ""}
                                onChange={(e) => updateField(idx, "optionsArray", e.target.value)}
                                className="bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* File Block extras */}
                      {field.type === 'file' && (
                        <div className="md:col-span-2 space-y-3 bg-orange-50/50 p-3 rounded-md border border-orange-100">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-orange-800">Linked Internal Form</Label>
                            <select
                              value={(field as any).linkedInternalFormId || ""}
                              onChange={(e) => updateField(idx, "linkedInternalFormId" as any, e.target.value)}
                              className={SELECT_CLASS}
                            >
                              <option value="">— No Internal Form —</option>
                              {allFormTemplates
                                .filter((ft: any) => ft.isInternal === true)
                                .map((ft: any) => (
                                  <option key={ft.id} value={ft.id}>{ft.name}</option>
                                ))
                              }
                            </select>
                            <p className="text-xs text-orange-700 mt-1">If selected, users can either upload a file or click to fill this internal form as an attachment.</p>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-orange-100">
                            <div>
                              <Label className="text-xs font-semibold text-orange-800">Allow Multiple Attachments</Label>
                              <p className="text-xs text-orange-600">Let users upload more than one file for this field.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateField(idx, "maxFiles" as any, (field as any).maxFiles > 1 ? 1 : 10)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${(field as any).maxFiles > 1 ? "bg-orange-500" : "bg-gray-200"}`}
                            >
                              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${(field as any).maxFiles > 1 ? "translate-x-4" : "translate-x-0"}`} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Help text, Required & Prerequisite — only for real input fields */}
                      {field.type !== 'section_header' && field.type !== 'instructions' && (
                        <>
                          {pdfTemplateId && unmappedPdfFields.length > 0 && (
                            <div className="md:col-span-2 space-y-1.5 bg-blue-50/50 p-3 rounded-md border border-blue-100">
                              <Label className="text-xs font-semibold text-blue-800">Assign to PDF Template Field</Label>
                              <select
                                value={field.mappedPdfField || ""}
                                onChange={(e) => updateField(idx, "mappedPdfField", e.target.value)}
                                className={SELECT_CLASS}
                              >
                                <option value="">— Do not map —</option>
                                {unmappedPdfFields.map((pf: any) => (
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

                          {/* Prerequisite field toggle */}
                          <div className="md:col-span-2 border-t border-orange-100 pt-3 mt-1">
                            <div className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                id={`prereq-${field.id}`}
                                checked={(field as any).isPrerequisite || false}
                                onChange={(e) => updateField(idx, "isPrerequisite" as any, e.target.checked)}
                                className="h-4 w-4 mt-0.5 rounded border-orange-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                              />
                              <div className="flex flex-col">
                                <Label htmlFor={`prereq-${field.id}`} className="text-sm cursor-pointer font-bold text-orange-800">Prerequisite field</Label>
                                <span className="text-xs text-orange-700 mt-0.5">The submitter enters an email address. That person must complete a linked form before this submission can proceed to signing.</span>
                              </div>
                            </div>
                            {(field as any).isPrerequisite && (
                              <div className="mt-3 ml-6 space-y-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
                                
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-semibold text-orange-800">Required Prerequisite Form <span className="text-red-500">*</span></Label>
                                  <select
                                    value={(field as any).targetFormTemplateId || ""}
                                    onChange={(e) => updateField(idx, "targetFormTemplateId" as any, e.target.value)}
                                    className={SELECT_CLASS}
                                  >
                                    <option value="">— Select the form they must complete —</option>
                                    {allFormTemplates.map((tpl: any) => (
                                      <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                                    ))}
                                  </select>
                                  {!(field as any).targetFormTemplateId && (
                                    <p className="text-xs text-orange-600">You must select a prerequisite form template.</p>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-orange-800">Execution Order</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={(field as any).prerequisiteOrder || 1}
                                      onChange={(e) => updateField(idx, "prerequisiteOrder" as any, parseInt(e.target.value) || 1)}
                                      className="bg-white text-sm"
                                    />
                                    <p className="text-[10px] text-orange-600">Lower numbers execute first.</p>
                                  </div>

                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-orange-800">Default Assignee Branch</Label>
                                    <select
                                      value={(field as any).defaultPrereqBranch || ""}
                                      onChange={(e) => updateField(idx, "defaultPrereqBranch" as any, e.target.value)}
                                      className={SELECT_CLASS}
                                    >
                                      <option value="">— No Default —</option>
                                      <option value="USER BRANCH">Current User's Branch</option>
                                      {branches.map((b) => (
                                        <option key={b} value={b}>{b}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-orange-800">Default Assignee Role</Label>
                                    <select
                                      value={(field as any).defaultPrereqRole || ""}
                                      onChange={(e) => updateField(idx, "defaultPrereqRole" as any, e.target.value)}
                                      className={SELECT_CLASS}
                                    >
                                      <option value="">— No Default —</option>
                                      {roles.map((r) => (
                                        <option key={r} value={r}>{r}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                              </div>
                            )}
                          </div>
                        </>
                      )}
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
