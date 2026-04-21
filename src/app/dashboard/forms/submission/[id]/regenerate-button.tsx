"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { regeneratePdf } from "@/app/actions/workflow";

export function RegeneratePdfButton({ submissionId }: { submissionId: string }) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState("");

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setError("");
    try {
      const res = await regeneratePdf(submissionId);
      if (!res?.success) {
        setError(res?.error || "Failed to connect to generation service.");
        setTimeout(() => setError(""), 5000);
      }
    } catch {
      setError("Unexpected error. Please try again.");
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button 
        onClick={handleRegenerate} 
        disabled={isRegenerating} 
        variant="outline" 
        size="sm" 
        className="cursor-pointer border-amber-200 text-amber-700 hover:bg-amber-50"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
        {isRegenerating ? "Regenerating..." : "Regenerate PDF"}
      </Button>
      {error && (
        <span className="text-xs text-red-500 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> {error}
        </span>
      )}
    </div>
  );
}
