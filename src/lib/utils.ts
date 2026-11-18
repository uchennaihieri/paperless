import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function buildNamedProxyFileUrl(rawUrl: string, fileName?: string, download = false): string | null {
  const match = rawUrl.match(/\/api\/v1\/file(?:\?([^#]*))?$/);
  if (!match) return null;
  const safeName = encodeURIComponent(fileName || "Attachment");
  const params = new URLSearchParams(match[1] || "");
  if (download) params.set("download", "true");
  params.set("t", String(Date.now()));
  const qs = params.toString();
  return `/api/v1/file/${safeName}${qs ? `?${qs}` : ""}`;
}
