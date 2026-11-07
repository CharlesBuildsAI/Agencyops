import { NextResponse } from "next/server";
import { hashPassword, setSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    token?: string;
    name?: string;
    password?: string;
  } | null;
  const token = body?.token?.trim() ?? "";
  const name = body?.name?.trim() ?? "";
  const password = body?.password ?? "";
  if (!token || !name || password.length < 8) {
    return NextResponse.json({ error: "Name and a password of at least 8 characters are required." }, { status: 400 });
  }
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invite is no longer active." }, { status: 400 });
  }
  const user = await prisma.user.create({
    data: {
      agencyId: invite.agencyId,
      email: invite.email,
      name,
      role: invite.role,
      passwordHash: await hashPassword(password),
    },
  });
  await prisma.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  await prisma.auditLog.create({
    data: {
      agencyId: invite.agencyId,
      actorType: "user",
      actorId: user.id,
      actorName: name,
      action: "invite.accepted",
      detail: invite.email,
    },
  });
  await setSession({ userId: user.id, agencyId: user.agencyId, role: user.role });
  return NextResponse.json({ ok: true });
}
