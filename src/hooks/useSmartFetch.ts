import { useState, useEffect, useRef, useCallback } from "react";

function showUpdateToast() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (document.getElementById("smartfetch-update-toast")) return;

  const toast = document.createElement("div");
  toast.id = "smartfetch-update-toast";
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    backgroundColor: "#1f2937",
    color: "#f9fafb",
    padding: "16px 20px",
    borderRadius: "12px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
    zIndex: "9999",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "14px",
    maxWidth: "420px",
    border: "1px solid #374151"
  });

  toast.innerHTML = `
    <div style="flex: 1;">
      <strong style="display: block; font-size: 15px; margin-bottom: 4px; color: #fff;">Update Available</strong>
      <span style="color: #d1d5db; line-height: 1.4; display: block;">A new version of the application is available. Please refresh your page to continue.</span>
    </div>
    <button onclick="window.location.reload()" style="background: #3b82f6; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; transition: background 0.2s;">
      Refresh
    </button>
  `;
  document.body.appendChild(toast);
}

export function useSmartFetch<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = [],
  throttleMs: number = 120_000,
  slowPollMs: number = 300_000
) {
  const [data, setData] = useState<T | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isFetching, setIsFetching] = useState(false);
  const [timeAgoStr, setTimeAgoStr] = useState("just now");

  // Store fetchFn in a ref so it's always up-to-date without being a dependency
  const fetchFnRef = useRef(fetchFn);
  useEffect(() => { fetchFnRef.current = fetchFn; });

  const isFetchingRef = useRef(false);
  const lastUpdatedRef = useRef<number>(Date.now());

  const updateTimeAgo = useCallback(() => {
    const seconds = Math.floor((Date.now() - lastUpdatedRef.current) / 1000);
    if (seconds < 60) setTimeAgoStr("just now");
    else if (seconds < 120) setTimeAgoStr("1 min ago");
    else if (seconds < 3600) setTimeAgoStr(`${Math.floor(seconds / 60)} mins ago`);
    else if (seconds < 7200) setTimeAgoStr("1 hr ago");
    else setTimeAgoStr(`${Math.floor(seconds / 3600)} hrs ago`);
  }, []);

  // Stable trigger — uses fetchFnRef so it never causes effect re-runs
  const triggerRefresh = useCallback(
    async (force = false) => {
      if (isFetchingRef.current) return;

      const isStale = Date.now() - lastUpdatedRef.current > throttleMs;
      if (!isStale && !force) return;

      isFetchingRef.current = true;
      setIsFetching(true);
      try {
        const newData = await fetchFnRef.current();
        if (newData !== undefined) {
          setData(newData);
        }
        const now = new Date();
        setLastUpdated(now);
        lastUpdatedRef.current = now.getTime();
        updateTimeAgo();
      } catch (err: any) {
        console.error("SmartFetch error:", err);
        const errMsg = err?.message || String(err);
        if (
          errMsg.includes("Failed to find Server Action") || 
          errMsg.includes("older or newer deployment") ||
          errMsg.includes("was not found on the server") ||
          errMsg.includes("UnrecognizedActionError")
        ) {
          showUpdateToast();
        }
      } finally {
        isFetchingRef.current = false;
        setIsFetching(false);
      }
    },
    // Only throttleMs and updateTimeAgo — fetchFn is accessed via ref
    [throttleMs, updateTimeAgo]
  );

  // Initial fetch — re-runs only when caller's dependencies change
  useEffect(() => {
    triggerRefresh(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  // Polling + event listeners — mounted ONCE, never torn down due to fetchFn changes
  useEffect(() => {
    // Layer 4: background poll every slowPollMs (default 5 min)
    const pollTimer = setInterval(() => triggerRefresh(true), slowPollMs);

    // UX timer: refresh "Last updated: X mins ago" text every 30s
    const uxTimer = setInterval(updateTimeAgo, 30_000);

    // Layer 1 & 2: tab visibility + window focus
    const handleVisibility = () => {
      if (document.visibilityState === "visible") triggerRefresh();
    };
    const handleFocus = () => triggerRefresh();

    // Layer 3: network reconnect (laptop wake)
    const handleOnline = () => triggerRefresh(true);

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    return () => {
      clearInterval(pollTimer);
      clearInterval(uxTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
    };
    // Intentionally omit triggerRefresh from deps — it's stable via throttleMs ref approach
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slowPollMs]);

  return {
    data,
    setData,
    lastUpdated,
    isFetching,
    timeAgoStr,
    forceRefresh: () => triggerRefresh(true),
  };
}
