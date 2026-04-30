/**
 * Persistent device identifier utilities.
 * A UUID is generated once on first app open and stored in localStorage forever.
 * The same UUID is sent on every /auth/login call so the backend can track device approvals.
 */

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("deviceId", id);
  }
  return id;
}

export function getDeviceName(): string {
  if (typeof window === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  // Browser detection
  let browser = "Browser";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edg")) browser = "Edge";

  // OS detection
  let os = "Unknown OS";
  if (ua.includes("Windows NT 10")) os = "Windows 10/11";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  return `${browser} on ${os}`;
}
