import { useState, useEffect, useRef, useCallback } from "react";

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
      } catch (err) {
        console.error("SmartFetch error:", err);
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
