import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const BACKEND_API_URL =
  process.env.BACKEND_API_URL ||
  (process.env.NEXT_PUBLIC_BACKEND_URL
    ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1`
    : "https://paperlessbackend-production.up.railway.app/api/v1");

async function proxyRequest(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const session = await auth().catch(() => null);
  const backendToken = (session?.user as any)?.backendToken;
  
  if (!backendToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Await the params before using them as required by Next.js 15+
  const { slug } = await params;
  // Support /api/v1/file/<filename>?docId=... so the browser URL ends with the real filename
  const isNamedFileRoute = slug[0] === "file" && slug.length === 2;
  const path = isNamedFileRoute ? "file" : slug.join("/");
  
  const searchParams = req.nextUrl.searchParams.toString();
  const queryString = searchParams ? `?${searchParams}` : "";

  const url = `${BACKEND_API_URL}/${path}${queryString}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    // Forward relevant headers
    if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
        headers.set(key, value);
    }
  });
  headers.set("Authorization", `Bearer ${backendToken}`);

  const fetchOptions: RequestInit & { duplex?: 'half' } = {
    method: req.method,
    headers,
  };

  // Directly forward the raw stream to bypass Next.js memory and parsing limits.
  // 'duplex: half' is required by Node.js fetch when streaming a request body.
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.body) {
    fetchOptions.body = req.body as any;
    fetchOptions.duplex = 'half';
  }

  try {
    const response = await fetch(url, fetchOptions);

    const isJson = response.headers.get("Content-Type")?.includes("application/json");

    if (req.method === 'HEAD') {
      return new NextResponse(null, {
         status: response.status,
         headers: response.headers
      });
    }

    if (isJson) {
       const data = await response.json();
       return NextResponse.json(data, { status: response.status });
    } else {
       // Stream binary responses (like PDF files) directly and preserve Content-Disposition
       const blob = await response.blob();
       const resHeaders: Record<string, string> = {
          "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
       };
       let contentDisposition = response.headers.get("Content-Disposition");
       if (!contentDisposition && isNamedFileRoute && slug[1]) {
          const decodedName = decodeURIComponent(slug[1]).replace(/["\r\n]/g, "_");
          const dispType = req.nextUrl.searchParams.get("download") === "true" ? "attachment" : "inline";
          contentDisposition = `${dispType}; filename="${decodedName}"`;
       } else if (contentDisposition && req.nextUrl.searchParams.get("download") === "true") {
          contentDisposition = contentDisposition.replace(/^inline/i, "attachment");
       }
       if (contentDisposition) {
          resHeaders["Content-Disposition"] = contentDisposition;
       }
       return new NextResponse(blob, {
          status: response.status,
          headers: resHeaders,
       });
    }

  } catch (error: any) {
    console.error("Proxy Error:", error);
    return NextResponse.json({ error: "Internal Proxy Error" }, { status: 500 });
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
