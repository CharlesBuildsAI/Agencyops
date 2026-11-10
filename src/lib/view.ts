import { getComputerAdapter } from "./computer";
import { prisma } from "./db";
import { dollars, initials, parseJson, phonePretty } from "./format";
import { dayKey, formatClockWithPeriod, statusStamp } from "./time";
import { daySpendCents, monthSpendCents } from "./usage";
import type { User, Agency } from "@prisma/client";

export type FrameData = {
  agency: {
    name: string;
    productName: string;
    mark: string;
    accentColor: string;
    timezone: string;
  };
  user: { name: string; email: string; role: string; initials: string };
  needsCount: number;
  needsHref: string;
  bots: {
    slug: string;
    name: string;
    roleTitle: string;
    color: string;
    statusLine: string;
    stamp: string;
    paused: boolean;
    pending: number;
    live: boolean;
  }[];
};

type Member = User & { agency: Agency };

export async function loadFrame(user: Member): Promise<FrameData> {
  const bots = await prisma.bot.findMany({
    where: { agencyId: user.agencyId },
    orderBy: { sortOrder: "asc" },
  });
  const pending = await prisma.approval.groupBy({
    by: ["botId"],
    where: { agencyId: user.agencyId, status: "pending", kind: { in: ["sms", "email"] } },
    _count: { _all: true },
  });
  const live = await prisma.callSession.findMany({
    where: { agencyId: user.agencyId, status: "live" },
    select: { botId: true },
  });
  const pendingMap = new Map(pending.map((row) => [row.botId, row._count._all]));
  const liveSet = new Set(live.map((row) => row.botId));
  const needs = await prisma.approval.findFirst({
    where: { agencyId: user.agencyId, status: "pending" },
    include: { bot: true },
    orderBy: { createdAt: "asc" },
  });
  const needsCount = await prisma.approval.count({
    where: { agencyId: user.agencyId, status: "pending" },
  });
  return {
    agency: {
      name: user.agency.name,
      productName: user.agency.productName,
      mark: user.agency.mark,
      accentColor: user.agency.accentColor,
      timezone: user.agency.timezone,
    },
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      initials: initials(user.name),
    },
    needsCount,
    needsHref: needs ? `/app/bots/${needs.bot.slug}` : "/app",
    bots: bots.map((bot) => ({
      slug: bot.slug,
      name: bot.name,
      roleTitle: bot.roleTitle,
      color: bot.color,
      statusLine: bot.statusLine,
      stamp: statusStamp(bot.statusAt.toISOString(), user.agency.timezone, liveSet.has(bot.id)),
      paused: bot.paused,
      pending: liveSet.has(bot.id) ? 0 : (pendingMap.get(bot.id) ?? 0),
      live: liveSet.has(bot.id),
    })),
  };
}

