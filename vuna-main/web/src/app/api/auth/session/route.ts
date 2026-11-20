import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";

/** The current user for client components (the header), or null. Never cached. */
export async function GET() {
  const user = await getSession();
  return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
}
