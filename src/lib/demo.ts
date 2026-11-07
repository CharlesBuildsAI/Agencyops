import { runAgentTurn, type BotRunState } from "./agent/loop";
import { makePrismaDeps } from "./agent/store";
import { prisma } from "./db";
import { monthSpendCents } from "./usage";

const DANA_PHONE = "+17205550198";
const OWNER_LINE = "Penny — Dana Chen just called about a new auto quote. Take it?";
const AGENT_LINE = `${OWNER_LINE}

Inbound call at 9:41 pm. Dana Chen, +1 (720) 555-0198, wants a new auto quote: liability and comprehensive on a 2024 RAV4, zip 80205. She mentioned a prior Progressive policy that Ivy filed yesterday. Take the intake and draft the follow-up. Do not send it.`;

export async function runDanaDemo(agencyId: string) {
  const penny = await prisma.bot.findFirst({ where: { agencyId, slug: "penny" } });
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!penny || !agency) throw new Error("Penny is not on this workspace.");
  if (penny.paused) {
    throw new Error("Penny is paused. Resume her before replaying the call.");
  }

  let thread = await prisma.thread.findFirst({
    where: { botId: penny.id, title: "Dana Chen" },
  });
  if (!thread) {
    thread = await prisma.thread.create({
      data: {
        agencyId,
        botId: penny.id,
        title: "Dana Chen",
        channel: "call",
        contactName: "Dana Chen",
      },
    });
  } else {
    await prisma.message.deleteMany({ where: { threadId: thread.id } });
    await prisma.approval.deleteMany({
      where: { threadId: thread.id, status: { in: ["pending", "draft"] } },
    });
  }

  const existingContact = await prisma.contact.findFirst({
    where: { agencyId, name: "Dana Chen" },
  });
  if (!existingContact) {
    await prisma.contact.create({
      data: {
        agencyId,
        name: "Dana Chen",
        phone: DANA_PHONE,
        email: "dana.chen@example.com",
        notes: "New auto quote. 2024 RAV4. Zip 80205.",
      },
    });
  }

  const startedAt = new Date(Date.now() - 78_000);
  const live = await prisma.callSession.findFirst({
    where: { botId: penny.id, status: "live" },
  });
  if (live) {
    await prisma.callSession.update({
      where: { id: live.id },
      data: {
        contactName: "Dana Chen",
        phone: DANA_PHONE,
        direction: "inbound",
        summary: "Taking Dana's RAV4 intake. Handing missing prior-carrier fields to Ivy when done.",
        startedAt,
        endedAt: null,
      },
    });
  } else {
    await prisma.callSession.create({
      data: {
        agencyId,
        botId: penny.id,
        contactName: "Dana Chen",
        phone: DANA_PHONE,
        direction: "inbound",
        status: "live",
        summary: "Taking Dana's RAV4 intake. Handing missing prior-carrier fields to Ivy when done.",
        startedAt,
      },
    });
  }

  await prisma.message.create({
    data: {
      agencyId,
      botId: penny.id,
      threadId: thread.id,
      role: "user",
      content: OWNER_LINE,
      metaJson: "{}",
    },
  });

  const bot: BotRunState = {
    slug: penny.slug,
    name: penny.name,
    roleTitle: penny.roleTitle,
    instructions: penny.instructions,
    memoryNotes: penny.memoryNotes,
    phone: penny.phone,
    email: penny.email,
    paused: penny.paused,
    pausedReason: penny.pausedReason,
    spentCents: penny.spentCents,
    monthlyCapCents: penny.monthlyCapCents,
  };

  await runAgentTurn({
    bot,
    agency: {
      name: agency.name,
      spentCents: await monthSpendCents(agency.id, agency.timezone),
      monthlyCapCents: agency.monthlyCapCents,
    },
    history: [{ role: "user", content: AGENT_LINE }],
    deps: makePrismaDeps({
      agencyId,
      botId: penny.id,
      threadId: thread.id,
      timeZone: agency.timezone,
      actorName: penny.name,
    }),
  });

  await prisma.bot.update({
    where: { id: penny.id },
    data: { statusLine: "On a call with Dana · quote intake", statusAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      agencyId,
      actorType: "system",
      actorName: "Demo",
      action: "demo.inbound_call",
      target: penny.id,
      detail: "Dana Chen called about a 2024 RAV4 quote. Penny drafted an SMS and waited.",
    },
  });

  return { threadId: thread.id, slug: penny.slug };
}
