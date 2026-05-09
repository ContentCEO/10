import { NextResponse } from "next/server";

export function corsHeaders(origin?: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function corsResponse(json: unknown, init: ResponseInit = {}, origin?: string | null) {
  const res = NextResponse.json(json, init);
  const headers = corsHeaders(origin);
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

export function corsPreflight(origin?: string | null) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}
