import { runAgentTurn, type BotRunState } from "./agent/loop";
import { makePrismaDeps } from "./agent/store";
import { prisma } from "./db";
import { monthSpendCents } from "./usage";

export type InboundInput = {
  channel: "sms" | "email" | "call";
  to: string;
  from: string;
  contactName?: string;
  subject?: string;
  body: string;
};

function digits(value: string) {
  return value.replace(/\D/g, "");
}

export function inboundNarrative(input: InboundInput) {
  const who = input.contactName || input.from;
  if (input.channel === "email") {
    return `Inbound email from ${who} <${input.from}> to ${input.to}. Subject: ${input.subject || "(no subject)"}\n\n${input.body}`;
  }
  if (input.channel === "call") {
    return `Inbound phone call from ${who} (${input.from}) to ${input.to}. They said: ${input.body}`;
  }
  return `Inbound SMS from ${who} (${input.from}) to ${input.to}: ${input.body}`;
}

export async function ingestInbound(agencyId: string, input: InboundInput) {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) throw new Error("Unknown agency.");
  const bots = await prisma.bot.findMany({ where: { agencyId }, orderBy: { sortOrder: "asc" } });
  const toDigits = digits(input.to);
  const bot =
    bots.find((candidate) => {
      if (input.channel === "email") return candidate.email.toLowerCase() === input.to.toLowerCase();
      return digits(candidate.phone) === toDigits;
    }) ?? bots.find((candidate) => candidate.slug === "penny");
  if (!bot) throw new Error("No bot is on this workspace.");

  const contactName = input.contactName || input.from;
  const title = `${input.channel} · ${contactName}`;
  const thread = await prisma.thread.create({
    data: {
      agencyId,
      botId: bot.id,
      title,
      channel: input.channel,
      contactName,
    },
  });
  const narrative = inboundNarrative(input);
  await prisma.message.create({
    data: {
      agencyId,
      botId: bot.id,
      threadId: thread.id,
      role: "user",
      content: narrative,
      metaJson: JSON.stringify({ inbound: true, channel: input.channel }),
    },
  });
  if (input.channel === "call") {
    await prisma.callSession.create({
      data: {
        agencyId,
        botId: bot.id,
        contactName,
        phone: input.from,
        direction: "inbound",
        status: "live",
        summary: input.body.slice(0, 180),
      },
    });
  }
  await prisma.auditLog.create({
    data: {
      agencyId,
      actorType: "system",
      actorName: contactName,
      action: `inbound.${input.channel}`,
      target: bot.id,
      detail: narrative.slice(0, 500),
    },
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
  await runAgentTurn({
    bot: state,
    agency: {
      name: agency.name,
      spentCents: await monthSpendCents(agency.id, agency.timezone),
      monthlyCapCents: agency.monthlyCapCents,
    },
    history: [{ role: "user", content: narrative }],
    deps: makePrismaDeps({
      agencyId,
      botId: bot.id,
      threadId: thread.id,
      timeZone: agency.timezone,
      actorName: bot.name,
    }),
  });
  await prisma.bot.update({
    where: { id: bot.id },
    data: {
      statusLine:
        input.channel === "call" ? `On a call with ${contactName}` : `New ${input.channel} from ${contactName}`,
      statusAt: new Date(),
    },
  });
  return { slug: bot.slug, threadId: thread.id };
}
