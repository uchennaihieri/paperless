"use client";

import { FileText } from "lucide-react";
import { useSession } from "next-auth/react";

export function AttachmentLink({ file }: { file: any }) {
  const { data: session } = useSession();
  const token = (session?.user as any)?.backendToken ?? "";
  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";

  async function openFile() {
    // Only open a new window for formats browsers can view inline.
    // For other files (like Excel), we want to force a download with the correct filename.
    const isViewable = file.name && file.name.match(/\.(pdf|jpe?g|png|gif|webp)$/i);
    const newWindow = isViewable ? window.open("", "_blank") : null;

    if (newWindow) {
      newWindow.document.write(`<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#666;">Loading ${file.name}...</div>`);
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
        link.download = file.name || "Attachment";
        link.target = "_blank";
        link.click();
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
      onClick={openFile}
      className="flex items-center gap-2 text-primary hover:underline font-medium text-left cursor-pointer"
    >
      <FileText className="w-4 h-4 shrink-0" /> {file.name}
    </button>
  );
}
