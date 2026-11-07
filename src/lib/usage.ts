import { BudgetExceededError, assertCanSpend } from "./budget";
import { prisma } from "./db";
import { dayKey, monthKey } from "./time";

export async function monthSpendCents(agencyId: string, timeZone: string, now = new Date()) {
  const sum = await prisma.usageEvent.aggregate({
    where: { agencyId, monthKey: monthKey(now, timeZone) },
    _sum: { costCents: true },
  });
  return sum._sum.costCents ?? 0;
}

export async function daySpendCents(agencyId: string, timeZone: string, now = new Date()) {
  const sum = await prisma.usageEvent.aggregate({
    where: { agencyId, dayKey: dayKey(now, timeZone) },
    _sum: { costCents: true },
  });
  return sum._sum.costCents ?? 0;
}

export async function chargeUsage(input: {
  agencyId: string;
  botId: string;
  timeZone: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  kind?: string;
}) {
  const now = new Date();
  const month = monthKey(now, input.timeZone);
  const day = dayKey(now, input.timeZone);
  const decision = await prisma.$transaction(async (tx) => {
    const bot = await tx.bot.findUniqueOrThrow({ where: { id: input.botId } });
    const agency = await tx.agency.findUniqueOrThrow({ where: { id: input.agencyId } });
    let spent = bot.spentCents;
    if (bot.spentMonth !== month) {
      spent = 0;
      await tx.bot.update({
        where: { id: bot.id },
        data: { spentCents: 0, spentMonth: month, tokensIn: 0, tokensOut: 0 },
      });
    }
    const agencySum = await tx.usageEvent.aggregate({
      where: { agencyId: input.agencyId, monthKey: month },
      _sum: { costCents: true },
    });
    const agencySpent = agencySum._sum.costCents ?? 0;
    try {
      assertCanSpend({
        botSpentCents: spent,
        botCapCents: bot.monthlyCapCents,
        agencySpentCents: agencySpent,
        agencyCapCents: agency.monthlyCapCents,
        additionCents: input.costCents,
      });
    } catch (error) {
      if (error instanceof BudgetExceededError) {
        return { blocked: error };
      }
      throw error;
    }
    await tx.usageEvent.create({
      data: {
        agencyId: input.agencyId,
        botId: input.botId,
        provider: input.provider,
        model: input.model,
        tokensIn: input.tokensIn,
        tokensOut: input.tokensOut,
        costCents: input.costCents,
        kind: input.kind ?? "llm",
        monthKey: month,
        dayKey: day,
      },
    });
    const nextSpent = spent + input.costCents;
    const capped = nextSpent >= bot.monthlyCapCents || agencySpent + input.costCents >= agency.monthlyCapCents;
    await tx.bot.update({
      where: { id: bot.id },
      data: {
        spentCents: nextSpent,
        spentMonth: month,
        tokensIn: { increment: input.tokensIn },
        tokensOut: { increment: input.tokensOut },
        ...(capped
          ? { paused: true, pausedReason: "Monthly cap reached. Hard stop." }
          : {}),
      },
    });
    return { blocked: null };
  });
  if (decision.blocked) {
    await prisma.bot.update({
      where: { id: input.botId },
      data: { paused: true, pausedReason: "Monthly cap reached. Hard stop." },
    });
    throw decision.blocked;
  }
}
