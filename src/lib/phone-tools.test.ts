import { describe, expect, it } from "vitest";
import { runAgentTurn, type AgentDeps, type BotRunState } from "./agent/loop";
import type { LlmProvider, LlmResult } from "./llm/types";

const bot: BotRunState = {
  slug: "ada",
  name: "Ada",
  roleTitle: "Front desk",
  instructions: "Use the phone.",
  memoryNotes: "",
  phone: "",
  email: "",
  paused: false,
  pausedReason: "",
  spentCents: 0,
  monthlyCapCents: 10000,
};

function deps(toolCalls: LlmResult["toolCalls"]): AgentDeps & { approvals: { kind: string; title: string; payload: Record<string, unknown> }[]; phones: string[] } {
  const approvals: { kind: string; title: string; payload: Record<string, unknown> }[] = [];
  const phones: string[] = [];
  let rounds = 0;
  const provider: LlmProvider = {
    id: "fake",
    model: "fake",
    async complete() {
      rounds += 1;
      return {
        text: "Working on the phone.",
        toolCalls: rounds === 1 ? toolCalls : [],
        tokensIn: 1,
        tokensOut: 1,
        provider: "mock",
        model: "fake",
      };
    },
  };
  return {
    provider,
    approvals,
    phones,
    async recordUsage() {},
    async createApproval(approval) {
      approvals.push(approval);
      return { id: "ap" };
    },
    async addMessage() {},
    async addActivity() {},
    async audit() {},
    async saveMemory() {},
    async fileTask() {},
    async handoff() {},
    async runPhone(command) {
      phones.push(command.op);
      return { ok: true, detail: "done", sandbox: false };
    },
  };
}

describe("phone tools", () => {
  it("asks before installing an app", async () => {
    const used = deps([{ id: "1", name: "install_app", input: { packageName: "com.whatsapp", via: "api", name: "WhatsApp" } }]);
    await runAgentTurn({ bot, agency: { name: "Northwind", spentCents: 0, monthlyCapCents: 50000 }, history: [], deps: used });
    expect(used.approvals[0]?.kind).toBe("phone");
    expect(used.approvals[0]?.title).toContain("WhatsApp");
    expect(used.phones).toEqual([]);
  });

  it("asks before a tap that would pay", async () => {
    const used = deps([{ id: "1", name: "tap", input: { x: 10, y: 20, commits: "pay" } }]);
    await runAgentTurn({ bot, agency: { name: "Northwind", spentCents: 0, monthlyCapCents: 50000 }, history: [], deps: used });
    expect(used.approvals[0]?.title).toContain("pay");
    expect(used.phones).toEqual([]);
  });

  it("reads and taps the phone when nothing is sent", async () => {
    const used = deps([
      { id: "1", name: "observe", input: {} },
      { id: "2", name: "tap", input: { x: 4, y: 5 } },
      { id: "3", name: "phone_key", input: { key: "back" } },
    ]);
    await runAgentTurn({ bot, agency: { name: "Northwind", spentCents: 0, monthlyCapCents: 50000 }, history: [], deps: used });
    expect(used.approvals).toEqual([]);
    expect(used.phones).toEqual(["observe", "tap", "key"]);
  });
});
