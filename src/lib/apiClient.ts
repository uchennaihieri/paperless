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
    const errorData = await response.json().catch(() => ({}));
    // Preserve the backend error code so the client can react to specific conditions
    // (e.g. PASSWORD_CHANGED → force sign-out)
    throw new ApiError(
      errorData.error || `API Error: ${response.status} ${response.statusText}`,
      errorData.code
    );
  }

  return response.json();
};
