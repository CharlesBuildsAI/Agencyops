import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authed, bad } from "@/lib/http";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { user, error } = await authed();
  if (!user) return error;
  const { slug } = await context.params;
  const body = (await request.json().catch(() => null)) as { notes?: string } | null;
  const bot = await prisma.bot.findFirst({ where: { agencyId: user.agencyId, slug } });
  if (!bot) return bad("That bot is not on this workspace.", 404);
  await prisma.bot.update({ where: { id: bot.id }, data: { memoryNotes: body?.notes ?? "" } });
  await prisma.auditLog.create({
    data: {
      agencyId: user.agencyId,
      actorType: "user",
      actorId: user.id,
      actorName: user.name,
      action: "memory.updated",
      target: bot.id,
      detail: bot.name,
    },
  });
  return NextResponse.json({ ok: true });
}
