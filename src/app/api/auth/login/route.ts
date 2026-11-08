import { NextResponse } from "next/server";
import { checkPassword, setSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { demoLoginBlocked } from "@/lib/demo-mode";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  if (demoLoginBlocked(email, password)) {
    return NextResponse.json(
      {
        error:
          "Demo sign-in is disabled on this deployment. Set DEMO_MODE=true only if this instance is the public showcase.",
      },
      { status: 403 },
    );
  }
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user || !(await checkPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "That email and password don't match." }, { status: 401 });
  }
  await setSession({ userId: user.id, agencyId: user.agencyId, role: user.role });
  return NextResponse.json({ ok: true });
}
