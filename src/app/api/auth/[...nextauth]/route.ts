import { handlers } from "@/auth";
import type { NextRequest } from "next/server";

export const GET = async (req: NextRequest, props: { params: Promise<any> }) => {
  const params = await props.params;
  // @ts-expect-error NextAuth types don't match Next.js 15 yet
  return handlers.GET(req, { params });
};

export const POST = async (req: NextRequest, props: { params: Promise<any> }) => {
  const params = await props.params;
  // @ts-expect-error NextAuth types don't match Next.js 15 yet
  return handlers.POST(req, { params });
};
