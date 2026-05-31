"use client";

import { useSession } from "next-auth/react";
import { AttachmentLink } from "./attachment-link";
import { FormReferenceLink, isFormReferenceField } from "@/components/FormReferenceLink";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";

/**
 * Renders a single form response value:
 * - formreference field → resolves & renders as a link
 * - attachment array    → renders as clickable AttachmentLinks
 * - everything else     → plain string
 */
export function FormResponseCell({ label, value, forceRef = false }: { label: string; value: any; forceRef?: boolean }) {
  const { data: session } = useSession();
  const token = (session?.user as any)?.backendToken ?? "";

  const isRef             = forceRef || isFormReferenceField(label);
  const isAttachmentArray = Array.isArray(value) && value.every((v: any) => v?.isAttachment);

  if (isRef && typeof value === "string" && value.trim()) {
    return <FormReferenceLink value={value} token={token} backendUrl={BASE_URL} />;
  }

  if (isAttachmentArray) {
    return (
      <div className="flex flex-col gap-2">
        {(value as any[]).map((file: any, idx: number) => (
          <AttachmentLink key={idx} file={file} />
        ))}
      </div>
    );
  }

  const isProxyPdfUrl = typeof value === "string" && value.startsWith("/api/v1/");
  if (isProxyPdfUrl) {
    return <AttachmentLink file={{ name: "View Extended Service Document", url: value }} />;
  }

  return <>{String(value) || <span className="italic text-gray-300">—</span>}</>;
}
