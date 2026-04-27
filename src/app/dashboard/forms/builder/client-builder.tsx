"use client";

import { useState, useEffect } from "react";
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

// ─── Account Form Presets ────────────────────────────────────────────────────
const ACCOUNT_FORM_PRESETS: Record<string, { name: string; description: string; fields: any[] }> = {
  deposit: {
    name: "New Deposit Account",
    description: "Individual deposit account opening form with KYC, identification, and mandate capture.",
    fields: [
      // ── Step 1 – Personal Information ──
      { id: "p_hdr",  label: "Personal Information",       type: "section_header", required: false, description: "", sectionSubtitle: "Please provide your personal details below" },
      { id: "p_bvn",  label: "BVN",                        type: "text",           required: true,  description: "Enter your 11-digit Bank Verification Number" },
      { id: "p_atyp", label: "Account Type",               type: "text",           required: true,  description: "e.g. Savings, Current" },
      { id: "p_ttl",  label: "Title",                      type: "text",           required: true,  description: "e.g. Mr, Mrs, Dr" },
      { id: "p_sur",  label: "Surname",                    type: "text",           required: true,  description: "" },
      { id: "p_fn",   label: "First Name",                 type: "text",           required: true,  description: "" },
      { id: "p_mn",   label: "Middle Name",                type: "text",           required: false, description: "" },
      { id: "p_dob",  label: "Date of Birth",              type: "date",           required: true,  description: "Applicant must be at least 18 years old" },
      { id: "p_gen",  label: "Gender",                     type: "text",           required: true,  description: "" },
      { id: "p_mar",  label: "Marital Status",             type: "text",           required: true,  description: "" },
      { id: "p_mmn",  label: "Mother's Maiden Name",       type: "text",           required: true,  description: "" },
      { id: "p_nat",  label: "Nationality",                type: "text",           required: true,  description: "" },
      { id: "p_soo",  label: "State of Origin",            type: "text",           required: true,  description: "" },
      { id: "p_lga",  label: "Local Government Area",      type: "text",           required: true,  description: "" },
      { id: "p_edu",  label: "Educational Qualification",  type: "text",           required: true,  description: "" },
      { id: "p_usc",  label: "US Citizen or Resident?",   type: "text",           required: true,  description: "Yes or No" },

      // ── Step 2 – Residential Address & Contact ──
      { id: "r_hdr",  label: "Residential Address & Contact", type: "section_header", required: false, description: "", sectionSubtitle: "Provide your current residential address and contact details" },
      { id: "r_adr",  label: "Residential Address",       type: "textarea",        required: true,  description: "Your full home address" },
      { id: "r_lmk",  label: "Nearest Landmark",          type: "text",           required: false, description: "Optional nearby landmark" },
      { id: "r_cty",  label: "City",                      type: "text",           required: true,  description: "" },
      { id: "r_phn",  label: "Phone Number",              type: "text",           required: true,  description: "Nigerian phone number (e.g. 08012345678)" },
      { id: "r_eml",  label: "Email Address",             type: "text",           required: true,  description: "" },
      { id: "r_sta",  label: "State",                     type: "text",           required: true,  description: "State of residence" },
      { id: "r_lga",  label: "LGA",                       type: "text",           required: true,  description: "Local Government Area of residence" },
      { id: "r_pty",  label: "Property Type",             type: "text",           required: true,  description: "e.g. Rented, Owned" },
      { id: "r_inc",  label: "Monthly Income",            type: "text",           required: true,  description: "Select your monthly income range" },

      // ── Step 3 – Employment Status ──
      { id: "e_hdr",  label: "Employment Status",          type: "section_header", required: false, description: "", sectionSubtitle: "Provide details about your occupation and employer" },
      { id: "e_occ",  label: "Occupation",                type: "text",           required: true,  description: "" },
      { id: "e_enm",  label: "Employer Name",             type: "text",           required: false, description: "" },
      { id: "e_ead",  label: "Employer Address",          type: "textarea",        required: false, description: "" },
      { id: "e_btp",  label: "Business / Employment Type",type: "text",           required: true,  description: "e.g. Self-employed, Government, Private" },
      { id: "e_fep",  label: "Financially Exposed Person?",type: "text",           required: true,  description: "Yes or No" },
      { id: "e_pep",  label: "Politically Exposed Person?",type: "text",           required: true,  description: "Yes or No" },

      // ── Step 4 – Identification ──
      { id: "id_hdr", label: "Identification",            type: "section_header", required: false, description: "", sectionSubtitle: "Provide a valid government-issued ID" },
      { id: "id_typ", label: "ID Type",                   type: "text",           required: true,  description: "e.g. National ID Card (NIN), Passport, Driver's Licence" },
      { id: "id_num", label: "ID Number",                 type: "text",           required: true,  description: "" },
      { id: "id_img", label: "ID Image",                  type: "file",           required: true,  description: "Upload a clear photo of the ID document" },

      // ── Step 5 – Spouse Details (conditional for married) ──
      { id: "sp_hdr", label: "Spouse Details",            type: "section_header", required: false, description: "", sectionSubtitle: "Complete if marital status is Married" },
      { id: "sp_ttl", label: "Spouse Title",              type: "text",           required: false, description: "" },
      { id: "sp_sur", label: "Spouse Surname",            type: "text",           required: false, description: "" },
      { id: "sp_fn",  label: "Spouse First Name",         type: "text",           required: false, description: "" },
      { id: "sp_mn",  label: "Spouse Middle Name",        type: "text",           required: false, description: "" },
      { id: "sp_mdn", label: "Spouse Maiden Name",        type: "text",           required: false, description: "" },
      { id: "sp_gen", label: "Spouse Gender",             type: "text",           required: false, description: "" },
      { id: "sp_nat", label: "Spouse Nationality",        type: "text",           required: false, description: "" },
      { id: "sp_sta", label: "Spouse State",              type: "text",           required: false, description: "" },
      { id: "sp_lga", label: "Spouse LGA",                type: "text",           required: false, description: "" },
      { id: "sp_eml", label: "Spouse Email Address",      type: "text",           required: false, description: "" },
      { id: "sp_tel", label: "Spouse Telephone",          type: "text",           required: false, description: "Nigerian phone number" },
      { id: "sp_adr", label: "Spouse Address",            type: "textarea",        required: false, description: "" },

      // ── Step 6 – Next of Kin ──
      { id: "nk_hdr", label: "Next of Kin",               type: "section_header", required: false, description: "", sectionSubtitle: "Provide emergency contact / next of kin details" },
      { id: "nk_nm",  label: "NOK Full Name",             type: "text",           required: true,  description: "" },
      { id: "nk_rel", label: "NOK Relationship",          type: "text",           required: true,  description: "e.g. Sibling, Parent, Spouse" },
      { id: "nk_adr", label: "NOK Address",               type: "textarea",        required: true,  description: "" },
      { id: "nk_tel", label: "NOK Telephone",             type: "text",           required: true,  description: "Nigerian phone number" },

      // ── Step 7 – Additional Details ──
      { id: "ad_hdr", label: "Additional Details",        type: "section_header", required: false, description: "", sectionSubtitle: "Select any additional banking services you require" },
      { id: "ad_svc", label: "Other Services Required",   type: "text",           required: true,  description: "e.g. Internet Banking, Mobile Banking, Debit Card, etc." },
      { id: "ad_src", label: "How did you hear about us?",type: "text",           required: true,  description: "e.g. Referral, Social Media, Walk-in, etc." },

      // ── Step 8 – Account Opening Mandate ──
      { id: "mn_hdr", label: "Account Opening Mandate",   type: "section_header", required: false, description: "", sectionSubtitle: "Passport photograph, customer signature, and account officer signature" },
      { id: "mn_pic", label: "Customer Picture",          type: "file",           required: true,  description: "Clear passport-style photograph of the customer" },
      { id: "mn_csg", label: "Customer Signature",        type: "file",           required: true,  description: "Customer's drawn signature" },
      { id: "mn_osg", label: "Account Officer Signature", type: "file",           required: true,  description: "Account officer's drawn signature" },
    ],
  },
};
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
  // conditional logic extras
  conditionSourceFieldId?: string;
  conditionOperator?: string;
  conditionCompareValue?: string;
  trueResultType?: "fixed" | "field" | "absolute_field";
  trueResultValue?: string;
  falseResultType?: "fixed" | "field" | "absolute_field";
  falseResultValue?: string;
  // select / searchable_select extras
  optionsSource?: "array" | "database";
  optionsArray?: string;
  optionsTable?: string;
  // section_header / instructions extras
  sectionSubtitle?: string;
  instructionsContent?: string;
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
  const [mobileEnabled, setMobileEnabled] = useState(initialTemplate?.mobileEnabled || false);
  const [accountServicesEnabled, setAccountServicesEnabled] = useState(initialTemplate?.accountServicesEnabled || false);
  const [formOwner, setFormOwner] = useState(initialTemplate?.formOwner || "");
  const [formTreater, setFormTreater] = useState(initialTemplate?.formTreater || "");
  const [pdfTemplateId, setPdfTemplateId] = useState(initialTemplate?.pdfTemplateId || "");
  const [pdfType, setPdfType] = useState<"document" | "html" | "">(initialTemplate?.pdfTemplateId ? "" : "");
  const [pdfFields, setPdfFields] = useState<any[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<any[]>(availableTemplates);
  const [allFormTemplates, setAllFormTemplates] = useState<any[]>([]);
  const [fields, setFields] = useState<Field[]>(initialTemplate?.fields || [
    { id: "f1", label: "", type: "text", required: true, description: "", mappedPdfField: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [presetApplied, setPresetApplied] = useState("");

  // Fetch all form templates (for prerequisite dropdown)
  useEffect(() => {
    fetch("/api/v1/forms")
      .then(r => r.json())
      .then(data => setAllFormTemplates(Array.isArray(data.data) ? data.data : []))
      .catch(() => setAllFormTemplates([]));
  }, []);

  // Fetch templates filtered by type whenever pdfType changes
  useEffect(() => {
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

  // Fetch template fields when template selection changes
  useEffect(() => {
    if (!pdfTemplateId) { setPdfFields([]); return; }
    if (initialTemplate?.pdfTemplateId === pdfTemplateId && initialTemplate?.pdfFields) {
      setPdfFields(initialTemplate.pdfFields);
      return;
    }
    fetch(`/api/v1/templates/${pdfTemplateId}`)
      .then(r => r.json())
      .then(data => setPdfFields(data.success && data.data?.fields ? data.data.fields : []))
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
        pdfTemplateId || undefined,
        mobileEnabled,
        accountServicesEnabled
      );
    } else {
      res = await createFormTemplate(
        name.trim(),
        description,
        fields,
        formOwner || undefined,
        formTreater || undefined,
        pdfTemplateId || undefined,
        mobileEnabled,
        accountServicesEnabled
      );
    }
    
    setIsSubmitting(false);

    if (res.success) {
      router.push("/dashboard/forms");
    } else {
      setError(res.error ?? "Failed to save template.");
    }
  };

  const applyPreset = (key: string) => {
    const preset = ACCOUNT_FORM_PRESETS[key];
    if (!preset) return;
    setName(preset.name);
    setDescription(preset.description);
    setAccountServicesEnabled(true);
    setFields(preset.fields.map((f) => ({ ...f, mappedPdfField: f.mappedPdfField ?? "" })));
    setPresetApplied(key);
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

      {/* ── Account Form Presets (only shown for new forms) ── */}
      {!initialTemplate && (
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-indigo-900">Account Services Presets</h3>
              <p className="text-xs text-indigo-700 mt-0.5">Start from a pre-built template that matches the PaperlessApp account forms — all fields are pre-configured for you.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(ACCOUNT_FORM_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={`flex flex-col items-start gap-1 px-4 py-3 rounded-lg border text-left transition-all cursor-pointer ${
                  presetApplied === key
                    ? "border-indigo-500 bg-indigo-600 text-white shadow-md"
                    : "border-indigo-200 bg-white text-indigo-900 hover:border-indigo-400 hover:bg-indigo-50"
                }`}
              >
                <span className="text-sm font-semibold">{preset.name}</span>
                <span className={`text-xs ${presetApplied === key ? "text-indigo-100" : "text-indigo-600"}`}>
                  {preset.fields.filter(f => f.type !== "section_header").length} fields across {preset.fields.filter(f => f.type === "section_header").length} sections
                </span>
              </button>
            ))}
          </div>
          {presetApplied && (
            <p className="mt-3 text-xs text-indigo-700 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-indigo-500" />
              Preset applied — review and customise the fields below, then publish.
            </p>
          )}
        </div>
      )}

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
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {/* Account Services Tab toggle */}
                <div className="flex items-center gap-2 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                  <input
                    type="checkbox"
                    id="account-services-enabled"
                    checked={accountServicesEnabled}
                    onChange={(e) => setAccountServicesEnabled(e.target.checked)}
                    className="h-5 w-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer flex-shrink-0"
                  />
                  <div className="flex flex-col">
                    <Label htmlFor="account-services-enabled" className="text-sm cursor-pointer font-bold text-indigo-900">
                      Enable for Account Services
                    </Label>
                    <span className="text-xs text-indigo-700">Form will appear under the Account Services tab in the dashboard.</span>
                  </div>
                </div>

                {/* Mobile App toggle */}
                <div className="flex items-center gap-2 bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                  <input
                    type="checkbox"
                    id="mobile-enabled"
                    checked={mobileEnabled}
                    onChange={(e) => setMobileEnabled(e.target.checked)}
                    className="h-5 w-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer flex-shrink-0"
                  />
                  <div className="flex flex-col">
                    <Label htmlFor="mobile-enabled" className="text-sm cursor-pointer font-bold text-emerald-900">
                      Enable for Mobile App
                    </Label>
                    <span className="text-xs text-emerald-700">Form will be accessible in the PaperlessApp mobile application.</span>
                  </div>
                </div>
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
                           </optgroup>
                        </select>
                      </div>

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
                                  }}
                                  className="text-blue-600 focus:ring-blue-600"
                                />
                                Database Table
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
                              <div className="mt-3 ml-6 space-y-1.5 bg-orange-50 border border-orange-200 rounded-lg p-3">
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
