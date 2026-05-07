// This client runs exclusively on the Next.js server (Vercel).
// It makes server-to-server HTTP requests to the Express backend on Railway.
// BACKEND_API_URL is a secret env var — never exposed to the browser.

import { auth } from "@/auth";

const BASE_URL =
  process.env.BACKEND_API_URL ||
  "https://paperlessbackend-production.up.railway.app/api/v1";

/** Custom error that preserves the backend error code (e.g. "PASSWORD_CHANGED"). */
export class ApiError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

/** Safely parse a response body as JSON — returns null if body is not JSON (e.g. HTML error pages). */
async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const apiClient = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  // Retrieve the Express backend JWT from the NextAuth session
  const session = await auth().catch(() => null);
  const backendToken = (session?.user as any)?.backendToken;

  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string>),
  };

  if (backendToken) {
    headers["Authorization"] = `Bearer ${backendToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await safeJson(response);
    throw new ApiError(
      errorData?.error || `API Error: ${response.status} ${response.statusText}`,
      errorData?.code
    );
  }

  // Guard against non-JSON 2xx responses (e.g. 204 No Content or HTML fallbacks)
  const data = await safeJson(response);
  return data;
};
