import { NextResponse } from "next/server";
import { requireUser } from "./auth";

export async function authed() {
  const user = await requireUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }
  return { user, error: null };
}

export function ok(body: Record<string, unknown> = {}) {
  return NextResponse.json(body);
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
