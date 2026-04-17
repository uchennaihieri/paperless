"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitForm, searchUsers, SignatoryInput, SigningType } from "@/app/actions/form";
import { X, Search, Check, ChevronRight, GitBranch, Layers, Send, UserPlus, ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type Field = {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "textarea" | "file";
  required: boolean;
  description?: string;
  maxLength?: number;
  maxFiles?: number;
  accept?: string;
};

type UserResult = {
  id: number;
  user_name: string | null;
  finca_email: string | null;
  branch: string | null;
  user_role: string | null;
};

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

// ─── Step 1: Form Fields ──────────────────────────────────────────────────────

function FormFieldsStep({
  template,
  formData,
  onChange,
  onNext,
}: {
  template: any;
  formData: Record<string, any>;
  onChange: (id: string, value: any) => void;
  onNext: () => void;
}) {
  const fields: Field[] = typeof template.fields === "string"
    ? JSON.parse(template.fields)
    : template.fields ?? [];

  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }}>
      <CardContent className="space-y-8 pt-8">
        {fields.map((field, idx) => (
          <div key={field.id} className="space-y-2">
            <div>
              <Label htmlFor={field.id} className="text-base font-semibold flex gap-2">
                <span className="text-primary text-sm">{idx + 1}.</span>
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </Label>
              {field.description && (
                <p className="text-xs text-gray-400 mt-0.5">{field.description}</p>
              )}
            </div>

            {field.type === "textarea" ? (
              <textarea
                id={field.id}
                required={field.required}
                rows={4}
                value={formData[field.id] ?? ""}
                onChange={(e) => onChange(field.id, e.target.value)}
                className="flex w-full max-w-xl rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            ) : field.type === "file" ? (
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 bg-gray-50 hover:bg-gray-100 transition-colors max-w-xl">
                <Input
                  id={field.id}
                  type="file"
                  required={field.required && (!formData[field.id] || formData[field.id].length === 0)}
                  accept={field.accept}
                  multiple={(field.maxFiles ?? 1) > 1}
                  className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length === 0) {
                      onChange(field.id, null);
                    } else {
                      onChange(field.id, files);
                    }
                  }}
                />
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
                <p id={`label-${field.id}`} className="text-xs text-gray-400 mt-2">{field.description}</p>
              </div>
            ) : (
              <Input
                id={field.id}
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                required={field.required}
                maxLength={field.maxLength}
                value={formData[field.id] ?? ""}
                onChange={(e) => onChange(field.id, e.target.value)}
                className="max-w-md"
              />
            )}
          </div>
        ))}
      </CardContent>
      <CardFooter className="bg-gray-50 border-t border-gray-100 p-6 flex justify-end">
        <Button type="submit" size="lg" className="cursor-pointer">
          Next: Add Signatories <ChevronRight className="w-4 h-4 ml-1" />
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
  const { currentUser } = arguments[0] as unknown as { currentUser: { userName: string, email: string }};

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
}: {
  template: any;
  formData: Record<string, any>;
  signatories: SignatoryInput[];
  signingType: SigningType;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
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
                {fields.map((f, i) => (
                  <tr key={f.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 font-medium text-gray-700">{f.label}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {f.type === "file" && formData[f.id] ? (
                        <div className="flex flex-col gap-1">
                          {(formData[f.id] as File[]).map((file, idx) => (
                            <span key={idx} className="text-sm font-medium text-gray-800">{file.name}</span>
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
        <Button variant="outline" onClick={onBack} disabled={submitting} className="cursor-pointer">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button onClick={onSubmit} disabled={submitting} size="lg" className="cursor-pointer">
          {submitting ? "Submitting…" : <><Send className="w-4 h-4 mr-2" /> Submit Form</>}
        </Button>
      </CardFooter>
    </>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function FormFillerClient({ template, currentUser }: { template: any, currentUser: { userName: string; email: string } }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [signatories, setSignatories] = useState<SignatoryInput[]>([{
    position: 1,
    userName: currentUser.userName,
    email: currentUser.email
  }]);
  const [signingType, setSigningType] = useState<SigningType>("sequential");
  const [submitting, setSubmitting] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [signatureToken, setSignatureToken] = useState("");
  const [error, setError] = useState("");

  const fields: Field[] = typeof template.fields === "string"
    ? JSON.parse(template.fields)
    : template.fields ?? [];

  const handleFieldChange = (id: string, value: any) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
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

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    const textOnlyResponses: Record<string, any> = {};
    const fileFields: Record<string, File[]> = {};

    fields.forEach((f) => {
      if (f.type === "file") {
        if (formData[f.id]) {
          fileFields[f.label] = formData[f.id] as File[];
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
      ...(signatureToken ? { initiatorToken: signatureToken } : {})
    }));

    for (const [fieldName, files] of Object.entries(fileFields)) {
      for (const file of files) {
        formDataPayload.append(fieldName, file);
      }
    }

    const res = await submitForm(formDataPayload);
    setSubmitting(false);
    setShowTokenModal(false);

    if (res.success) {
      router.push("/dashboard/forms");
    } else {
      setError(res.error ?? "Something went wrong.");
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Link href="/dashboard/forms" className="inline-flex items-center text-sm text-gray-500 hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to forms
      </Link>

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
            onChange={handleFieldChange}
            onNext={() => setStep(2)}
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
            onSubmit={() => setShowTokenModal(true)}
            submitting={submitting}
          />
        )}
      </Card>

      {/* Token Verification Modal for Instant First-Signature */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-2">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Sign & Submit</h3>
              <p className="text-sm text-gray-500">
                You are listed as the first signatory. Enter your 8-character token to securely apply your signature to this submission simultaneously.
              </p>
              <Input
                type="text"
                placeholder="Token (e.g. 1a2b3c4d)"
                value={signatureToken}
                onChange={(e) => setSignatureToken(e.target.value)}
                maxLength={8}
                className="text-center tracking-widest font-mono text-lg py-6"
              />
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                <Button variant="ghost" onClick={() => setShowTokenModal(false)}>Cancel</Button>
                <Button 
                  disabled={signatureToken.length !== 8 || submitting} 
                  onClick={handleSubmit} 
                  className="w-full sm:w-auto"
                >
                  {submitting ? "Signing..." : "Verify & Submit"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
