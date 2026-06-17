"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isFormReferenceField } from "@/components/FormReferenceLink";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchUsers, SignatoryInput, SigningType } from "@/app/actions/form";
import { X, Search, Check, ChevronRight, GitBranch, Layers, Send, UserPlus, ArrowLeft, KeyRound, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { numberToWords } from "@/lib/toWords";
import { SignatureSelectionModal } from "@/app/dashboard/components/SignatureSelectionModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type Field = {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "textarea" | "file" | "conditional" | "extended_service" | "event_selector";
  required: boolean;
  description?: string;
  maxLength?: number;
  maxFiles?: number;
  accept?: string;
  extendedService?: string;
};

type UserResult = {
  id: number;
  user_name: string | null;
  finca_email: string | null;
  branch: string | null;
  user_role: string | null;
};

// ─── Section helpers ─────────────────────────────────────────────────────────

interface Section { id: string; title: string; subtitle?: string; fields: any[]; }

function groupIntoSections(fields: any[]): Section[] {
  const out: Section[] = [];
  let cur: Section = { id: '__start', title: '', fields: [] };
  for (const f of fields) {
    if (f.type === 'section_header') {
      out.push(cur);
      cur = { id: f.id, title: f.label || 'Section', subtitle: f.sectionSubtitle, fields: [] };
    } else {
      cur.fields.push(f);
    }
  }
  out.push(cur);
  return out.filter(s => s.title || s.fields.length > 0);
}

// Interpolate {{tokens}} in an HTML string from the WYSIWYG editor
function htmlInterpolate(html: string, fields: any[], formData: Record<string, any>, user: any): string {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const sys: Record<string, string> = {
    date: today,
    'user.name': user?.user_name || user?.name || '',
    'user.email': user?.finca_email || user?.email || '',
    'user.branch': user?.branch || '',
  };
  return html.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const k = key.trim();
    if (k in sys) return sys[k] ? `<strong style="text-decoration:underline dotted">${sys[k]}</strong>` : `<em style="color:#b50938;opacity:.6">[${k}]</em>`;
    const f = fields.find((f: any) => f.type !== 'section_header' && f.type !== 'instructions' && f.label?.toLowerCase() === k.toLowerCase());
    if (!f) return `<em style="color:#b50938;opacity:.6">[${k}]</em>`;
    const val = formData[f.id];
    return val !== undefined && val !== null && val !== '' ? `<strong style="text-decoration:underline dotted">${val}</strong>` : `<em style="color:#b50938;opacity:.6">[${k}]</em>`;
  });
}

// ─── Instruction Token Interpolation ─────────────────────────────────────────

type Segment = { type: "text"; value: string } | { type: "token"; key: string };

function parseSegments(content: string): Segment[] {
  const parts = content.split(/(\{\{[^}]+\}\})/g);
  return parts.map((p) => {
    const m = p.match(/^\{\{([^}]+)\}\}$/);
    if (m) return { type: "token", key: m[1].trim() };
    return { type: "text", value: p };
  });
}

function resolveToken(
  key: string,
  fields: any[],
  formData: Record<string, any>,
  user: any
): string | null {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const sys: Record<string, string> = {
    date: today,
    "user.name": user?.user_name || user?.name || "",
    "user.email": user?.finca_email || user?.email || "",
    "user.branch": user?.branch || "",
  };
  if (key in sys) return sys[key] || null;
  // Match against field label
  const field = fields.find(
    (f: any) =>
      f.type !== "section_header" &&
      f.type !== "instructions" &&
      f.label?.toLowerCase() === key.toLowerCase()
  );
  if (!field) return null;
  const val = formData[field.id];
  return val !== undefined && val !== null && val !== "" ? String(val) : null;
}

function InterpolatedContent({
  content,
  fields,
  formData,
  user,
}: {
  content: string;
  fields: any[];
  formData: Record<string, any>;
  user: any;
}) {
  const segments = parseSegments(content);
  return (
    <span className="text-xs text-gray-700 leading-relaxed font-sans whitespace-pre-wrap">
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.value}</span>;
        const value = resolveToken(seg.key, fields, formData, user);
        if (value)
          return (
            <strong key={i} className="text-gray-900 underline decoration-dotted decoration-primary/50">
              {value}
            </strong>
          );
        return (
          <span key={i} className="italic text-primary/60 bg-primary/5 px-0.5 rounded">
            [{seg.key}]
          </span>
        );
      })}
    </span>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = ["Fill Form", "Add Signatories", "Review & Submit"];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((label, idx) => {
        const step = idx + 1;
        const done = currentStep > step;
        const active = currentStep === step;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                ${done ? "bg-primary border-primary text-white" :
                  active ? "bg-white border-primary text-primary" :
                    "bg-white border-gray-200 text-gray-400"}`}>
                {done ? <Check className="w-4 h-4" /> : step}
              </div>
              <span className={`text-xs mt-1 font-medium whitespace-nowrap ${active ? "text-primary" : done ? "text-gray-600" : "text-gray-400"}`}>
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-20 h-0.5 mb-5 mx-1 ${done ? "bg-primary" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Searchable Select Component ───────────────────────────────────────────────

function SearchableSelect({
  id,
  options,
  value,
  onChange,
  required,
  placeholder = "Select an option...",
  disabled = false,
}: {
  id: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.value.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative max-w-md" ref={containerRef}>
      <div
        className={`flex w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all cursor-pointer shadow-sm ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : ""}`}
        onClick={() => { if (!disabled) setOpen(!open); }}
      >
        <span className={`block truncate flex-1 ${!selectedOption ? "text-neutral-500" : "text-neutral-900"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronRight className={`w-4 h-4 text-neutral-400 transition-transform ${open ? "rotate-90" : "rotate-0"}`} />
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-gray-100 flex items-center shrink-0">
            <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
            <input
              className="w-full text-sm outline-none bg-transparent"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-2 text-sm text-gray-500 text-center">No options found.</div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`px-3 py-2 text-sm cursor-pointer rounded-sm flex items-center justify-between hover:bg-gray-100 ${value === opt.value ? "bg-primary/5 text-primary font-medium" : "text-gray-700"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(opt.value);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  {value === opt.value && <Check className="w-4 h-4 shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Hidden native input for required validation */}
      <input
        type="text"
        id={id}
        value={value}
        onChange={() => { }}
        required={required}
        className="opacity-0 absolute -z-10 w-0 h-0"
      />
    </div>
  );
}

// ─── Step 1: Form Fields ──────────────────────────────────────────────────────

