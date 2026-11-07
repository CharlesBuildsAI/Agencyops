import { describe, expect, it } from "vitest";
import { guardOutboundText } from "./guardrails";
import { MockProvider } from "./llm/mock";
import { runAgentTurn, type AgentDeps, type BotRunState } from "./agent/loop";
import { BudgetExceededError } from "./budget";
import type { LlmProvider } from "./llm/types";

const bot: BotRunState = {
  slug: "penny",
  name: "Penny",
  roleTitle: "Front desk",
  instructions: "Answer the phone. Never give coverage advice or bind.",
  memoryNotes: "",
  phone: "+13035550142",
  email: "penny@rivera.agencyops",
  paused: false,
  pausedReason: "",
  spentCents: 0,
  monthlyCapCents: 12000,
};

function memoryDeps(provider: LlmProvider): AgentDeps & { messages: { content: string }[]; approvals: { kind: string; status: string }[] } {
  const messages: { content: string }[] = [];
  const approvals: { kind: string; status: string }[] = [];
  return {
    provider,
    messages,
    approvals,
    async recordUsage() {},
    async createApproval(approval) {
      approvals.push(approval);
      return { id: `ap_${approvals.length}` };
    },
    async addMessage(message) {
      messages.push(message);
    },
    async addActivity() {},
    async audit() {},
    async saveMemory() {},
    async fileTask() {},
    async handoff() {},
  };
}

describe("guardrails", () => {
  it("replaces coverage advice and binding language", () => {
    const advice = guardOutboundText("You should buy full coverage and I will bind the policy today.");
    expect(advice.blocked).toBe(true);
    expect(advice.text.toLowerCase()).not.toContain("bind the policy");
    expect(advice.text.toLowerCase()).toContain("licensed");
  });

  it("blocks a model that tries to give advice before the text is stored", async () => {
    const provider: LlmProvider = {
      id: "fake",
      model: "fake",
      async complete() {
        return {
          text: "I recommend this coverage and the final premium is $1,200. I will bind the policy.",
          toolCalls: [],
          tokensIn: 20,
          tokensOut: 20,
          provider: "mock",
          model: "fake",
        };
      },
    };
    const deps = memoryDeps(provider);
    await runAgentTurn({
      bot,
      agency: { name: "Rivera Insurance", spentCents: 0, monthlyCapCents: 50000 },
      history: [{ role: "user", content: "What coverage should I buy?" }],
      deps,
    });
    expect(deps.messages[0]?.content.toLowerCase()).toContain("licensed");
    expect(deps.messages[0]?.content.toLowerCase()).not.toContain("final premium");
  });
});

describe("Dana demo through the agent loop", () => {
  it("drafts an SMS and does not send it", async () => {
    const deps = memoryDeps(new MockProvider());
    const result = await runAgentTurn({
      bot,
      agency: { name: "Rivera Insurance", spentCents: 0, monthlyCapCents: 50000 },
      history: [
        {
          role: "user",
          content:
            "Dana Chen just called about a new auto quote for a 2024 RAV4, zip 80205. Take the intake.",
        },
      ],
      deps,
    });
    const sms = result.approvals.find((approval) => approval.kind === "sms");
    expect(sms?.status).toBe("pending");
    expect(String(sms?.payload.body)).toContain("RAV4");
    expect(result.approvals.every((approval) => approval.status === "pending" || approval.status === "draft")).toBe(
      true,
    );
    expect(deps.messages.some((message) => /needs your yes/i.test(message.content))).toBe(true);
  });

  it("does not call the model once the bot cap is spent", async () => {
    let called = false;
    const provider: LlmProvider = {
      id: "fake",
      model: "fake",
      async complete() {
        called = true;
        throw new Error("should not run");
      },
    };
    const deps = memoryDeps(provider);
    await expect(
      runAgentTurn({
        bot: { ...bot, spentCents: 12000, monthlyCapCents: 12000 },
        agency: { name: "Rivera Insurance", spentCents: 26300, monthlyCapCents: 50000 },
        history: [{ role: "user", content: "Hello" }],
        deps,
      }),
    ).rejects.toBeInstanceOf(BudgetExceededError);
    expect(called).toBe(false);
    expect(deps.approvals).toHaveLength(0);
  });
});
