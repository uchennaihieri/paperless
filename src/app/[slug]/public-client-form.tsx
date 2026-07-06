"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, CheckCircle, Search, ChevronRight, Check } from "lucide-react";
import { SignatureSelectionModal } from "@/app/dashboard/components/SignatureSelectionModal";

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

// ─────────────────────────────────────────────────────────────────────────────

export default function PublicClientForm({
  template,
  slug,
  token,
  targetEmail,
  prefilledData,
}: {
  template: any;
  slug?: string;
  token?: string;
  targetEmail?: string;
  prefilledData?: Record<string, any>;
}) {
  const [formData, setFormData] = useState<Record<string, any>>(prefilledData || {});
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState(targetEmail || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successReference, setSuccessReference] = useState("");
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, { label: string; value: string }[]>>({});

  const fields = template?.fields || [];
  
  // Exclude unsupported internal fields (like extended_service, custom form) but ALLOW file, select, searchable_select, event_selector
  const visibleFields = fields.filter((f: any) => 
    f.type !== "signable_document" && 
    f.type !== "extended_service"
  );

  useEffect(() => {
    async function fetchOptions() {
      try {
        let backendUrl = process.env.NEXT_PUBLIC_EXTERNAL_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";
        if (typeof window !== "undefined" && backendUrl.includes("localhost")) {
          const hostname = window.location.hostname;
          if (hostname !== "localhost" && hostname !== "127.0.0.1") {
            backendUrl = `${window.location.protocol}//${hostname}:4000`;
          }
        }
        let url = "";
        if (token) url = `${backendUrl}/api/v1/public-forms/token/${token}/options`;
        else if (slug) url = `${backendUrl}/api/v1/public-forms/slug/${slug}/options`;
        
        if (url) {
          const res = await fetch(url);
          const data = await res.json();
          const opts = data.success && data.data ? data.data : {};
          
          // Parse static manual options
          for (const field of fields) {
            if ((field.type === "select" || field.type === "searchable_select") && 
                field.optionsSource !== "database" && 
                field.optionsSource !== "reusable_list" && 
                field.optionsArray) {
              opts[field.id] = field.optionsArray
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
                .map((s: string) => ({ label: s, value: s }));
            }
          }
          
          setDynamicOptions(opts);
        }
      } catch (err) {
        console.error("Failed to fetch options", err);
      }
    }
    fetchOptions();
  }, [slug, token]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [fieldId]: value };

      // Handle derived arithmetic fields
      visibleFields
        .filter((f: any) => f.type === "derived_arithmetically")
        .forEach((f: any) => {
          const v1 = parseFloat(next[f.derivedFirstField]) || 0;
          const v2 = parseFloat(next[f.derivedSecondField]) || 0;
          let res = 0;
          if (f.derivedOperator === "+") res = v1 + v2;
          if (f.derivedOperator === "-") res = v1 - v2;
          if (f.derivedOperator === "*") res = v1 * v2;
          if (f.derivedOperator === "/") res = v2 !== 0 ? v1 / v2 : 0;
          next[f.id] = res;
        });

      return next;
    });
  };

  const handleNextClick = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!submitterName.trim()) {
      return setError("Your Name is required.");
    }
    if (!submitterEmail.trim()) {
      return setError("Your Email is required.");
    }

    setIsSignatureModalOpen(true);
  };

  const submitToBackend = async (base64Signature: string) => {
    setIsSignatureModalOpen(false);
    setIsSubmitting(true);
    setError("");

    try {
      let backendUrl = process.env.NEXT_PUBLIC_EXTERNAL_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";
      if (typeof window !== "undefined" && backendUrl.includes("localhost")) {
        const hostname = window.location.hostname;
        if (hostname !== "localhost" && hostname !== "127.0.0.1") {
          backendUrl = `${window.location.protocol}//${hostname}:4000`;
        }
      }
      let url = "";

      if (token) {
        url = `${backendUrl}/api/v1/public-forms/submit-token/${token}`;
      } else if (slug) {
        url = `${backendUrl}/api/v1/public-forms/submit/${slug}`;
      }

      const formPayload = new FormData();
      const jsonData: any = {
        formResponses: { ...formData },
        publicSubmitterName: submitterName,
        submitterSignature: base64Signature,
      };

      if (slug) {
        jsonData.publicSubmitterEmail = submitterEmail;
      }

      // Loop formData to separate files from simple values
      Object.entries(formData).forEach(([key, val]) => {
         if (Array.isArray(val) && val.length > 0 && val[0] instanceof File) {
             val.forEach(file => formPayload.append(key, file));
             delete jsonData.formResponses[key]; // Do not send files in JSON
         }
      });

      formPayload.append("data", JSON.stringify(jsonData));

      const res = await fetch(url, {
        method: "POST",
        body: formPayload,
      });

      const data = await res.json();
      if (data.success) {
        setSuccessReference(data.data.reference);
      } else {
        setError(data.error || "Failed to submit form.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successReference) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Submission Successful!</h2>
        <p className="text-gray-600 mb-6">
          Thank you. Your reference number is <strong className="text-gray-900">{successReference}</strong>
        </p>
      </div>
    );
  }

  return (
    <>
    <form onSubmit={handleNextClick} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Submitter Info Block */}
      <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-4">
        <h3 className="font-semibold text-gray-900 mb-2">Your Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Full Name <span className="text-red-500">*</span></Label>
            <Input 
              value={submitterName}
              onChange={(e) => setSubmitterName(e.target.value)}
              placeholder="e.g. Jane Doe"
              required
              className="bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email Address <span className="text-red-500">*</span></Label>
            <Input 
              type="email"
              value={submitterEmail}
              onChange={(e) => setSubmitterEmail(e.target.value)}
              placeholder="jane@example.com"
              required
              readOnly={!!targetEmail}
              className={`bg-white ${targetEmail ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {visibleFields.map((field: any) => {
          if (field.type === "section_header") {
            return (
              <div key={field.id} className="pt-6 border-t border-gray-100 mt-6">
                <h3 className="text-xl font-bold text-primary">{field.label}</h3>
                {field.sectionSubtitle && <p className="text-sm text-gray-500 mt-1">{field.sectionSubtitle}</p>}
              </div>
            );
          }

          if (field.type === "instructions") {
            return (
              <div key={field.id} className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mt-4 text-sm text-gray-700">
                {field.label && <h4 className="font-semibold text-blue-900 mb-2">{field.label}</h4>}
                <div dangerouslySetInnerHTML={{ __html: field.instructionsContent || "" }} />
              </div>
            );
          }

          return (
            <div key={field.id} className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </Label>
              {field.description && <p className="text-xs text-gray-500">{field.description}</p>}
              
              {field.type === "text" && (
                <Input
                  type={field.textType || "text"}
                  required={field.required}
                  minLength={field.minLength}
                  maxLength={field.maxLength}
                  value={formData[field.id] || ""}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                />
              )}
              {field.type === "textarea" && (
                <textarea
                  required={field.required}
                  minLength={field.minLength}
                  maxLength={field.maxLength}
                  value={formData[field.id] || ""}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
                />
              )}
              {field.type === "number" && (
                <Input
                  type="number"
                  required={field.required}
                  value={formData[field.id] || ""}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                />
              )}
              {field.type === "date" && (
                <Input
                  type="date"
                  required={field.required}
                  value={formData[field.id] || ""}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                />
              )}
              {field.type === "derived_arithmetically" && (
                <Input
                  type="number"
                  value={formData[field.id] || ""}
                  readOnly
                  className="bg-gray-100"
                />
              )}
              {field.type === "to_words" && (
                <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-700 italic">
                  {formData[field.id] || "—"}
                </div>
              )}
              {field.type === "select" && (
                <select
                  id={field.id}
                  required={field.required}
                  value={formData[field.id] ?? ""}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="flex h-10 w-full max-w-md rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm cursor-pointer"
                >
                  <option value="">— Select an option —</option>
                  {(dynamicOptions[field.id] || []).map((opt: { label: string; value: string }) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
              {(field.type === "searchable_select" || field.type === "event_selector") && (
                <SearchableSelect
                  id={field.id}
                  options={dynamicOptions[field.id] || []}
                  value={formData[field.id] ?? ""}
                  onChange={(val) => handleFieldChange(field.id, val)}
                  required={field.required}
                />
              )}
              {field.type === "file" && (
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
                      handleFieldChange(field.id, merged);
                      e.target.value = "";
                    }}
                  />
                  {(field.maxFiles ?? 1) > 1 && (
                    <p className="text-xs text-gray-400 mt-2">You can select multiple files. Each pick adds to the list below.</p>
                  )}
                  {formData[field.id] && formData[field.id].length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {(formData[field.id] as File[]).map((f: File, i: number) => (
                        <li key={i} className="text-sm text-gray-600 flex items-center justify-between bg-white px-3 py-2 rounded-md border border-gray-200 shadow-sm">
                          <span className="truncate">{f.name}</span>
                          <button type="button" onClick={() => {
                            const newFiles = (formData[field.id] as File[]).filter((_, idx) => idx !== i);
                            handleFieldChange(field.id, newFiles.length > 0 ? newFiles : null);
                          }} className="text-red-400 hover:text-red-600 font-bold p-1">&times;</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-6 border-t border-gray-100 flex justify-end">
        <Button type="submit" disabled={isSubmitting} size="lg" className="w-full sm:w-auto cursor-pointer">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" /> Next: Sign & Submit
            </>
          )}
        </Button>
      </div>
    </form>
    
    <SignatureSelectionModal
      isOpen={isSignatureModalOpen}
      onClose={() => setIsSignatureModalOpen(false)}
      onSuccess={submitToBackend}
      allowToken={false}
    />
    </>
  );
}
