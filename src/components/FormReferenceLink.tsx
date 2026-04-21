"use client";

import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";

// ── Utility ───────────────────────────────────────────────────────────────────

/** Matches any field label that normalises to "formreference" */
export function isFormReferenceField(key: string): boolean {
  return key.toLowerCase().replace(/[\s_-]+/g, "") === "formreference";
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders a formreference field value as a clickable link that resolves
 * the reference code to a submission. Falls back gracefully on not-found / errors.
 */
export function FormReferenceLink({
  value,
  token,
  backendUrl,
}: {
  value: string;
  token: string;
  backendUrl: string;
}) {
  const [linkedId, setLinkedId] = useState<string | null>(null);
  const [state, setState]       = useState<"loading" | "found" | "notfound">("loading");

  useEffect(() => {
    if (!value?.trim()) { setState("notfound"); return; }

    fetch(
      `${backendUrl}/api/v1/submissions/by-reference/${encodeURIComponent(value.trim())}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.id) {
          setLinkedId(d.data.id);
          setState("found");
        } else {
          setState("notfound");
        }
      })
      .catch(() => setState("notfound"));
  }, [value, token, backendUrl]);

  if (state === "found" && linkedId) {
    return (
      <a
        href={`/dashboard/forms/submission/${linkedId}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-[#b50938] font-semibold underline hover:text-[#9a0730] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {value}
        <ExternalLink className="w-3 h-3 shrink-0" />
      </a>
    );
  }

  if (state === "notfound") {
    return (
      <span className="text-gray-600">
        {value} <span className="text-gray-400 text-xs">(not found)</span>
      </span>
    );
  }

  // Loading
  return (
    <span className="text-gray-400">
      {value} <span className="animate-pulse text-xs">…</span>
    </span>
  );
}
