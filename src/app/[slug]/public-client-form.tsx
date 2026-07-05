"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, CheckCircle } from "lucide-react";
import { numberToWords } from "@/lib/toWords";
import { SignatureSelectionModal } from "@/app/dashboard/components/SignatureSelectionModal";

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

  const fields = template?.fields || [];
  
  // Filter out unsupported fields (e.g., file uploads)
  const visibleFields = fields.filter((f: any) => 
    f.type !== "file" && 
    f.type !== "signable_document" && 
    f.type !== "extended_service"
  );

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
      let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";
      if (typeof window !== "undefined" && backendUrl.includes("localhost")) {
        const hostname = window.location.hostname;
        if (hostname !== "localhost" && hostname !== "127.0.0.1") {
          backendUrl = `${window.location.protocol}//${hostname}:4000`;
        }
      }
      let url = "";
      let payload: any = {
        formResponses: formData,
        publicSubmitterName: submitterName,
        submitterSignature: base64Signature,
      };

      if (token) {
        url = `${backendUrl}/api/v1/public-forms/submit-token/${token}`;
      } else if (slug) {
        url = `${backendUrl}/api/v1/public-forms/submit/${slug}`;
        payload.publicSubmitterEmail = submitterEmail;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
                  required={field.required}
                  value={formData[field.id] || ""}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                />
              )}
              {field.type === "textarea" && (
                <textarea
                  required={field.required}
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
              {/* Fallback for other simple types */}
              {["select", "searchable_select"].includes(field.type) && (
                <Input
                  required={field.required}
                  value={formData[field.id] || ""}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder="Enter selection"
                />
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
