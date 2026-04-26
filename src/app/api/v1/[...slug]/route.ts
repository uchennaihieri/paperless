import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const BACKEND_API_URL = process.env.BACKEND_API_URL || "https://paperlessbackend-production.up.railway.app/api/v1";

async function proxyRequest(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const session = await auth().catch(() => null);
  const backendToken = (session?.user as any)?.backendToken;
  
  if (!backendToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Await the params before using them as required by Next.js 15+
  const { slug } = await params;
  const path = slug.join("/");
  
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

  let body = undefined;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (req.headers.get("Content-Type")?.includes("multipart/form-data")) {
        body = await req.formData();
    } else if (req.headers.get("Content-Type")?.includes("application/json")) {
        body = await req.text();
    } else {
        try {
            body = await req.blob();
        } catch(e) {}
    }
  }

  try {
    const response = await fetch(url, {
      method: req.method,
      headers,
      body: body as BodyInit,
      // Pass the request cache setting along or omit
    });

    const isJson = response.headers.get("Content-Type")?.includes("application/json");

    if (isJson) {
       const data = await response.json();
       return NextResponse.json(data, { status: response.status });
    } else {
       // Stream binary responses (like PDF files) directly
       const blob = await response.blob();
       return new NextResponse(blob, {
          status: response.status,
          headers: {
             "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
          }
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
