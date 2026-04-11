"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFormTemplate } from "@/app/actions/form";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import Link from "next/link";

type Field = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  description: string;
};

const SELECT_CLASS = "flex h-10 w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer";

export default function FormBuilderClient({
  isAdmin,
  branches,
}: {
  isAdmin: boolean;
  branches: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formOwner, setFormOwner] = useState("");
  const [formTreater, setFormTreater] = useState("");
  const [htmlTemplate, setHtmlTemplate] = useState("");
  const [fields, setFields] = useState<Field[]>([
    { id: "f1", label: "", type: "text", required: true, description: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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
    setFields([...fields, { id: `f${Date.now()}`, label: "", type: "text", required: false, description: "" }]);
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
    const res = await createFormTemplate(
      name.trim(),
      description,
      fields,
      formOwner || undefined,
      formTreater || undefined,
      htmlTemplate || undefined
    );
    setIsSubmitting(false);

    if (res.success) {
      router.push("/dashboard/forms");
    } else {
      setError(res.error ?? "Failed to save template.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="mb-4">
        <Link href="/dashboard/forms" className="inline-flex items-center text-sm text-gray-500 hover:text-primary transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to forms
        </Link>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Form Builder</h2>
        <p className="text-gray-500">Create a new form template for the organisation.</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="form-name">Form Name <span className="text-red-500">*</span></Label>
                <Input id="form-name" placeholder="e.g. VISITOR LOG" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="form-desc">Description</Label>
                <Input id="form-desc" placeholder="Brief purpose of this form" value={description} onChange={(e) => setDescription(e.target.value)} />
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

              {/* HTML Template */}
              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="form-html">
                  PDF HTML Template
                  <span className="text-xs text-gray-400 ml-1">(Use {'{{FieldName}}'} for data injection)</span>
                </Label>
                <textarea
                  id="form-html"
                  value={htmlTemplate}
                  onChange={(e) => setHtmlTemplate(e.target.value)}
                  placeholder="<h1>Invoice</h1><p>Name: {{Beneficiary Name}}</p>"
                  className="flex min-h-[150px] w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Fields</h3>

              <div className="space-y-4">
                {fields.map((field, idx) => (
                  <div key={field.id} className="p-4 border border-gray-200 rounded-lg bg-white group hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-400 uppercase">Field {idx + 1}</span>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => removeField(idx)} className="text-gray-300 hover:text-red-500 cursor-pointer transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Label <span className="text-red-500">*</span></Label>
                        <Input placeholder="e.g. Beneficiary Name" value={field.label} onChange={(e) => updateField(idx, "label", e.target.value)} required />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
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
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-xs">Help Text</Label>
                        <Input placeholder="e.g. Enter your full account number" value={field.description} onChange={(e) => updateField(idx, "description", e.target.value)} />
                      </div>
                      <div className="md:col-span-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`req-${field.id}`}
                          checked={field.required}
                          onChange={(e) => updateField(idx, "required", e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <Label htmlFor={`req-${field.id}`} className="text-sm cursor-pointer">Required field</Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addField}
                className="w-full mt-4 border-dashed border-2 py-6 text-primary hover:text-primary hover:bg-primary/5 hover:border-primary cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Field
              </Button>
            </div>
          </CardContent>

          <CardFooter className="bg-gray-50 border-t border-gray-100 p-6 flex justify-end">
            <Button type="submit" disabled={isSubmitting} size="lg" className="cursor-pointer">
              {isSubmitting ? "Saving…" : (<><Save className="w-4 h-4 mr-2" /> Save Form Template</>)}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
