import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authed, bad } from "@/lib/http";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await authed();
  if (!user) return error;
  const { id } = await context.params;
  const call = await prisma.callSession.findFirst({ where: { id, agencyId: user.agencyId } });
  if (!call) return bad("Call not found.", 404);
  await prisma.callSession.update({
    where: { id: call.id },
    data: { status: "ended", endedAt: new Date() },
  });
  await prisma.bot.update({
    where: { id: call.botId },
    data: { statusLine: `Wrapped ${call.contactName}`, statusAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      agencyId: user.agencyId,
      actorType: "user",
      actorId: user.id,
      actorName: user.name,
      action: "call.ended",
      target: call.id,
      detail: call.contactName,
    },
  });
  return NextResponse.json({ ok: true });
}
