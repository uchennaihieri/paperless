"use client";

import { FileText } from "lucide-react";
import { useSession } from "next-auth/react";
import { buildNamedProxyFileUrl } from "@/lib/utils";

export function AttachmentLink({ file }: { file: any }) {
  const { data: session } = useSession();
  const token = (session?.user as any)?.backendToken ?? "";
  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";

  async function openFile() {
    const fileName = file.name || "Attachment";
    const isViewable = /\.(pdf|jpe?g|png|gif|webp)$/i.test(fileName);

    // If viewable and served via /api/v1/file, open through the Next.js proxy with the filename
    // in the URL path + Content-Disposition header so browser Save/Download uses the real name.
    if (isViewable && typeof file.url === "string") {
      const namedProxyUrl = buildNamedProxyFileUrl(file.url, fileName, false);
      if (namedProxyUrl) {
        window.open(namedProxyUrl, "_blank", "noopener,noreferrer");
        return;
      }
    }

    const newWindow = isViewable ? window.open("", "_blank") : null;

    if (newWindow) {
      newWindow.document.write(`<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#666;">Loading ${fileName}...</div>`);
    }

    try {
      const urlWithCacheBuster = file.url.includes("?")
        ? `${file.url}&t=${Date.now()}`
        : `${file.url}?t=${Date.now()}`;

      const res = await fetch(`${BASE_URL}${urlWithCacheBuster}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch file");

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);

      if (newWindow) {
        newWindow.location.href = objectUrl;
      } else {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (err) {
      if (newWindow) {
        newWindow.document.write(`<div style="color:red;padding:20px;">Failed to load file.</div>`);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={openFile}
      className="flex items-center gap-2 text-primary hover:underline font-medium text-left cursor-pointer"
    >
      <FileText className="w-4 h-4 shrink-0" /> {file.name}
    </button>
  );
}
