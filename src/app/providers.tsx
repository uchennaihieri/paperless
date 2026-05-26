"use client";

import { SessionProvider } from "next-auth/react";

import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Prevent ArrowUp and ArrowDown keys from changing number values
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLInputElement;
      if (target && target.type === "number") {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
        }
      }
    };

    // 2. Prevent mouse wheel scroll from changing number values
    const handleWheel = (e: WheelEvent) => {
      const activeEl = document.activeElement as HTMLInputElement;
      if (activeEl && activeEl.type === "number") {
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
