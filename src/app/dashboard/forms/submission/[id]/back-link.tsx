"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackToFormsLink() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center text-sm text-gray-500 hover:text-primary transition-colors cursor-pointer"
    >
      <ArrowLeft className="w-4 h-4 mr-1" /> Back to forms
    </button>
  );
}
