export const getApiUrl = () => {
  // Use NEXT_PUBLIC_API_URL on the client side, BACKEND_API_URL on the server side
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "https://paperlessbackend-production.up.railway.app/api/v1";
  }
  return process.env.BACKEND_API_URL || "https://paperlessbackend-production.up.railway.app/api/v1";
};

export const apiClient = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};
