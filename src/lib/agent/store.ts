import type { AgentDeps } from "./loop";
import { prisma } from "../db";
import { getProvider } from "../llm";
import type { LlmProvider } from "../llm/types";
import { chargeUsage } from "../usage";

export function makePrismaDeps(
  ctx: {
    agencyId: string;
    botId: string;
    threadId: string;
    timeZone: string;
    actorName: string;
  },
  provider: LlmProvider = getProvider(),
): AgentDeps {
  return {
    provider,
    async recordUsage(usage) {
      await chargeUsage({ ...usage, agencyId: ctx.agencyId, botId: ctx.botId, timeZone: ctx.timeZone });
    },
    async createApproval(approval) {
      const row = await prisma.approval.create({
        data: {
          agencyId: ctx.agencyId,
          botId: ctx.botId,
          threadId: ctx.threadId,
          kind: approval.kind,
          status: approval.status,
          title: approval.title,
          payloadJson: JSON.stringify(approval.payload),
        },
      });
      await prisma.thread.update({ where: { id: ctx.threadId }, data: { updatedAt: new Date() } });
      return { id: row.id };
    },
    async addMessage(message) {
      await prisma.message.create({
        data: {
          agencyId: ctx.agencyId,
          botId: ctx.botId,
          threadId: ctx.threadId,
          role: message.role,
          content: message.content,
          metaJson: JSON.stringify(message.meta ?? {}),
        },
      });
      await prisma.thread.update({ where: { id: ctx.threadId }, data: { updatedAt: new Date() } });
    },
    async addActivity(activity) {
      await prisma.activity.create({
        data: {
          agencyId: ctx.agencyId,
          botId: ctx.botId,
          text: activity.text,
          screen: activity.screen ?? "",
        },
      });
    },
    async audit(entry) {
      await prisma.auditLog.create({
        data: {
          agencyId: ctx.agencyId,
          actorType: "bot",
          actorId: ctx.botId,
          actorName: ctx.actorName,
          action: entry.action,
          target: entry.target ?? "",
          detail: entry.detail ?? "",
        },
      });
    },
    async saveMemory(note) {
      const bot = await prisma.bot.findUniqueOrThrow({ where: { id: ctx.botId } });
      const next = bot.memoryNotes.trim() ? `${bot.memoryNotes.trim()}\n${note}` : note;
      await prisma.bot.update({ where: { id: ctx.botId }, data: { memoryNotes: next } });
    },
    async fileTask(task) {
      await prisma.task.create({
        data: {
          agencyId: ctx.agencyId,
          botId: ctx.botId,
          title: task.title,
          detail: task.detail,
          needsYou: task.needsYou,
          queue: task.needsYou,
        },
      });
    },
    async handoff(handoff) {
      const target = await prisma.bot.findFirst({
        where: { agencyId: ctx.agencyId, slug: handoff.botSlug },
      });
      if (!target) return;
      const thread = await prisma.thread.create({
        data: {
          agencyId: ctx.agencyId,
          botId: target.id,
          title: `Handoff from ${ctx.actorName}`,
          channel: "chat",
          contactName: "",
        },
      });
      await prisma.message.create({
        data: {
          agencyId: ctx.agencyId,
          botId: target.id,
          threadId: thread.id,
          role: "system",
          content: handoff.summary,
          metaJson: JSON.stringify({ kind: "handoff" }),
        },
      });
      await prisma.bot.update({
        where: { id: target.id },
        data: { statusLine: `Handoff from ${ctx.actorName}`, statusAt: new Date() },
      });
    },
  };
}
