import { NextResponse } from "next/server";
import { runAgentTurn, type BotRunState } from "@/lib/agent/loop";
import { makePrismaDeps } from "@/lib/agent/store";
import { BudgetExceededError } from "@/lib/budget";
import { prisma } from "@/lib/db";
import { authed, bad } from "@/lib/http";
import { monthSpendCents } from "@/lib/usage";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { user, error } = await authed();
  if (!user) return error;
  const { slug } = await context.params;
  const body = (await request.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim() ?? "";
  if (!text) return bad("Write a message first.");
  const bot = await prisma.bot.findFirst({ where: { agencyId: user.agencyId, slug } });
  if (!bot) return bad("That bot is not on this workspace.", 404);
  let thread = await prisma.thread.findFirst({ where: { botId: bot.id }, orderBy: { updatedAt: "desc" } });
  if (!thread) {
    thread = await prisma.thread.create({
      data: { agencyId: user.agencyId, botId: bot.id, title: "Desk", channel: "chat" },
    });
  }
  await prisma.message.create({
    data: {
      agencyId: user.agencyId,
      botId: bot.id,
      threadId: thread.id,
      role: "user",
      content: text,
      metaJson: "{}",
    },
  });
  const prior = await prisma.message.findMany({
    where: { threadId: thread.id, role: { in: ["user", "assistant"] } },
    orderBy: { createdAt: "asc" },
    take: 24,
  });
  const state: BotRunState = {
    slug: bot.slug,
    name: bot.name,
    roleTitle: bot.roleTitle,
    instructions: bot.instructions,
    memoryNotes: bot.memoryNotes,
    phone: bot.phone,
    email: bot.email,
    paused: bot.paused,
    pausedReason: bot.pausedReason,
    spentCents: bot.spentCents,
    monthlyCapCents: bot.monthlyCapCents,
  };
  try {
    await runAgentTurn({
      bot: state,
      agency: {
        name: user.agency.name,
        spentCents: await monthSpendCents(user.agencyId, user.agency.timezone),
        monthlyCapCents: user.agency.monthlyCapCents,
      },
      history: prior.map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      })),
      deps: makePrismaDeps({
        agencyId: user.agencyId,
        botId: bot.id,
        threadId: thread.id,
        timeZone: user.agency.timezone,
        actorName: bot.name,
      }),
    });
  } catch (caught) {
    if (caught instanceof BudgetExceededError) {
      await prisma.message.create({
        data: {
          agencyId: user.agencyId,
          botId: bot.id,
          threadId: thread.id,
          role: "assistant",
          content: caught.message,
          metaJson: JSON.stringify({ kind: "budget" }),
        },
      });
      await prisma.auditLog.create({
        data: {
          agencyId: user.agencyId,
          actorType: "system",
          actorName: bot.name,
          action: "budget.stopped",
          target: bot.id,
          detail: caught.message,
        },
      });
      return NextResponse.json({ error: caught.message, code: "budget" }, { status: 402 });
    }
    throw caught;
  }
  return NextResponse.json({ ok: true });
}
