import { NextResponse } from "next/server";
import { runDanaDemo } from "@/lib/demo";
import { authed, bad } from "@/lib/http";

export async function POST() {
  const { user, error } = await authed();
  if (!user) return error;
  try {
    const result = await runDanaDemo(user.agencyId);
    return NextResponse.json({ ok: true, ...result });
  } catch (caught) {
    return bad(caught instanceof Error ? caught.message : "Demo failed.", 400);
  }
}
