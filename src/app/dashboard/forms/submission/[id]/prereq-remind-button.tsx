"use client";

import { useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { sendPrerequisiteReminder } from "@/app/actions/prerequisites";

export function PrereqRemindButton({ prereqId }: { prereqId: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleRemind = async () => {
    setStatus("loading");
    try {
      const res = await sendPrerequisiteReminder(prereqId);
      if (res?.success) {
        setStatus("sent");
        setMessage("✓ Reminder sent");
      } else {
        setStatus("error");
        setMessage(res?.error || "Failed to send reminder");
        setTimeout(() => setStatus("idle"), 4000);
      }
    } catch {
      setStatus("error");
      setMessage("Failed to send reminder");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  if (status === "sent") {
    return (
      <span className="text-xs font-medium text-green-600 flex items-center gap-1 shrink-0">
        <Bell className="w-3 h-3" /> {message}
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="text-xs font-medium text-red-500 shrink-0">{message}</span>
    );
  }

  return (
    <button
      onClick={handleRemind}
      disabled={status === "loading"}
      className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 transition-colors disabled:opacity-50 shrink-0"
      title="Send a reminder email to the required party"
    >
      {status === "loading" ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Bell className="w-3 h-3" />
      )}
      {status === "loading" ? "Sending…" : "Send Reminder"}
    </button>
  );
}
