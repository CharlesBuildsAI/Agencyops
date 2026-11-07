import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authed, bad } from "@/lib/http";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { user, error } = await authed();
  if (!user) return error;
  if (user.role !== "OWNER") return bad("Only the owner can pause a bot.", 403);
  const { slug } = await context.params;
  const body = (await request.json().catch(() => null)) as { paused?: boolean } | null;
  const bot = await prisma.bot.findFirst({ where: { agencyId: user.agencyId, slug } });
  if (!bot) return bad("That bot is not on this workspace.", 404);
  const paused = Boolean(body?.paused);
  await prisma.bot.update({
    where: { id: bot.id },
    data: {
      paused,
      pausedReason: paused ? `Paused by ${user.name}` : "",
      statusLine: paused ? `Paused by ${user.name}` : "Ready",
      statusAt: new Date(),
    },
  });
  await prisma.auditLog.create({
    data: {
      agencyId: user.agencyId,
      actorType: "user",
      actorId: user.id,
      actorName: user.name,
      action: paused ? "bot.paused" : "bot.resumed",
      target: bot.id,
      detail: bot.name,
    },
  });
  return NextResponse.json({ ok: true });
}
