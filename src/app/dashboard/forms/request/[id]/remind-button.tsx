"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";

export function RemindButton({ requestId, token }: { requestId: string; token: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleRemind = async () => {
    setStatus("sending");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app"}/api/v1/form-requests/${requestId}/remind`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
      }
    } catch (e) {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <span className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-md">
        Reminder Sent!
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="text-xs font-semibold text-red-700 bg-red-50 px-3 py-1.5 rounded-md">
        Failed
      </span>
    );
  }

  return (
    <button
      onClick={handleRemind}
      disabled={status === "sending"}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
    >
      <MessageCircle className="w-3.5 h-3.5" />
      {status === "sending" ? "Sending..." : "Send Reminder"}
    </button>
  );
}