export async function loadHome(agencyId: string) {
  const agency = await prisma.agency.findUniqueOrThrow({ where: { id: agencyId } });
  const [pending, tasks, liveCalls, callCount, approvalCount, spentToday, spentMonth] = await Promise.all([
    prisma.approval.findMany({
      where: { agencyId, status: "pending" },
      include: { bot: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.task.findMany({ where: { agencyId, queue: true, status: "open" }, include: { bot: true } }),
    prisma.callSession.findMany({ where: { agencyId, status: "live" }, include: { bot: true } }),
    prisma.callSession.count({ where: { agencyId } }),
    prisma.approval.count({ where: { agencyId } }),
    daySpendCents(agencyId, agency.timezone),
    monthSpendCents(agencyId, agency.timezone),
  ]);
  const liveBotIds = new Set(liveCalls.map((call) => call.botId));
  const today = dayKey(new Date(), agency.timezone);
  const callsToday = await prisma.callSession.count({
    where: { agencyId, startedAt: { gte: new Date(`${today}T00:00:00-07:00`) } },
  });
  const renewal = pending.find((item) => item.bot.slug === "reed");
  const queue = [
    ...pending
      .filter((item) => (item.kind === "sms" || item.kind === "email") && !liveBotIds.has(item.botId))
      .map((item) => ({
        id: item.id,
        slug: item.bot.slug,
        color: item.bot.color,
        title: item.bot.slug === "reed" ? "Hill Bakery renewal" : item.title,
        detail:
          item.bot.slug === "reed"
            ? "SMS + remarketing note · due in 12 days"
            : `${item.kind.toUpperCase()} · waiting for you`,
        action: "Needs you",
        tone: "needs" as const,
        href: `/app/bots/${item.bot.slug}`,
      })),
    ...tasks.map((task) => ({
      id: task.id,
      slug: task.bot.slug,
      color: task.bot.color,
      title: task.title,
      detail: task.detail,
      action: "Open",
      tone: "ghost" as const,
      href: `/app/bots/${task.bot.slug}`,
    })),
    ...liveCalls.map((call) => ({
      id: call.id,
      slug: call.bot.slug,
      color: call.bot.color,
      title: `${call.bot.name} live`,
        detail: call.summary.toLowerCase().includes("rav4")
          ? `${call.contactName} · RAV4 quote intake`
          : `${call.contactName} · on a call`,
      action: "Listen",
      tone: "ghost" as const,
      href: `/app/bots/${call.bot.slug}/call`,
    })),
  ];
  const focusHref = renewal ? `/app/bots/${renewal.bot.slug}` : queue[0]?.href ?? "/app";
  return {
    kicker: `Today · ${agency.name}`,
    title: pending.length >= 2 ? "Two quick approvals." : renewal ? "One renewal needs you." : pending.length ? `${pending.length} things need you.` : "Everyone is moving.",
    titleRest: renewal || pending.length ? "Everything else is moving." : "Nothing is waiting.",
    body: renewal
      ? `${renewal.bot.name} drafted the Hill Bakery outreach. Approve the SMS and he sends it from his number.`
      : pending[0]
        ? `${pending[0].bot.name} is waiting on “${pending[0].title}”.`
        : "Calls, filings, and follow-ups are with the team. Outbound messages still wait for you.",
    focusHref,
    focusLabel: renewal ? `Open ${renewal.bot.name}` : "Open the desk",
    queue,
    stats: {
      calls: callsToday,
      waiting: pending.length,
      spent: dollars(spentToday),
      callsMonth: agency.callBase + callCount,
      approvalsMonth: agency.approvalBase + approvalCount,
      spentMonth: dollars(spentMonth),
      cap: dollars(agency.monthlyCapCents),
      answeredRate: agency.answeredRate,
    },
  };
}

export async function loadDesk(agencyId: string, slug: string) {
  const agency = await prisma.agency.findUniqueOrThrow({ where: { id: agencyId } });
  const bot = await prisma.bot.findFirst({ where: { agencyId, slug } });
  if (!bot) return null;
  const thread = await prisma.thread.findFirst({
    where: { botId: bot.id },
    orderBy: { updatedAt: "desc" },
  });
  const [messages, approvals, call, activities] = await Promise.all([
    thread
      ? prisma.message.findMany({ where: { threadId: thread.id }, orderBy: { createdAt: "asc" } })
      : Promise.resolve([]),
    prisma.approval.findMany({
      where: { botId: bot.id, ...(thread ? { threadId: thread.id } : {}) },
      orderBy: { createdAt: "asc" },
    }),
    prisma.callSession.findFirst({
      where: { botId: bot.id, status: "live" },
      orderBy: { startedAt: "desc" },
    }),
    prisma.activity.findMany({
      where: { botId: bot.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);
  const screens = getComputerAdapter().listScreens(bot.computerJson);
  const computer = parseJson<{ active?: string; url?: string }>(bot.computerJson, {});
  return {
    bot: {
      slug: bot.slug,
      name: bot.name,
      roleTitle: bot.roleTitle,
      color: bot.color,
      phone: phonePretty(bot.phone),
      phoneRaw: bot.phone,
      email: bot.email,
      paused: bot.paused,
      pausedReason: bot.pausedReason,
      memoryNotes: bot.memoryNotes,
      spentCents: bot.spentCents,
      monthlyCapCents: bot.monthlyCapCents,
      spentLabel: dollars(bot.spentCents),
      capLabel: dollars(bot.monthlyCapCents),
      instructions: bot.instructions,
      orgoStatus: bot.orgoStatus,
      orgoComputerId: bot.orgoComputerId,
      phoneDeviceId: bot.phoneDeviceId,
      phoneProvider: bot.phoneProvider,
      accounts: (() => {
        try {
          const parsed = JSON.parse(bot.accountsJson) as { name?: string; status?: string }[];
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })(),
      composioSummary: bot.composioSummary,
      provision: (() => {
        try {
          return JSON.parse(bot.provisionJson) as { mail?: string; phone?: string; orgo?: string; composio?: string };
        } catch {
          return {};
        }
      })(),
    },
    threadId: thread?.id ?? null,
    messages: messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      meta: parseJson<{ kind?: string }>(message.metaJson, {}),
      at: formatClockWithPeriod(message.createdAt, agency.timezone),
    })),
    approvals: approvals.map((approval) => ({
      id: approval.id,
      kind: approval.kind,
      status: approval.status,
      title: approval.title,
      payload: parseJson<Record<string, string>>(approval.payloadJson, {}),
      dispatch: parseJson<{ detail?: string; sandbox?: boolean }>(approval.dispatchJson, {}),
    })),
    call: call
      ? {
          id: call.id,
          contactName: call.contactName,
          phone: phonePretty(call.phone),
          summary: call.summary,
          startedAt: call.startedAt.toISOString(),
        }
      : null,
    activities: activities.map((activity) => ({
      id: activity.id,
      text: activity.text,
      screen: activity.screen,
      at: formatClockWithPeriod(activity.createdAt, agency.timezone),
    })),
    screens,
    activeScreen: computer.active || (call ? "call" : screens[0]?.id || ""),
    screenUrl: computer.url || "",
    timezone: agency.timezone,
  };
}
