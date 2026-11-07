import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authed, bad } from "@/lib/http";

export async function POST(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { user, error } = await authed();
  if (!user) return error;
  const { slug } = await context.params;
  const bot = await prisma.bot.findFirst({ where: { agencyId: user.agencyId, slug } });
  if (!bot) return bad("That bot is not on this workspace.", 404);
  const thread = await prisma.thread.findFirst({ where: { botId: bot.id }, orderBy: { updatedAt: "desc" } });
  if (thread) {
    await prisma.message.create({
      data: {
        agencyId: user.agencyId,
        botId: bot.id,
        threadId: thread.id,
        role: "system",
        content: `${user.name} signed in on ${bot.name}'s computer.`,
        metaJson: JSON.stringify({ kind: "status" }),
      },
    });
  }
  await prisma.activity.create({
    data: {
      agencyId: user.agencyId,
      botId: bot.id,
      text: `${user.name} signed in. Passwords stayed in the keychain.`,
      screen: "carrier",
    },
  });
  await prisma.auditLog.create({
    data: {
      agencyId: user.agencyId,
      actorType: "user",
      actorId: user.id,
      actorName: user.name,
      action: "computer.signed_in",
      target: bot.id,
      detail: "Owner confirmed a portal sign-in. The model did not see a password.",
    },
  });
  return NextResponse.json({ ok: true });
}