function FormFieldsStep({
  template,
  formData,
  internalFormsData,
  onChange,
  onNext,
  onFillInternalForm,
  onRemoveInternalForm,
  token,
  currentUser,
  submitting,
  dynamicOptions,
  setDynamicOptions,
}: {
  template: any;
  formData: Record<string, any>;
  internalFormsData: Record<string, any[]>;
  onChange: (id: string, value: any) => void;
  onNext: () => void;
  onFillInternalForm: (fieldId: string, linkedFormId: string, index?: number) => void;
  onRemoveInternalForm: (fieldId: string, index: number) => void;
  token?: string;
  currentUser?: { userName: string; email: string };
  submitting?: boolean;
  dynamicOptions: Record<string, { label: string; value: string }[]>;
  setDynamicOptions: React.Dispatch<React.SetStateAction<Record<string, { label: string; value: string }[]>>>;
}) {
  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";
  const fields: any[] = typeof template.fields === "string" 
    ? JSON.parse(template.fields) 
    : template.fields ?? [];

  // ── Section navigation ────────────────────────────────────────────────────
  const sections = useMemo(() => groupIntoSections(fields), []); // eslint-disable-line
  const [sectionIdx, setSectionIdx] = useState(0);
  const [sectionError, setSectionError] = useState('');

  const section = sections[sectionIdx];
  const isLastSection = sectionIdx === sections.length - 1;
  const hasSections = sections.length > 1 || !!sections[0]?.title;


  // Form reference auto-fill logic
  const formReferenceField = fields.find(f => isFormReferenceField(f.label));
  const referenceValue = formReferenceField ? formData[formReferenceField.id] : undefined;

  const [referenceData, setReferenceData] = useState<Record<string, any> | null>(null);
  const [loadingReference, setLoadingReference] = useState(false);

  useEffect(() => {
    if (!formReferenceField || !referenceValue || typeof referenceValue !== "string" || referenceValue.trim().length <= 2) {
      setReferenceData(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingReference(true);
      try {
        const res = await fetch(`${BASE_URL}/api/v1/submissions/by-reference/${encodeURIComponent(referenceValue.trim())}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
          setReferenceData(data.data.formResponses);
        } else {
          setReferenceData(null);
        }
      } catch (e) {
        setReferenceData(null);
      } finally {
        setLoadingReference(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [referenceValue, token, BASE_URL]);

  useEffect(() => {
    if (referenceData && fields.length > 0) {
      fields.forEach(field => {
        if (field.description) {
          const match = field.description.match(/Referenced\s+"([^"]+)"/i);
          if (match && match[1]) {
            const sourceLabel = match[1];
            const sourceValue = referenceData[sourceLabel];
            if (sourceValue !== undefined && sourceValue !== null && sourceValue !== "") {
              if (formData[field.id] !== sourceValue) {
                onChange(field.id, sourceValue);
              }
            }
          }
        }
      });
    }
  }, [referenceData]);

  // Extended Service Live Validation
  const [extendedStatus, setExtendedStatus] = useState<Record<string, { loading: boolean; valid: boolean; label?: string }>>({});

  useEffect(() => {
    fields.forEach(field => {
      if ((field as any).type === "extended_service" && (field as any).extendedService) {
        const val = formData[field.id];
        if (!val || typeof val !== "string" || val.trim().length < 3) {
          setExtendedStatus(prev => ({ ...prev, [field.id]: { loading: false, valid: false } }));
          return;
        }

        const service = (field as any).extendedService;
        const currentRef = val.trim();

        const timer = setTimeout(async () => {
          setExtendedStatus(prev => ({ ...prev, [field.id]: { loading: true, valid: false } }));
          try {
            const endpoint = (service === "nin" || service === "bvn") ? "/api/v1/identity/validate" : "/api/v1/credit-bureau/validate";
            const res = await fetch(`${BASE_URL}${endpoint}?service=${service}&reference=${encodeURIComponent(currentRef)}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.valid) {
              setExtendedStatus(prev => ({ ...prev, [field.id]: { loading: false, valid: true, label: data.label } }));
            } else {
              setExtendedStatus(prev => ({ ...prev, [field.id]: { loading: false, valid: false } }));
            }
          } catch (e) {
            setExtendedStatus(prev => ({ ...prev, [field.id]: { loading: false, valid: false } }));
          }
        }, 800);

        return () => clearTimeout(timer);
      }
    });
  }, [formData, fields, token, BASE_URL]);

  // Derived + To-Words auto-calculation
  useEffect(() => {
    fields.forEach(field => {
      if ((field as any).type === 'section_header' || (field as any).type === 'instructions') return;

      if (field.type === "derived_arithmetically" && (field as any).derivedFirstField && (field as any).derivedSecondField) {
        const val1 = Number(formData[(field as any).derivedFirstField] || 0);
        const val2 = Number(formData[(field as any).derivedSecondField] || 0);
        let result = 0;
        switch ((field as any).derivedOperator) {
          case "+": result = val1 + val2; break;
          case "-": result = val1 - val2; break;
          case "*": result = val1 * val2; break;
          case "/": result = val2 !== 0 ? val1 / val2 : 0; break;
        }
        if (formData[field.id] !== result) onChange(field.id, result);
      }

      if ((field as any).type === 'to_words' && (field as any).sourceFieldId) {
        const srcVal = formData[(field as any).sourceFieldId];
        let valToConvert = srcVal;
        if (srcVal !== undefined && srcVal !== null && srcVal !== "") {
          const num = Number(srcVal);
          if (!isNaN(num)) valToConvert = Math.abs(num);
        }
        const words = numberToWords(valToConvert ?? '');
        if (formData[field.id] !== words) onChange(field.id, words);
      }

      if (field.type === "conditional" && (field as any).conditionSourceFieldId && (field as any).conditionOperator) {
        const srcVal = Number(formData[(field as any).conditionSourceFieldId] || 0);
        const compVal = Number((field as any).conditionCompareValue || 0);
        let isTrue = false;
        switch ((field as any).conditionOperator) {
          case "<": isTrue = srcVal < compVal; break;
          case ">": isTrue = srcVal > compVal; break;
          case "<=": isTrue = srcVal <= compVal; break;
          case ">=": isTrue = srcVal >= compVal; break;
          case "==": isTrue = srcVal === compVal; break;
          case "!=": isTrue = srcVal !== compVal; break;
        }

        const resolveResult = (type: string, val: string) => {
          if (!val) return "";
          if (type === "field") {
            const refVal = formData[val];
            return refVal !== undefined && refVal !== null ? refVal : 0;
          }
          if (type === "absolute_field") {
            const refVal = formData[val];
            const num = Number(refVal);
            return isNaN(num) ? 0 : Math.abs(num);
          }
          // type === "fixed"
          return isNaN(Number(val)) ? val : Number(val);
        };

        const result = isTrue
          ? resolveResult((field as any).trueResultType || "fixed", (field as any).trueResultValue)
          : resolveResult((field as any).falseResultType || "fixed", (field as any).falseResultValue);

        if (formData[field.id] !== result) onChange(field.id, result);
      }
    });
  }, [formData, fields]);

  // Dynamic Options Fetching

  useEffect(() => {
    const fetchOptions = async () => {
      const newOptions: Record<string, { label: string, value: string }[]> = {};

      for (const field of fields) {
        if ((field.type === "select" || field.type === "searchable_select") && field.optionsSource === "database" && field.optionsTable) {
          try {
            const res = await fetch(`${BASE_URL}/api/v1/forms/dynamic-options?table=${encodeURIComponent(field.optionsTable)}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.data) {
              newOptions[field.id] = data.data;
            } else {
              newOptions[field.id] = [];
            }
          } catch (e) {
            console.error("Failed to fetch options for", field.id, e);
            newOptions[field.id] = [];
          }
        } else if ((field.type === "select" || field.type === "searchable_select") && field.optionsSource === "reusable_list" && field.reusableListId) {
          try {
            const res = await fetch(`${BASE_URL}/api/v1/lists/${field.reusableListId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.data && Array.isArray(data.data.items)) {
              newOptions[field.id] = data.data.items.map((s: string) => ({ label: s, value: s }));
            } else {
              newOptions[field.id] = [];
            }
          } catch (e) {
            console.error("Failed to fetch reusable list options for", field.id, e);
            newOptions[field.id] = [];
          }
        } else if ((field.type === "select" || field.type === "searchable_select") && field.optionsSource !== "database" && field.optionsSource !== "reusable_list" && field.optionsArray) {
          // Parse static array
          newOptions[field.id] = field.optionsArray.split(",").map((s: string) => s.trim()).filter(Boolean).map((s: string) => ({ label: s, value: s }));
        } else if (field.type === "extended_service" && field.extendedService) {
          try {
            const res = await fetch(`${BASE_URL}/api/v1/forms/extended-options?service=${encodeURIComponent(field.extendedService)}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.data) {
              newOptions[field.id] = data.data;
            } else {
              newOptions[field.id] = [];
            }
          } catch (e) {
            console.error("Failed to fetch extended options for", field.id, e);
            newOptions[field.id] = [];
          }
        } else if (field.type === "event_selector") {
          try {
            const res = await fetch(`${BASE_URL}/api/v1/events/all`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.events) {
              newOptions[field.id] = data.events.map((e: any) => ({
                label: `${e.name} (${e.reference})`,
                value: e.id
              }));
            } else {
              newOptions[field.id] = [];
            }
          } catch (e) {
            console.error("Failed to fetch event options for", field.id, e);
            newOptions[field.id] = [];
          }
        }
      }

      setDynamicOptions((prev: Record<string, { label: string; value: string }[]>) => ({ ...prev, ...newOptions }));
    };

    fetchOptions();
  }, [fields, token, BASE_URL]);

  const handleSectionNext = () => {
    const missing = (section?.fields ?? []).filter((f: any) => {
      if (f.type === 'instructions') return false;
      if (!f.required) return false;

      // For file fields linked to an internal form, an uploaded file AND/OR
      // a filled internal form satisfies the requirement.
      if (f.type === 'file' && f.linkedInternalFormId) {
        const hasFile = formData[f.id] && formData[f.id].length > 0;
        const hasInternalForm = internalFormsData[f.id] && internalFormsData[f.id].length > 0;
        return !hasFile && !hasInternalForm;
      }

      return (
        formData[f.id] === undefined ||
        formData[f.id] === null ||
        formData[f.id] === '' ||
        (Array.isArray(formData[f.id]) && formData[f.id].length === 0)
      );
    });
    if (missing.length > 0) {
      setSectionError(`Please fill in: ${missing.map((f: any) => f.label).join(', ')}`);
      return;
    }
    setSectionError('');
    if (!isLastSection) {
      setSectionIdx(i => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onNext();
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSectionNext(); }}>
      {/* ── Section sub-step indicator ── */}
      {hasSections && (
        <div className="px-6 pt-4 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {sections.map((sec, i) => (
              <span key={sec.id} className="flex items-center gap-2 shrink-0">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                  ${i < sectionIdx ? 'bg-primary border-primary text-white' :
                    i === sectionIdx ? 'bg-white border-primary text-primary' :
                      'bg-white border-gray-200 text-gray-400'}`}>
                  {i < sectionIdx ? '✓' : i + 1}
                </span>
                {(sections.length <= 6 || i === sectionIdx) && (
                  <span className={`text-xs font-medium whitespace-nowrap hidden sm:block
                    ${i === sectionIdx ? 'text-primary font-semibold' : i < sectionIdx ? 'text-gray-600' : 'text-gray-400'}`}>
                    {sec.title || 'General'}
                  </span>
                )}
                {i < sections.length - 1 && <span className={`h-px flex-shrink-0 ${sections.length > 6 ? 'w-4' : 'w-8'} ${i < sectionIdx ? 'bg-primary' : 'bg-gray-200'}`} />}
              </span>
            ))}
          </div>
          {section?.subtitle && <p className="text-xs text-gray-500 mt-2">{section.subtitle}</p>}
        </div>
      )}

      <CardContent className="space-y-8 pt-8">
        {(() => {
          let questionNum = 0;
          return (section?.fields ?? fields).map((field: any) => {
            // Layout-only fields have no input
            if ((field as any).type === 'section_header') {
              return (
                <div key={field.id} className="pt-4 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-primary uppercase tracking-widest">{field.label}</span>
                      {(field as any).sectionSubtitle && (
                        <span className="text-xs text-gray-500 mt-0.5">{(field as any).sectionSubtitle}</span>
                      )}
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-l from-primary/30 to-transparent" />
                  </div>
                </div>
              );
            }

            if ((field as any).type === 'instructions') {
              const raw: string = (field as any).instructionsContent || '';
              const sessionUser = (currentUser as any) ?? {};
              const processedHtml = htmlInterpolate(raw, fields, formData, sessionUser);
              return (
                <div key={field.id} className="space-y-2">
                  {field.label && <p className="text-sm font-semibold text-gray-800">{field.label}</p>}
                  <div
                    className="bg-gray-50 border border-gray-200 rounded-xl p-5 max-h-80 overflow-y-auto text-sm text-gray-700 leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-gray-500 [&_hr]:border-gray-200 [&_p]:my-1"
                    dangerouslySetInnerHTML={{ __html: processedHtml }}
                  />
                  <p className="text-xs text-gray-400 italic">Please read the above carefully before proceeding.</p>
                </div>
              );
            }

            let hasReferenceValue = false;
            if (referenceData && field.description) {
              const match = field.description.match(/Referenced\s+"([^"]+)"/i);
              if (match && match[1]) {
                const sourceLabel = match[1];
                const sourceValue = referenceData[sourceLabel];
                if (sourceValue !== undefined && sourceValue !== null && sourceValue !== "") {
                  hasReferenceValue = true;
                }
              }
            }

            questionNum++;
            return (
              <div key={field.id} className="space-y-2">
                <div>
                  <Label htmlFor={field.id} className="text-base font-semibold flex items-center justify-between gap-2">
                    <span className="flex gap-2">
                      <span className="text-primary text-sm">{questionNum}.</span>
                      {field.label}
                      {field.required && <span className="text-red-500">*</span>}
                    </span>
                    {isFormReferenceField(field.label) && loadingReference && (
                      <span className="text-xs text-primary animate-pulse flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Resolving reference...
                      </span>
                    )}
                  </Label>
                  {field.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{field.description}</p>
                  )}
                </div>

                {(() => {
                  const isLockedPrereq = !!((field as any).isPrerequisite && (field as any).defaultPrereqBranch && (field as any).defaultPrereqRole && formData[field.id]);
                  const isReadOnly = hasReferenceValue || isLockedPrereq;
                  
                  if (field.type === "signable_document") {
                    return (
                      <div className="border-2 border-dashed border-primary/50 rounded-lg p-6 bg-primary/5 hover:bg-primary/10 transition-colors max-w-xl">
                        <Input
                          id={field.id}
                          type="file"
                          required={field.required && (!formData[field.id] || formData[field.id].length === 0)}
                          accept="application/pdf"
                          multiple={false}
                          className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30"
                          onChange={async (e) => {
                            const newFiles = Array.from(e.target.files ?? []);
                            if (newFiles.length === 0) return;
                            onChange(field.id, [newFiles[0]]);
                            e.target.value = "";
                          }}
                        />
                        <p className="text-xs text-primary/70 mt-2">
                          Upload the PDF document that will be used for signing. Only one PDF is allowed.
                        </p>
                        {formData[field.id] && formData[field.id].length > 0 && (
                          <ul className="mt-4 space-y-2">
                            {(formData[field.id] as File[]).map((f, i) => (
                              <li key={i} className="text-sm text-primary flex items-center justify-between bg-white px-3 py-2 rounded-md border border-primary/20 shadow-sm">
                                <span className="truncate font-semibold">{f.name}</span>
                                <button type="button" onClick={() => {
                                  onChange(field.id, null);
                                }} className="text-red-400 hover:text-red-600 font-bold p-1">&times;</button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  }
                  
                  if (field.type === "textarea") {
                    return (
                      <textarea
                        id={field.id}
                        required={field.required}
                        rows={4}
                        value={formData[field.id] ?? ""}
                        onChange={(e) => onChange(field.id, e.target.value)}
                        readOnly={isReadOnly}
                        className={`flex w-full max-w-xl rounded-md border border-neutral-300 px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${isReadOnly ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-transparent"}`}
                      />
                    );
                  }
                  if (field.type === "file") {
                    return (
                      <div className="space-y-3 max-w-xl">
                        {(field as any).linkedInternalFormId ? (
                          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                            {/* Custom Form Section */}
                            <div className="p-5 border-b border-gray-100">
                              <div className="flex flex-col items-center justify-center text-center space-y-4 py-4 w-full">
                                <Layers className="w-10 h-10 text-orange-200" />
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900">Custom Form Attachments</h4>
                                  <p className="text-xs text-gray-500 max-w-sm mt-1">Fill out the designated internal form to proceed with this requirement.</p>
                                </div>
                                <div className="w-full max-w-md space-y-3 mt-4">
                                  {(internalFormsData[field.id] || []).map((filledForm: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-orange-200 rounded-lg shadow-sm">
                                      <div className="flex items-center gap-3">
                                        <div className="bg-orange-100 p-2 rounded-full text-orange-600 font-bold text-xs">
                                          #{idx + 1}
                                        </div>
                                        <div className="text-left">
                                          <p className="text-sm font-semibold text-gray-800">{filledForm.templateName || "Internal Form"}</p>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-8 text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                                          onClick={() => onFillInternalForm(field.id, (field as any).linkedInternalFormId, idx)}
                                        >
                                          Edit
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                                          onClick={() => onRemoveInternalForm(field.id, idx)}
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="mt-2 border-orange-300 text-orange-700 hover:bg-orange-100"
                                  onClick={() => onFillInternalForm(field.id, (field as any).linkedInternalFormId)}
                                >
                                  {(internalFormsData[field.id] || []).length > 0 ? "Add Another Custom Form" : "Fill Custom Form"}
                                </Button>
                              </div>
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-3 px-5 py-2 bg-gray-50">
                              <div className="h-px flex-1 bg-gray-200" />
                              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Also attach files</span>
                              <div className="h-px flex-1 bg-gray-200" />
                            </div>

                            {/* File Upload Section */}
                            <div className="p-5">
                              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 bg-gray-50 hover:bg-gray-100 transition-colors">
                                <Input
                                  id={field.id}
                                  type="file"
                                  accept={field.accept}
                                  multiple={(field.maxFiles ?? 1) > 1}
                                  className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                  onChange={async (e) => {
                                    const newFiles = Array.from(e.target.files ?? []);
                                    if (newFiles.length === 0) return;
                                    const existing = (formData[field.id] as File[]) || [];
                                    const merged = [...existing, ...newFiles];
                                    onChange(field.id, merged);
                                    e.target.value = "";
                                  }}
                                />
                                {(field.maxFiles ?? 1) > 1 && (
                                  <p className="text-xs text-gray-400 mt-2">You can select multiple files. Each pick adds to the list below.</p>
                                )}
                                {formData[field.id] && formData[field.id].length > 0 && (
                                  <ul className="mt-4 space-y-2">
                                    {(formData[field.id] as File[]).map((f, i) => (
                                      <li key={i} className="text-sm text-gray-600 flex items-center justify-between bg-white px-3 py-2 rounded-md border border-gray-200 shadow-sm">
                                        <span className="truncate">{f.name}</span>
                                        <button type="button" onClick={() => {
                                          const newFiles = (formData[field.id] as File[]).filter((_, idx) => idx !== i);
                                          onChange(field.id, newFiles.length > 0 ? newFiles : null);
                                        }} className="text-red-400 hover:text-red-600 font-bold p-1">&times;</button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>

                            {/* Required validation: at least one of custom form or file must be provided */}
                            {field.required && (!internalFormsData[field.id] || internalFormsData[field.id].length === 0) && (!formData[field.id] || formData[field.id].length === 0) && (
                              <input type="text" className="opacity-0 absolute w-0 h-0 -z-10" required />
                            )}
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 bg-gray-50 hover:bg-gray-100 transition-colors">
                            <Input
                              id={field.id}
                              type="file"
                              required={field.required && (!formData[field.id] || formData[field.id].length === 0)}
                              accept={field.accept}
                              multiple={(field.maxFiles ?? 1) > 1}
                              className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                              onChange={async (e) => {
                                const newFiles = Array.from(e.target.files ?? []);
                                if (newFiles.length === 0) return;
                                const existing = (formData[field.id] as File[]) || [];
                                const merged = [...existing, ...newFiles];
                                onChange(field.id, merged);
                                e.target.value = "";
                              }}
                            />
                            {(field.maxFiles ?? 1) > 1 && (
                              <p className="text-xs text-gray-400 mt-2">You can select multiple files. Each pick adds to the list below.</p>
                            )}
                            {formData[field.id] && formData[field.id].length > 0 && (
                              <ul className="mt-4 space-y-2">
                                {(formData[field.id] as File[]).map((f, i) => (
                                  <li key={i} className="text-sm text-gray-600 flex items-center justify-between bg-white px-3 py-2 rounded-md border border-gray-200">
                                    <span className="truncate">{f.name}</span>
                                    <button type="button" onClick={() => {
                                      const newFiles = (formData[field.id] as File[]).filter((_, idx) => idx !== i);
                                      onChange(field.id, newFiles.length > 0 ? newFiles : null);
                                    }} className="text-red-400 hover:text-red-600 font-bold">&times;</button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                  if (field.type === "derived_arithmetically") {
                    return (
                      <div className="relative max-w-md">
                        <Input
                          id={field.id}
                          type="number"
                          required={field.required}
                          value={formData[field.id] ?? ""}
                          readOnly
                          className="bg-purple-50 text-purple-700 font-semibold cursor-not-allowed border-purple-200 shadow-inner"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 text-xs font-mono">
                          CALCULATED
                        </span>
                      </div>
                    );
                  }
                  if (field.type === "conditional") {
                    return (
                      <div className="relative max-w-md">
                        <Input
                          id={field.id}
                          type="text"
                          required={field.required}
                          value={formData[field.id] ?? ""}
                          readOnly
                          className="bg-amber-50 text-amber-700 font-semibold cursor-not-allowed border-amber-200 shadow-inner"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 text-xs font-mono">
                          CONDITIONAL
                        </span>
                      </div>
                    );
                  }
                  if ((field as any).type === "to_words") {
                    return (
                      <div className="relative max-w-2xl">
                        <div className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2.5 text-sm text-teal-800 font-medium leading-relaxed min-h-[40px] pr-28">
                          {formData[field.id] || <span className="text-teal-400 italic">Waiting for a value in the source field…</span>}
                        </div>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-400 text-xs font-mono whitespace-nowrap">
                          IN WORDS
                        </span>
                      </div>
                    );
                  }
                  if ((field as any).type === "extended_service") {
                    return (
                      <div className="relative max-w-md flex items-center gap-2">
                        <div className="flex-1">
                          <SearchableSelect
                            id={field.id}
                            options={dynamicOptions[field.id] || []}
                            value={formData[field.id] ?? ""}
                            onChange={(val) => onChange(field.id, val)}
                            required={field.required}
                            disabled={isReadOnly}
                            placeholder="Search extended service logs..."
                          />
                        </div>
                        <div className="flex-shrink-0 min-w-[80px]">
                          {extendedStatus[field.id]?.loading ? (
                            <span className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-gray-100 rounded-md text-[10px] font-bold text-gray-500 uppercase tracking-widest h-10 w-full">
                              <Loader2 className="w-3 h-3 animate-spin" />
                            </span>
                          ) : extendedStatus[field.id]?.valid ? (
                            <span className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-green-100 rounded-md text-[10px] font-bold text-green-700 uppercase tracking-widest h-10 w-full" title={extendedStatus[field.id]?.label}>
                              <Check className="w-3 h-3" /> Valid
                            </span>
                          ) : formData[field.id]?.length > 2 ? (
                            <span className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-red-100 rounded-md text-[10px] font-bold text-red-600 uppercase tracking-widest h-10 w-full">
                              <X className="w-3 h-3" /> Invalid
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  }
                  if ((field as any).type === "event_selector") {
                    return (
                      <SearchableSelect
                        id={field.id}
                        options={dynamicOptions[field.id] || []}
                        value={formData[field.id] ?? ""}
                        onChange={(val) => onChange(field.id, val)}
                        required={field.required}
                        disabled={isReadOnly}
                      />
                    );
                  }
                  if (field.type === "select") {
                    return (
                      <select
                        id={field.id}
                        required={field.required}
                        value={formData[field.id] ?? ""}
                        onChange={(e) => onChange(field.id, e.target.value)}
                        disabled={isReadOnly}
                        className={`flex h-10 w-full max-w-md rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm ${isReadOnly ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white cursor-pointer"
                          }`}
                      >
                        <option value="">— Select an option —</option>
                        {(dynamicOptions[field.id] || []).map((opt: { label: string; value: string }) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    );
                  }
                  if (field.type === "searchable_select") {
                    return (
                      <SearchableSelect
                        id={field.id}
                        options={dynamicOptions[field.id] || []}
                        value={formData[field.id] ?? ""}
                        onChange={(val) => onChange(field.id, val)}
                        required={field.required}
                        disabled={isReadOnly}
                      />
                    );
                  }

                  return (
                    <Input
                      id={field.id}
                      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                      required={field.required}
                      maxLength={field.maxLength}
                      value={formData[field.id] ?? ""}
                      onChange={(e) => onChange(field.id, e.target.value)}
                      readOnly={isReadOnly}
                      className={`max-w-md ${isReadOnly ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                    />
                  );
                })()}
              </div>
            );
          }); // end fields.map
        })() /* end IIFE */}
        {sectionError && (
          <div className="mx-6 mb-0 mt-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {sectionError}
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-gray-50 border-t border-gray-100 p-6 flex justify-between">
        {sectionIdx > 0 ? (
          <Button type="button" variant="outline" className="cursor-pointer" onClick={() => { setSectionError(''); setSectionIdx(i => i - 1); }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        ) : <span />}
        <Button type="submit" size="lg" disabled={submitting} className="cursor-pointer">
          {submitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Please wait...</>
          ) : isLastSection ? (
            <>Next: Add Signatories <ChevronRight className="w-4 h-4 ml-1" /></>
          ) : (
            <>Next: {sections[sectionIdx + 1]?.title || 'Next Section'} <ChevronRight className="w-4 h-4 ml-1" /></>
          )}
        </Button>
      </CardFooter>
    </form>
  );
}

// ─── Step 2: Signatories ──────────────────────────────────────────────────────

function SignatoriesStep({
  signatories,
  signingType,
  onAdd,
  onRemove,
  onSigningTypeChange,
  onBack,
  onNext,
}: {
  signatories: SignatoryInput[];
  signingType: SigningType;
  onAdd: (user: UserResult) => void;
  onRemove: (email: string) => void;
  onSigningTypeChange: (type: SigningType) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Guard against hiding the current user who is always first
  const { currentUser } = arguments[0] as unknown as { currentUser: { userName: string, email: string } };

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchUsers(q);
      setResults(res as UserResult[]);
      setSearching(false);
    }, 350);
  }, []);

  // Bug fix: compare against the normalised email string stored in signatories
  const isAdded = (email: string | null) =>
    !!email && signatories.some((s) => s.email.toLowerCase() === email.toLowerCase());

  const handleAdd = (user: UserResult) => {
    onAdd(user);
    // Clear search after adding so user can search for the next person
    setQuery("");
    setResults([]);
  };

  return (
    <>
      <CardContent className="space-y-6 pt-8">

        {/* ── Signing Type ── */}
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-3">Signing Type</p>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {/* Sequential */}
            <button
              type="button"
              onClick={() => onSigningTypeChange("sequential")}
              className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all cursor-pointer
                ${signingType === "sequential"
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 bg-white hover:border-gray-300"
                }`}
            >
              <div className={`p-2 rounded-lg ${signingType === "sequential" ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}>
                <GitBranch className="w-4 h-4" />
              </div>
              <div>
                <p className={`text-sm font-semibold ${signingType === "sequential" ? "text-primary" : "text-gray-800"}`}>Sequential</p>
                <p className="text-xs text-gray-400 mt-0.5">Signs one after another in order</p>
              </div>
            </button>

            {/* Parallel */}
            <button
              type="button"
              onClick={() => onSigningTypeChange("parallel")}
              className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all cursor-pointer
                ${signingType === "parallel"
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 bg-white hover:border-gray-300"
                }`}
            >
              <div className={`p-2 rounded-lg ${signingType === "parallel" ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}>
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className={`text-sm font-semibold ${signingType === "parallel" ? "text-primary" : "text-gray-800"}`}>Parallel</p>
                <p className="text-xs text-gray-400 mt-0.5">All sign at the same time, no order</p>
              </div>
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-500 mb-4">
            {signingType === "sequential"
              ? "Signatories will be notified one after another. The first added must sign before the next is notified."
              : "All signatories will be notified simultaneously and can sign in any order."}
          </p>

          {/* Search Input */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <Input
              placeholder="Search by name or email…"
              className="pl-9"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Results */}
          {searching && (
            <p className="text-xs text-gray-400 mt-2 max-w-md">Searching…</p>
          )}
          {!searching && results.length > 0 && (
            <div className="max-w-md mt-1 border border-gray-200 rounded-xl shadow-lg bg-white divide-y divide-gray-50 max-h-56 overflow-y-auto">
              {results.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{u.user_name}</p>
                    <p className="text-xs text-gray-400">{u.finca_email}{u.branch ? ` · ${u.branch}` : ""}</p>
                  </div>
                  {isAdded(u.finca_email) ? (
                    <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Added
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAdd(u)}
                      className="cursor-pointer shrink-0"
                    >
                      <UserPlus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          {!searching && query.length >= 2 && results.length === 0 && (
            <p className="text-xs text-gray-400 mt-2 max-w-md">No users found for "{query}"</p>
          )}
        </div>

        {/* ── Added Signatories ── */}
        <div className="space-y-3 max-w-md">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm">
              {signingType === "sequential" ? "Signing Order" : "Signatories"} ({signatories.length})
            </h3>
          </div>
          {signatories.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
              No signatories added yet. Search above to add.
            </div>
          ) : (
            [...signatories]
              .sort((a, b) => a.position - b.position)
              .map((s) => (
                <div key={s.email} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                  <div className={`h-7 w-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0
                    ${signingType === "sequential" ? "bg-primary" : "bg-gray-400"}`}>
                    {signingType === "sequential" ? s.position : "—"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.userName}</p>
                    <p className="text-xs text-gray-400 truncate">{s.email}</p>
                  </div>
                  {s.position !== 1 && (
                    <button
                      type="button"
                      onClick={() => onRemove(s.email)}
                      className="text-gray-300 hover:text-red-500 cursor-pointer transition-colors shrink-0"
                      aria-label="Remove signatory"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
          )}
        </div>
      </CardContent>

      <CardFooter className="bg-gray-50 border-t border-gray-100 p-6 flex justify-between">
        <Button variant="outline" onClick={onBack} className="cursor-pointer">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button
          onClick={onNext}
          disabled={signatories.length === 0}
          size="lg"
          className="cursor-pointer"
        >
          Review & Submit <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </CardFooter>
    </>
  );
}

// ─── Step 3: Review ───────────────────────────────────────────────────────────

function ReviewStep({
  template,
  formData,
  signatories,
  signingType,
  onBack,
  onSubmit,
  submitting,
  prerequisiteInfo,
  draftId,
  token,
  dynamicOptions,
}: {
  template: any;
  formData: Record<string, any>;
  signatories: SignatoryInput[];
  signingType: SigningType;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  prerequisiteInfo?: any;
  draftId?: string;
  token?: string;
  dynamicOptions: Record<string, { label: string; value: string }[]>;
}) {
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);
  const router = useRouter();

  const handleDecline = async () => {
    if (!declineReason.trim() || !draftId || !token) return;
    setDeclining(true);
    try {
      const res = await fetch(`/api/v1/prerequisites/${draftId}/decline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ reason: declineReason })
      });
      if (res.ok) {
        if (typeof window !== "undefined") {
          localStorage.removeItem(`form_draft_${template.id}`);
        }
        router.push("/dashboard/forms");
      } else {
        alert("Failed to decline request.");
        setDeclining(false);
      }
    } catch (err) {
      alert("Failed to decline request.");
      setDeclining(false);
    }
  };
  const fields: Field[] = typeof template.fields === "string"
    ? JSON.parse(template.fields)
    : template.fields ?? [];

  return (
    <>
      <CardContent className="pt-8 space-y-8">
        {/* Form Responses */}
        <div>
          <h3 className="text-xs font-semibold text-primary uppercase tracking-widest border-b border-gray-200 pb-2 mb-4">
            Form Responses
          </h3>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left px-4 py-3 font-semibold w-1/2">Question</th>
                  <th className="text-left px-4 py-3 font-semibold w-1/2">Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fields
                  .filter((f: any) => f.type !== 'section_header' && f.type !== 'instructions')
                  .map((f, i) => (
                    <tr key={f.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-3 font-medium text-gray-700">{f.label}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {(() => {
                          const val = formData[f.id];
                          if (!val) return <span className="italic text-gray-300">—</span>;

                          if ((f as any).type === "file" || (f as any).type === "signable_document") {
                            return (
                              <div className="flex flex-col gap-1">
                                {(val as File[]).map((file, idx) => (
                                  <span key={idx} className="text-sm font-medium text-gray-800">{file.name}</span>
                                ))}
                              </div>
                            );
                          }

                          // If the field has dynamic options (like event_selector, select), resolve to label
                          if (dynamicOptions[f.id] && Array.isArray(dynamicOptions[f.id])) {
                            const matchedOpt = dynamicOptions[f.id].find(opt => String(opt.value) === String(val));
                            if (matchedOpt) return matchedOpt.label;
                          }

                          // Fallback to stringifying the value
                          return typeof val === "object" ? JSON.stringify(val) : String(val);
                        })()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signatories */}
        <div>
          <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-widest">Signatories</h3>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
              ${signingType === "sequential"
                ? "bg-blue-100 text-blue-700"
                : "bg-purple-100 text-purple-700"}`}>
              {signingType === "sequential" ? "Sequential" : "Parallel"}
            </span>
          </div>
          <div className="space-y-2">
            {[...signatories].sort((a, b) => a.position - b.position).map((s) => (
              <div key={s.email} className="flex items-center gap-3 text-sm">
                <div className={`h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0
                  ${signingType === "sequential" ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"}`}>
                  {signingType === "sequential" ? s.position : "·"}
                </div>
                <span className="font-medium text-gray-900">{s.userName}</span>
                <span className="text-gray-300">·</span>
                <span className="text-gray-500">{s.email}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-gray-50 border-t border-gray-100 p-6 flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={submitting || declining} className="cursor-pointer">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex gap-3">
          {prerequisiteInfo && (
            <Button type="button" variant="outline" onClick={() => setShowDeclineModal(true)} disabled={submitting || declining} className="cursor-pointer border-red-200 text-red-600 hover:bg-red-50">
              Decline Request
            </Button>
          )}
          <Button onClick={onSubmit} disabled={submitting || declining} size="lg" className="cursor-pointer">
            {submitting ? "Submitting…" : <><Send className="w-4 h-4 mr-2" /> Submit Form</>}
          </Button>
        </div>
      </CardFooter>

      {/* Decline Reason Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-2">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Decline Request</h3>
              <p className="text-sm text-gray-500">
                Please provide a reason for declining this prerequisite task.
              </p>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
                className="w-full text-sm rounded-md border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Reason for declining..."
                required
              />
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                <Button variant="ghost" onClick={() => setShowDeclineModal(false)} disabled={declining}>Cancel</Button>
                <Button
                  disabled={declineReason.length < 5 || declining}
                  onClick={handleDecline}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                >
                  {declining ? "Declining..." : "Decline"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function FormFillerClient({ 
  template, 
  currentUser, 
  draftId, 
  initialFormData, 
  prerequisiteInfo,
  prefilledData,
  requestToken
}: { 
  template: any, 
  currentUser: { userName: string; email: string; token?: string }, 
  draftId?: string, 
  initialFormData?: Record<string, any>,
  prerequisiteInfo?: any,
  prefilledData?: Record<string, any>,
  requestToken?: string | null
}) {
  const router = useRouter();

  // ── Form state persistence (localStorage) ──────────────────────────────────
  const STORAGE_KEY = `form_draft_${template.id}`;

  // Load saved state from localStorage on mount
  const loadSavedState = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }, [STORAGE_KEY]);

  const savedState = useRef(loadSavedState());

  const [step, setStep] = useState(() => savedState.current?.step || 1);
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    // initialFormData (from drafts) takes priority, then prefilledData (from request token), then saved state, then empty
    if (initialFormData && Object.keys(initialFormData).length > 0) return initialFormData;
    if (prefilledData && Object.keys(prefilledData).length > 0) return prefilledData;
    return savedState.current?.formData || {};
  });
  const [internalFormsData, setInternalFormsData] = useState<Record<string, any[]>>(() => savedState.current?.internalFormsData || {});
  const [activeInternalFormTarget, setActiveInternalFormTarget] = useState<{ fieldId: string, templateId: string, index?: number } | null>(null);

  const formFields: any[] = typeof template.fields === "string" 
    ? JSON.parse(template.fields) 
    : template.fields ?? [];
  const hasSignableDocument = formFields.some(f => f.type === "signable_document" || (f as any).type === "signable_document");

  const [signatories, setSignatories] = useState<SignatoryInput[]>(() =>
    savedState.current?.signatories || [{
      position: 1,
      userName: currentUser.userName,
      email: currentUser.email
    }]
  );
  const [signingType, setSigningType] = useState<SigningType>(() => savedState.current?.signingType || "sequential");
  const [submitting, setSubmitting] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [showPrefillModal, setShowPrefillModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [signatureToken, setSignatureToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  const [showTargetedRequestModal, setShowTargetedRequestModal] = useState(false);
  const [error, setError] = useState("");
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, { label: string, value: string }[]>>({});

  const fields: Field[] = typeof template.fields === "string"
    ? JSON.parse(template.fields)
    : template.fields ?? [];

  // Auto-save form state to localStorage on every change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // Filter out File objects from formData (they can't be serialized)
      const serializableFormData: Record<string, any> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (value instanceof File || value instanceof FileList) continue;
        if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) continue;
        serializableFormData[key] = value;
      }
      const state = {
        formData: serializableFormData,
        internalFormsData,
        signatories,
        signingType,
        step,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage full or unavailable — silently ignore
    }
  }, [formData, internalFormsData, signatories, signingType, step, STORAGE_KEY]);

  // Clear saved state
  const clearSavedState = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [STORAGE_KEY]);

  // Auto-resolve prerequisite default assignees
  useEffect(() => {
    if (typeof window === "undefined" || !currentUser.token) return;

    const resolveDefaults = async () => {
      let changed = false;
      const newFormData = { ...formData };

      for (const field of fields) {
        const f = field as any;
        if (f.isPrerequisite && f.defaultPrereqBranch && f.defaultPrereqRole && !newFormData[f.id]) {
          try {
            const branch = f.defaultPrereqBranch;
            const role = f.defaultPrereqRole;
            const res = await fetch(`/api/v1/workflow/resolve-assignee?branch=${encodeURIComponent(branch)}&role=${encodeURIComponent(role)}`, {
              headers: { Authorization: `Bearer ${currentUser.token}` }
            });
            const data = await res.json();
            
            if (data.success && data.data && data.data.length === 1) {
              newFormData[f.id] = data.data[0].finca_email;
              changed = true;
            }
          } catch (err) {
            console.error("Failed to auto-resolve assignee for", f.id, err);
          }
        }
      }

      if (changed) {
        setFormData(newFormData);
      }
    };

    resolveDefaults();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.length, currentUser.token]);

  const handleFieldChange = (id: string, value: any) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // ── Prefill handler: map source submission responses onto current template fields ──
  const handlePrefill = (sourceResponses: Record<string, any>) => {
    const newFormData: Record<string, any> = {};
    fields.forEach(field => {
      if ((field as any).type === 'section_header' || (field as any).type === 'instructions') return;
      if (field.type === 'file') return;
      const sourceValue = sourceResponses[field.label];
      if (sourceValue === undefined || sourceValue === null || sourceValue === '') return;
      // Skip attachment objects (file references from previous submissions)
      if (typeof sourceValue === 'object' && !Array.isArray(sourceValue)) return;
      if (Array.isArray(sourceValue) && sourceValue.some((v: any) => v?.isAttachment)) return;
      newFormData[field.id] = sourceValue;
    });
    setFormData(prev => ({ ...prev, ...newFormData }));
    setShowPrefillModal(false);
  };

  const handleAddSignatory = (user: UserResult) => {
    // Guard: don't add duplicates (case-insensitive email check)
    const email = user.finca_email ?? "";
    if (signatories.some((s) => s.email.toLowerCase() === email.toLowerCase())) return;

    setSignatories((prev) => [
      ...prev,
      {
        position: prev.length + 1,
        userName: user.user_name ?? "",
        email,
      },
    ]);
  };

  // Remove by email (stable key) and re-number positions
  const handleRemoveSignatory = (email: string) => {
    setSignatories((prev) =>
      prev
        .filter((s) => s.email !== email)
        .map((s, i) => ({ ...s, position: i + 1 }))
    );
  };

  const handleStep1Next = async () => {
    // ── Check for automated signatories from template config ──────────────────
    const autoSigs = typeof template.automatedSignatories === "string" ? JSON.parse(template.automatedSignatories) : template.automatedSignatories;
    if (!autoSigs || !Array.isArray(autoSigs) || autoSigs.length === 0) {
      setStep(2);
      return;
    }

    setSubmitting(true);
    try {
      const resolvedSigs: SignatoryInput[] = [
        { position: 1, userName: currentUser.userName, email: currentUser.email }
      ];
      let hasError = false;

      for (const sig of autoSigs) {
        const res = await fetch(`/api/v1/workflow/resolve-assignee?branch=${encodeURIComponent(sig.branch)}&role=${encodeURIComponent(sig.role)}`, {
          headers: { Authorization: `Bearer ${currentUser.token}` }
        });
        const data = await res.json();
        
        if (data.success && data.data && data.data.length > 0) {
          const user = data.data[0];
          resolvedSigs.push({
            position: resolvedSigs.length + 1,
            userName: user.user_name ?? "",
            email: user.finca_email ?? "",
          });
        } else {
          hasError = true;
          break;
        }
      }

      setSubmitting(false);

      if (!hasError && resolvedSigs.length === autoSigs.length + 1) {
        setSignatories(resolvedSigs);
        if (template.automatedSigningType) {
          setSigningType(template.automatedSigningType as SigningType);
        }
        setStep(3); // Skip step 2
      } else {
        setStep(2);
      }
    } catch (err) {
      console.error("Failed to resolve automated signatories", err);
      setSubmitting(false);
      setStep(2);
    }
  };

  const submitToBackend = async (base64Signature: string) => {
    setIsSignatureModalOpen(false);
    setSubmitting(true);
    setError("");
    const textOnlyResponses: Record<string, any> = {};
    const fileFields: Record<string, File[]> = {};

    fields.forEach((f) => {
      if ((f as any).type === 'section_header' || (f as any).type === 'instructions') return;
      if (f.type === "file" || (f as any).type === "signable_document") {
        if (formData[f.id]) {
          fileFields[f.label] = formData[f.id] as File[];
        }
        if (internalFormsData[f.id]) {
          textOnlyResponses[f.label] = internalFormsData[f.id];
        }
      } else {
        textOnlyResponses[f.label] = formData[f.id] ?? "";
      }
    });

    const formDataPayload = new FormData();
    formDataPayload.append("data", JSON.stringify({
      templateId: template.id,
      formName: template.name,
      formResponses: textOnlyResponses,
      signatories,
      signingType,
      initiatorSignature: base64Signature || undefined,
      initiatorToken: signatureToken || undefined,
      draftId,
      requestToken: requestToken || undefined,
    }));

    for (const [fieldName, files] of Object.entries(fileFields)) {
      for (const file of files) {
        formDataPayload.append(fieldName, file);
      }
    }

    try {
      const response = await fetch("/api/v1/submissions", {
        method: "POST",
        body: formDataPayload,
      });

      let res: any;
      if (response.ok) {
        res = await response.json().catch(() => ({}));
        if (res.success === undefined) res.success = true;
      } else {
        const errData = await response.json().catch(() => ({}));
        res = { success: false, error: errData.error || `Submission failed: ${response.statusText}` };
      }

      setSubmitting(false);
      setShowTokenModal(false);

      if (res?.success) {
        clearSavedState();
        router.refresh();
        router.push("/dashboard/forms");
      } else {
        setError(res?.error ?? "Something went wrong. Please try again.");
      }
    } catch (e: any) {
      setSubmitting(false);
      setShowTokenModal(false);
      setError(e?.message ?? "Submission failed. Please check your token and try again.");
    }
  };

  const handleReviewSubmit = () => {
    if (hasSignableDocument) {
      setIsSignatureModalOpen(true);
    } else {
      setShowTokenModal(true);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/forms" onClick={clearSavedState} className="inline-flex items-center text-sm text-gray-500 hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to forms
        </Link>
        {step === 1 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="cursor-pointer border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => setShowTargetedRequestModal(true)}>
              <Send className="w-4 h-4 mr-1" /> Request Form Fill
            </Button>
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setShowPrefillModal(true)}>
              <Layers className="w-4 h-4 mr-1" /> Prefill from previous
            </Button>
          </div>
        )}
      </div>

      <StepIndicator currentStep={step} />

      <Card className="border-t-4 border-t-primary shadow-lg">
        <CardHeader className="bg-gray-50 border-b border-gray-100">
          <CardTitle className="text-2xl text-primary font-bold">{template.name}</CardTitle>
          {template.description && <CardDescription>{template.description}</CardDescription>}
        </CardHeader>

        {error && (
          <div className="mx-6 mt-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {step === 1 && (
          <FormFieldsStep
            template={template}
            formData={formData}
            internalFormsData={internalFormsData}
            onChange={handleFieldChange}
            onNext={handleStep1Next}
            onFillInternalForm={(fieldId, templateId, index) => setActiveInternalFormTarget({ fieldId, templateId, index })}
            onRemoveInternalForm={(fieldId, index) => setInternalFormsData(prev => {
              const arr = prev[fieldId] ? [...prev[fieldId]] : [];
              arr.splice(index, 1);
              return { ...prev, [fieldId]: arr };
            })}
            token={currentUser.token}
            currentUser={currentUser}
            submitting={submitting}
            dynamicOptions={dynamicOptions}
            setDynamicOptions={setDynamicOptions}
          />
        )}

        {step === 2 && (
          <SignatoriesStep
            signatories={signatories}
            signingType={signingType}
            onAdd={handleAddSignatory}
            onRemove={handleRemoveSignatory}
            onSigningTypeChange={setSigningType}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <ReviewStep
            template={template}
            formData={formData}
            signatories={signatories}
            signingType={signingType}
            onBack={() => setStep(2)}
            onSubmit={handleReviewSubmit}
            submitting={submitting}
            prerequisiteInfo={prerequisiteInfo}
            draftId={draftId}
            token={currentUser.token}
            dynamicOptions={dynamicOptions}
          />
        )}
      </Card>

      {/* Signature Modal for Signable Documents */}
      {hasSignableDocument && (
        <SignatureSelectionModal
          isOpen={isSignatureModalOpen}
          onClose={() => setIsSignatureModalOpen(false)}
          onSuccess={submitToBackend}
          token={currentUser.token}
          allowToken={true}
        />
      )}

      {/* Token Verification Modal for Standard Forms */}
      {showTokenModal && !hasSignableDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-2">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Sign & Submit</h3>
              <p className="text-sm text-gray-500">
                You are listed as the first signatory. Enter your secure token to securely apply your signature to this submission.
              </p>
              <div className="relative">
                <Input
                  type={showToken ? "text" : "password"}
                  placeholder="Token (e.g. 1a2b3c4d)"
                  value={signatureToken}
                  onChange={(e) => setSignatureToken(e.target.value)}
                  minLength={8}
                  maxLength={32}
                  className="text-center tracking-widest font-mono text-lg py-6 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                <Button variant="ghost" onClick={() => setShowTokenModal(false)}>Cancel</Button>
                <Button
                  disabled={signatureToken.length < 8 || submitting}
                  onClick={() => submitToBackend("")}
                  className="w-full sm:w-auto"
                >
                  {submitting ? "Signing..." : "Verify & Submit"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Targeted Request Modal */}
      {showTargetedRequestModal && (
        <TargetedRequestModal
          templateId={template.id}
          templateName={template.name}
          token={currentUser.token}
          formData={formData}
          onClose={() => setShowTargetedRequestModal(false)}
        />
      )}

      {/* Prefill Modal */}
      {showPrefillModal && (
        <PrefillModal
          templateId={template.id}
          token={currentUser.token}
          onClose={() => setShowPrefillModal(false)}
          onPrefill={handlePrefill}
        />
      )}

      {/* Internal Form Modal */}
      {activeInternalFormTarget && (
        <InternalFormModal
          templateId={activeInternalFormTarget.templateId}
          initialData={
            activeInternalFormTarget.index !== undefined
              ? internalFormsData[activeInternalFormTarget.fieldId]?.[activeInternalFormTarget.index]?.data
              : undefined
          }
          parentFormData={formData}
          parentTemplate={template}
          onClose={() => setActiveInternalFormTarget(null)}
          onSave={(data, tmpl, rawData) => {
            setInternalFormsData(prev => {
              const existingArray = prev[activeInternalFormTarget.fieldId] || [];
              const newItem = {
                type: "internal_form",
                templateId: tmpl.id,
                templateName: tmpl.name,
                data,
                rawData
              };

              const newArray = [...existingArray];
              if (activeInternalFormTarget.index !== undefined) {
                newArray[activeInternalFormTarget.index] = newItem;
              } else {
                newArray.push(newItem);
              }

              return {
                ...prev,
                [activeInternalFormTarget.fieldId]: newArray
              };
            });
            setActiveInternalFormTarget(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Prefill Modal ────────────────────────────────────────────────────────────

function PrefillModal({
  templateId,
  token,
  onClose,
  onPrefill,
}: {
  templateId: string;
  token?: string;
  onClose: () => void;
  onPrefill: (sourceResponses: Record<string, any>) => void;
}) {
  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [prefilling, setPrefilling] = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/api/v1/submissions/prefill-candidates/${templateId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setCandidates(Array.isArray(data.data) ? data.data : []);
        setLoading(false);
      })
      .catch(() => {
        setCandidates([]);
        setLoading(false);
      });
  }, [templateId, token, BASE_URL]);

  const options = candidates.map(c => ({
    label: c.reference || c.id.slice(0, 8),
    value: c.id,
  }));

  const handleConfirm = async () => {
    if (!selectedId) return;
    setPrefilling(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/submissions/${selectedId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data?.formResponses) {
        onPrefill(data.data.formResponses);
        onClose();
      }
    } catch {
      // silently fail — user can try again
    } finally {
      setPrefilling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Prefill from Previous</h3>
              <p className="text-xs text-gray-500 mt-0.5">Select a past submission to auto-fill this form.</p>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-8">
              <Layers className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No previous submissions found for this form.</p>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Select Submission</label>
              <SearchableSelect
                id="prefill-select"
                options={options}
                value={selectedId}
                onChange={setSelectedId}
                placeholder="Search by reference..."
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              disabled={!selectedId || prefilling}
              onClick={handleConfirm}
              className="cursor-pointer"
            >
              {prefilling ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Loading...</>
              ) : (
                <><Layers className="w-4 h-4 mr-1" /> Prefill</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Targeted Request Modal ───────────────────────────────────────────────────

function TargetedRequestModal({
  templateId,
  templateName,
  token,
  formData,
  onClose
}: {
  templateId: string;
  templateName: string;
  token?: string;
  formData: Record<string, any>;
  onClose: () => void;
}) {
  const [emailsText, setEmailsText] = useState("");
  const [customMessage, setCustomMessage] = useState(`Hello,\n\nPlease kindly fill out the attached form "${templateName}" at your earliest convenience.\n\nThank you.`);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{type: "error"|"success", msg: string} | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";

  const handleNextStep = async () => {
    let targetEmails: string[] = [];
    
    if (file) {
      const text = await file.text();
      const rows = text.split("\n");
      rows.forEach(r => {
        const cells = r.split(",");
        cells.forEach(c => {
          const email = c.trim();
          if (email.includes("@")) targetEmails.push(email);
        });
      });
    }

    if (emailsText.trim()) {
      const parts = emailsText.split(/[\s,;]+/);
      parts.forEach(p => {
        const email = p.trim();
        if (email.includes("@") && !targetEmails.includes(email)) {
          targetEmails.push(email);
        }
      });
    }

    if (targetEmails.length === 0) {
      setAlertMsg({ type: "error", msg: "Please enter at least one valid email address." });
      return;
    }
    
    setAlertMsg(null);
    setParsedEmails(targetEmails);
    setStep(2);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {

      const res = await fetch(`${BASE_URL}/api/v1/form-requests`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          templateId,
          emails: parsedEmails,
          message: customMessage,
          prefilledData: formData
        })
      });

      const data = await res.json();
      if (data.success) {
        setAlertMsg({ type: "success", msg: `Successfully requested form fill from ${parsedEmails.length} recipients!` });
        setTimeout(() => onClose(), 2000);
      } else {
        setAlertMsg({ type: "error", msg: data.error || "Failed to create request." });
      }
    } catch (e) {
      setAlertMsg({ type: "error", msg: "Error processing request." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Request Form Fill</h3>
              <p className="text-xs text-gray-500 mt-0.5">Send a targeted request to users to fill this form.</p>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {alertMsg && (
              <div className={`p-3 rounded-md text-sm border ${alertMsg.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                {alertMsg.msg}
              </div>
            )}
            
            {step === 2 && (
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Notification Message (Optional)</Label>
                <textarea
                  className="w-full text-sm p-3 border rounded-md min-h-[140px] outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Hi, please fill out this form by Friday."
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                />
                <p className="text-[10px] text-gray-400 font-medium">Sending to {parsedEmails.length} recipient{parsedEmails.length !== 1 && 's'}.</p>
              </div>
            )}

            {step === 1 && (
              <>
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">Enter Email Addresses</Label>
                  <textarea
                    className="w-full text-sm p-3 border rounded-md min-h-[80px] outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="john@example.com, jane@example.com"
                    value={emailsText}
                    onChange={e => setEmailsText(e.target.value)}
                  />
                  <p className="text-[10px] text-gray-400">Separate emails by comma, semicolon, or new line.</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs font-semibold text-gray-400">OR</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-semibold">Upload CSV File</Label>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        setFile(e.target.files[0]);
                      }
                    }}
                  />
                  <p className="text-[10px] text-gray-400">Upload a CSV file containing email addresses.</p>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            {step === 1 ? (
              <>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button onClick={handleNextStep}>
                  Next Step <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setStep(1)} disabled={submitting}>Back</Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Send Requests
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InternalFormModal({
  templateId,
  onClose,
  onSave,
  initialData,
  parentFormData,
  parentTemplate
}: {
  templateId: string;
  onClose: () => void;
  onSave: (data: Record<string, any>, template: any, rawData: Record<string, any>) => void;
  initialData?: Record<string, any>;
  parentFormData?: Record<string, any>;
  parentTemplate?: any;
}) {
  const [template, setTemplate] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>(initialData || {});

  useEffect(() => {
    fetch(`/api/v1/forms/${templateId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) setTemplate(data.data);
      });
  }, [templateId]);

  // Inject parent data for cross-referenced fields
  useEffect(() => {
    if (template && parentTemplate && parentFormData) {
      const fields: any[] = typeof template.fields === "string" ? JSON.parse(template.fields) : template.fields ?? [];
      const parentFields: any[] = typeof parentTemplate.fields === "string" ? JSON.parse(parentTemplate.fields) : parentTemplate.fields ?? [];

      let newFormData = { ...formData };
      let changed = false;

      fields.forEach(field => {
        if (!field.description) return;
        const match = field.description.match(/View parent "([^"]+)"/i);
        if (match && match[1]) {
          const parentLabel = match[1];
          const parentField = parentFields.find((f: any) => f.label === parentLabel);
          if (parentField && parentFormData[parentField.id] !== undefined) {
            newFormData[field.id] = parentFormData[parentField.id];
            changed = true;
          }
        }
      });

      if (changed) {
        setFormData(newFormData);
      }
    }
  }, [template, parentTemplate, parentFormData]);

  if (!template) {
    return (
      <div className="fixed inset-0 z-[60] flex justify-center items-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white p-6 rounded-lg shadow-xl"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>
      </div>
    );
  }

  const fields: any[] = typeof template.fields === "string" ? JSON.parse(template.fields) : template.fields ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const labeledData: Record<string, any> = {};
    fields.forEach(f => {
      if (f.type !== "section_header" && f.type !== "instructions") {
        labeledData[f.label] = formData[f.id] ?? "";
      }
    });
    onSave(labeledData, template, formData);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white z-10 p-4 border-b flex justify-between items-center rounded-t-xl shrink-0">
          <h3 className="font-bold text-lg text-gray-900">{template.name}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {fields.filter(f => f.type !== "section_header" && f.type !== "instructions").map((field, idx) => {
                const isParentRef = field.description ? /View parent "([^"]+)"/i.test(field.description) : false;

                return (
                  <div key={field.id} className="space-y-1.5">
                    <Label className="font-semibold text-sm flex gap-2">
                      <span className="text-primary">{idx + 1}.</span>
                      {field.label}
                      {field.required && <span className="text-red-500">*</span>}
                      {isParentRef && <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-blue-100 text-blue-700 uppercase">Auto-filled</span>}
                    </Label>
                    {field.description && <p className="text-xs text-gray-400">{field.description}</p>}

                    {field.type === "textarea" ? (
                      <textarea
                        required={field.required}
                        rows={4}
                        value={formData[field.id] ?? ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                        readOnly={isParentRef}
                        className={`w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${isParentRef ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                      />
                    ) : field.type === "file" || field.type === "derived_arithmetically" || field.type === "conditional" || field.type === "to_words" ? (
                      <p className="text-xs text-gray-400 italic">This field type is not fully supported in nested internal forms.</p>
                    ) : field.type === "select" || field.type === "searchable_select" ? (
                      <select
                        required={field.required}
                        value={formData[field.id] ?? ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                        disabled={isParentRef}
                        className={`flex w-full max-w-md rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all shadow-sm ${isParentRef ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                      >
                        <option value="">Select option...</option>
                        {(field.optionsArray || "").split(",").map((s: string) => s.trim()).filter(Boolean).map((s: string) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                        required={field.required}
                        maxLength={field.maxLength}
                        value={formData[field.id] ?? ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                        readOnly={isParentRef}
                        className={`max-w-md ${isParentRef ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit">
                Save Form Attachment
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
