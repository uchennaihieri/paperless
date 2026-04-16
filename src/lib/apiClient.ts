// This client runs exclusively on the Next.js server (Vercel).
// It makes server-to-server HTTP requests to the Express backend on Railway.
// BACKEND_API_URL is a secret env var — never exposed to the browser.

import { auth } from "@/auth";

const BASE_URL =
  process.env.BACKEND_API_URL ||
  "https://paperlessbackend-production.up.railway.app/api/v1";

export const apiClient = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  // Retrieve the Express backend JWT from the NextAuth session
  const session = await auth().catch(() => null);
  const backendToken = (session?.user as any)?.backendToken;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
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
    throw new Error(
      errorData.error || `API Error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
};
