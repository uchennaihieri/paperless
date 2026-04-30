"use client";

import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import {
  X, Search, Check, UserPlus, ArrowLeft, ChevronRight,
  GitBranch, Layers, Send, Loader2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  editSubmission, searchUsers, getFormTemplate,
  type SignatoryInput, type SigningType,
} from "@/app/actions/form";
import { numberToWords } from "@/lib/toWords";

// ─── Types ────────────────────────────────────────────────────────────────────

type Field = {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "textarea" | "file" | "section_header" | "instructions" | "conditional";
  required: boolean;
  description?: string;
  maxLength?: number;
};

type UserResult = {
  id: number;
  user_name: string | null;
  finca_email: string | null;
  branch: string | null;
  user_role: string | null;
};

// ─── Step dots ────────────────────────────────────────────────────────────────

function StepDots({ step }: { step: number }) {
  const labels = ["Edit Fields", "Signatories", "Review"];
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {labels.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center border-2 transition-all
                ${step === i + 1 ? "border-primary bg-primary text-white"
                  : step > i + 1 ? "border-primary bg-primary/10 text-primary"
                  : "border-gray-200 text-gray-400"}`}
            >
              {step > i + 1 ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-xs mt-1 font-medium whitespace-nowrap ${step === i + 1 ? "text-primary" : "text-gray-400"}`}>
              {label}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div className={`w-12 h-0.5 mb-4 mx-1 ${step > i + 1 ? "bg-primary" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Signatories editor ───────────────────────────────────────────────────────

function SignatoriesEditor({
  signatories, signingType, onAdd, onRemove, onSigningTypeChange, onBack, onNext,
}: {
  signatories: SignatoryInput[];
  signingType: SigningType;
  onAdd: (u: UserResult) => void;
  onRemove: (email: string) => void;
  onSigningTypeChange: (t: SigningType) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const isAdded = (email: string | null) =>
    !!email && signatories.some((s) => s.email.toLowerCase() === email.toLowerCase());

  return (
    <div className="space-y-5">
      {/* Signing type */}
      <div>
        <p className="text-sm font-semibold text-gray-800 mb-3">Signing Type</p>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          {(["sequential", "parallel"] as SigningType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onSigningTypeChange(type)}
              className={`flex flex-col items-start gap-2 p-3 rounded-xl border-2 text-left transition-all cursor-pointer
                ${signingType === type ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}
            >
              <div className={`p-1.5 rounded-lg ${signingType === type ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}>
                {type === "sequential" ? <GitBranch className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
              </div>
              <p className={`text-sm font-semibold ${signingType === type ? "text-primary" : "text-gray-800"}`}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div>
        <p className="text-sm font-semibold text-gray-800 mb-2">Add / Change Signatories</p>
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
        {searching && <p className="text-xs text-gray-400 mt-1">Searching…</p>}
        {!searching && results.length > 0 && (
          <div className="max-w-md mt-1 border border-gray-200 rounded-xl shadow-lg bg-white divide-y divide-gray-50 max-h-44 overflow-y-auto">
            {results.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.user_name}</p>
                  <p className="text-xs text-gray-400">{u.finca_email}</p>
                </div>
                {isAdded(u.finca_email) ? (
                  <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Added
                  </span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => { onAdd(u); setQuery(""); setResults([]); }}>
                    <UserPlus className="w-3 h-3 mr-1" /> Add
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current list */}
      <div className="space-y-2 max-w-md">
        <p className="text-sm font-semibold text-gray-800">
          Current Signatories ({signatories.length})
        </p>
        {signatories.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
            No signatories. Add at least one.
          </div>
        ) : (
          [...signatories].sort((a, b) => a.position - b.position).map((s) => (
            <div key={s.email} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
              <div className="h-6 w-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                {s.position}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{s.userName}</p>
                <p className="text-xs text-gray-400 truncate">{s.email}</p>
              </div>
              {s.position !== 1 && (
                <button
                  type="button"
                  onClick={() => onRemove(s.email)}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex justify-between pt-4 border-t border-gray-100">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button onClick={onNext} disabled={signatories.length === 0} id="edit-next-review-btn">
          Review & Resubmit <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main modal ────────────────────────────────────────────────────────────────

export default function EditSubmissionModal({
  submission,
  onClose,
  onSaved,
}: {
  submission: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState<any>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [templateError, setTemplateError] = useState("");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [signatories, setSignatories] = useState<SignatoryInput[]>(
    (submission.signatories ?? []).map((s: any) => ({
      position: s.position,
      userName: s.userName,
      email: s.email,
    }))
  );
  const [internalFormsData, setInternalFormsData] = useState<Record<string, any>>({});
  const [activeInternalFormTarget, setActiveInternalFormTarget] = useState<{ fieldId: string, templateId: string } | null>(null);
  const [signingType, setSigningType] = useState<SigningType>(
    (submission.signingType as SigningType) ?? "sequential"
  );
  const [isPending, startSave] = useTransition();
  const [error, setError] = useState("");

  // Fetch template and pre-populate formData
  useEffect(() => {
    (async () => {
      const t = await getFormTemplate(submission.templateId);
      if (!t) {
        setTemplateError("Could not load form template.");
        setLoadingTemplate(false);
        return;
      }
      setTemplate(t);
      const fields: Field[] = typeof t.fields === "string" ? JSON.parse(t.fields) : t.fields ?? [];
      const mapped: Record<string, any> = {};
      // formResponses is stored with field.label as key
      fields.forEach((f) => {
        mapped[f.id] = submission.formResponses?.[f.label] ?? "";
      });
      setFormData(mapped);
      setLoadingTemplate(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fields: Field[] = template
    ? (typeof template.fields === "string" ? JSON.parse(template.fields) : template.fields ?? [])
    : [];

  const handleFieldChange = (id: string, value: any) =>
    setFormData((p) => ({ ...p, [id]: value }));

  // Auto-calculation
  useEffect(() => {
    fields.forEach(field => {
      if ((field as any).type === 'section_header' || (field as any).type === 'instructions') return;

      if ((field as any).type === "derived_arithmetically" && (field as any).derivedFirstField && (field as any).derivedSecondField) {
        const val1 = Number(formData[(field as any).derivedFirstField] || 0);
        const val2 = Number(formData[(field as any).derivedSecondField] || 0);
        let result = 0;
        switch ((field as any).derivedOperator) {
           case "+": result = val1 + val2; break;
           case "-": result = val1 - val2; break;
           case "*": result = val1 * val2; break;
           case "/": result = val2 !== 0 ? val1 / val2 : 0; break;
        }
        if (formData[field.id] !== result) handleFieldChange(field.id, result);
      }

      if ((field as any).type === 'to_words' && (field as any).sourceFieldId) {
        const srcVal = formData[(field as any).sourceFieldId];
        let valToConvert = srcVal;
        if (srcVal !== undefined && srcVal !== null && srcVal !== "") {
          const num = Number(srcVal);
          if (!isNaN(num)) valToConvert = Math.abs(num);
        }
        const words = numberToWords(valToConvert ?? '');
        if (formData[field.id] !== words) handleFieldChange(field.id, words);
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
          return isNaN(Number(val)) ? val : Number(val);
        };

        const result = isTrue 
          ? resolveResult((field as any).trueResultType || "fixed", (field as any).trueResultValue)
          : resolveResult((field as any).falseResultType || "fixed", (field as any).falseResultValue);

        if (formData[field.id] !== result) handleFieldChange(field.id, result);
      }
    });
  }, [formData, fields]);

  const handleAddSignatory = (user: UserResult) => {
    const email = user.finca_email ?? "";
    if (signatories.some((s) => s.email.toLowerCase() === email.toLowerCase())) return;
    setSignatories((prev) => [
      ...prev,
      { position: prev.length + 1, userName: user.user_name ?? "", email },
    ]);
  };

  const handleRemoveSignatory = (email: string) =>
    setSignatories((prev) =>
      prev.filter((s) => s.email !== email).map((s, i) => ({ ...s, position: i + 1 }))
    );

  const handleResubmit = () => {
    setError("");
    const labeledData: Record<string, any> = {};
    fields
      .filter((f) => f.type !== "section_header" && f.type !== "instructions")
      .forEach((f) => { 
        if (f.type === "file" && internalFormsData[f.id]) {
          labeledData[f.label] = internalFormsData[f.id];
        } else if (f.type !== "file") {
          labeledData[f.label] = formData[f.id] ?? ""; 
        }
      });

    startSave(async () => {
      const res = await editSubmission(submission.id, {
        formResponses: labeledData,
        signatories,
        signingType,
      });
      if (res.success) {
        onSaved();
      } else {
        setError(res.error || "Failed to resubmit.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mb-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit &amp; Resubmit</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {submission.reference ? `Ref: ${submission.reference} · ` : ""}{submission.formName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {loadingTemplate ? (
            <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin" /> Loading form fields…
            </div>
          ) : templateError ? (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {templateError}
            </div>
          ) : (
            <>
              <StepDots step={step} />

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm mb-5">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              {/* Step 1 — Form fields */}
              {step === 1 && (
                <form
                  onSubmit={(e) => { e.preventDefault(); setStep(2); }}
                  className="space-y-6"
                >
                  {fields
                    .filter((f) => f.type !== "section_header" && f.type !== "instructions")
                    .map((field, idx) => (
                    <div key={field.id} className="space-y-1.5">
                      <Label htmlFor={`edit-${field.id}`} className="font-semibold text-sm flex gap-2">
                        <span className="text-primary">{idx + 1}.</span>
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      {field.description && (
                        <p className="text-xs text-gray-400">{field.description}</p>
                      )}
                      {field.type === "textarea" ? (
                        <textarea
                          id={`edit-${field.id}`}
                          required={field.required}
                          rows={4}
                          value={formData[field.id] ?? ""}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      ) : field.type === "file" ? (
                        <div className="space-y-3">
                          {(field as any).linkedInternalFormId && (
                            <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 p-4 rounded-lg">
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold text-orange-900">Custom Form Attachment</h4>
                                <p className="text-xs text-orange-700">You can fill out the required internal form. Note: Any previously generated PDF will be replaced.</p>
                              </div>
                              <Button 
                                type="button" 
                                variant={internalFormsData[field.id] ? "default" : "outline"}
                                className={`shrink-0 ${internalFormsData[field.id] ? "bg-orange-600 hover:bg-orange-700 text-white border-none" : "border-orange-300 text-orange-700 hover:bg-orange-100"}`}
                                onClick={() => setActiveInternalFormTarget({ fieldId: field.id, templateId: (field as any).linkedInternalFormId })}
                              >
                                {internalFormsData[field.id] ? "Edit Filled Form" : "Re-fill Custom Form"}
                              </Button>
                            </div>
                          )}
                          <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                            ℹ️ Standard file attachments cannot be changed here — existing references are preserved.
                          </p>
                        </div>
                      ) : field.type === "conditional" ? (
                        <div className="relative max-w-md">
                          <Input
                            id={`edit-${field.id}`}
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
                      ) : field.type === "derived_arithmetically" ? (
                        <div className="relative max-w-md">
                          <Input
                            id={`edit-${field.id}`}
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
                      ) : (field as any).type === "to_words" ? (
                        <div className="relative max-w-md">
                          <div className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2.5 text-sm text-teal-800 font-medium leading-relaxed min-h-[40px] pr-28">
                            {formData[field.id] || <span className="text-teal-400 italic">Waiting...</span>}
                          </div>
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-400 text-xs font-mono whitespace-nowrap">
                            IN WORDS
                          </span>
                        </div>
                      ) : (
                        <Input
                          id={`edit-${field.id}`}
                          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                          required={field.required}
                          maxLength={field.maxLength}
                          value={formData[field.id] ?? ""}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          className="max-w-md"
                        />
                      )}
                    </div>
                  ))}
                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <Button type="submit" id="edit-next-signatories-btn">
                      Next: Signatories <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </form>
              )}

              {/* Step 2 — Signatories */}
              {step === 2 && (
                <SignatoriesEditor
                  signatories={signatories}
                  signingType={signingType}
                  onAdd={handleAddSignatory}
                  onRemove={handleRemoveSignatory}
                  onSigningTypeChange={setSigningType}
                  onBack={() => setStep(1)}
                  onNext={() => setStep(3)}
                />
              )}

              {/* Step 3 — Review */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold text-primary uppercase tracking-widest border-b border-gray-200 pb-2 mb-3">
                      Form Responses
                    </h3>
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-900 text-white">
                            <th className="text-left px-4 py-2.5 font-semibold text-xs w-1/2">Question</th>
                            <th className="text-left px-4 py-2.5 font-semibold text-xs w-1/2">Answer</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {fields
                            .filter((f) => f.type !== "section_header" && f.type !== "instructions")
                            .map((f, i) => (
                            <tr key={f.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-4 py-2.5 font-medium text-gray-700">{f.label}</td>
                              <td className="px-4 py-2.5 text-gray-600">
                                {Array.isArray(formData[f.id]) ? (
                                  <div className="flex flex-col gap-1">
                                    {(formData[f.id] as any[]).map((file, idx) => (
                                      <span key={idx} className="text-primary text-xs font-medium">
                                        📎 {file.name || "Attachment"}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  formData[f.id] || <span className="italic text-gray-300">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-3">
                      <h3 className="text-xs font-semibold text-primary uppercase tracking-widest">Signatories</h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        signingType === "sequential" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      }`}>
                        {signingType === "sequential" ? "Sequential" : "Parallel"}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {[...signatories].sort((a, b) => a.position - b.position).map((s) => (
                        <div key={s.email} className="flex items-center gap-3 text-sm">
                          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                            {s.position}
                          </div>
                          <span className="font-medium text-gray-900">{s.userName}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-gray-500">{s.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-gray-100">
                    <Button variant="outline" onClick={() => setStep(2)} disabled={isPending}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button id="confirm-resubmit-btn" onClick={handleResubmit} disabled={isPending}>
                      {isPending
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resubmitting…</>
                        : <><Send className="w-4 h-4 mr-2" />Save &amp; Resubmit</>
                      }
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Internal Form Modal */}
      {activeInternalFormTarget && (
        <InternalFormModal
          templateId={activeInternalFormTarget.templateId}
          initialData={internalFormsData[activeInternalFormTarget.fieldId]?.data}
          parentFormData={formData}
          parentTemplate={template}
          onClose={() => setActiveInternalFormTarget(null)}
          onSave={(data, tmpl) => {
            setInternalFormsData(prev => ({
              ...prev,
              [activeInternalFormTarget.fieldId]: {
                type: "internal_form",
                templateId: tmpl.id,
                templateName: tmpl.name,
                data
              }
            }));
            setActiveInternalFormTarget(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Simple Internal Form Fields Render ──────────────────────────────────────────

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
  onSave: (data: Record<string, any>, template: any) => void;
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
      <div className="fixed inset-0 z-[110] flex justify-center items-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white p-6 rounded-lg shadow-xl"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>
      </div>
    );
  }

  const fields: any[] = typeof template.fields === "string" ? JSON.parse(template.fields) : template.fields ?? [];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white z-10 p-4 border-b flex justify-between items-center rounded-t-xl shrink-0">
          <h3 className="font-bold text-lg text-gray-900">{template.name}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          <form onSubmit={(e) => { e.preventDefault(); onSave(formData, template); }}>
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
                      onChange={(e) => setFormData(prev => ({...prev, [field.id]: e.target.value}))}
                      readOnly={isParentRef}
                      className={`w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${isParentRef ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    />
                  ) : field.type === "file" || field.type === "derived_arithmetically" || field.type === "conditional" || field.type === "to_words" ? (
                    <p className="text-xs text-gray-400 italic">This field type is not fully supported in nested internal forms.</p>
                  ) : field.type === "select" || field.type === "searchable_select" ? (
                    <select 
                      required={field.required}
                      value={formData[field.id] ?? ""}
                      onChange={(e) => setFormData(prev => ({...prev, [field.id]: e.target.value}))}
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
                      onChange={(e) => setFormData(prev => ({...prev, [field.id]: e.target.value}))}
                      readOnly={isParentRef}
                      className={`max-w-md ${isParentRef ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    />
                  )}
                </div>
              )})}
            </div>
            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
               <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
               <Button type="submit">Save Form Attachment</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
