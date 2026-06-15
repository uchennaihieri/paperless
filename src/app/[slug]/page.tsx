import { notFound } from "next/navigation";
import { Metadata } from "next";
import PublicClientForm from "./public-client-form";

async function getPublicTemplate(slug: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"}/api/v1/public-forms/slug/${slug}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (data.success && data.data) {
      return data.data;
    }
  } catch (err) {
    console.error(err);
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const template = await getPublicTemplate(resolvedParams.slug);
  if (!template) return { title: "Form Not Found" };
  return { title: template.name };
}

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const template = await getPublicTemplate(resolvedParams.slug);

  if (!template) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-primary px-6 py-4">
            <h1 className="text-2xl font-bold text-white text-center">
              {template.name}
            </h1>
          </div>
          <div className="p-6">
            <PublicClientForm template={template} slug={resolvedParams.slug} />
          </div>
        </div>
      </div>
    </div>
  );
}
