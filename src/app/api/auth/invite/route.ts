import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { authed, bad } from "@/lib/http";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const { user, error } = await authed();
  if (!user) return error;
  if (user.role !== "OWNER") return bad("Only the owner can invite staff.", 403);
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("Enter a valid email.");
  const existing = await prisma.user.findFirst({ where: { agencyId: user.agencyId, email } });
  if (existing) return bad("That person is already on the workspace.");
  const token = randomBytes(18).toString("hex");
  await prisma.invite.create({
    data: {
      agencyId: user.agencyId,
      email,
      role: "STAFF",
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
    },
  });
  await prisma.auditLog.create({
    data: {
      agencyId: user.agencyId,
      actorType: "user",
      actorId: user.id,
      actorName: user.name,
      action: "invite.created",
      detail: email,
    },
  });
  const base = process.env.APP_URL || new URL(request.url).origin;
  return NextResponse.json({ ok: true, url: `${base}/invite/${token}` });
}
