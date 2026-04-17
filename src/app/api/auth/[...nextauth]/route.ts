import { handlers } from "@/auth";
import type { NextRequest } from "next/server";

export const GET = async (req: NextRequest, props: { params: Promise<any> }) => {
  const params = await props.params;
  return handlers.GET(req, { params });
};

export const POST = async (req: NextRequest, props: { params: Promise<any> }) => {
  const params = await props.params;
  return handlers.POST(req, { params });
};
