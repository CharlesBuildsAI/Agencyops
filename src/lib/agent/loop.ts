import { assertCanSpend, BudgetExceededError, llmCostCents } from "../budget";
import { guardOutboundText } from "../guardrails";
import { AGENT_TOOLS } from "../llm/tools";
import type { ChatTurn, LlmProvider, ToolCall } from "../llm/types";
import { buildSystemPrompt, type PromptBot } from "./prompt";

export type BotRunState = PromptBot & {
  slug: string;
  paused: boolean;
  pausedReason: string;
  spentCents: number;
  monthlyCapCents: number;
};

export type AgencyRunState = {
  name: string;
  spentCents: number;
  monthlyCapCents: number;
};

export type CreatedApproval = {
  id: string;
  kind: string;
  status: "pending" | "draft";
  title: string;
  payload: Record<string, unknown>;
};

export type AgentDeps = {
  provider: LlmProvider;
  recordUsage: (usage: {
    provider: string;
    model: string;
    tokensIn: number;
    tokensOut: number;
    costCents: number;
  }) => Promise<void>;
  createApproval: (approval: Omit<CreatedApproval, "id">) => Promise<{ id: string }>;
  addMessage: (message: {
    role: "assistant" | "system";
    content: string;
    meta?: Record<string, unknown>;
  }) => Promise<void>;
  addActivity: (activity: { text: string; screen?: string }) => Promise<void>;
  audit: (entry: { action: string; detail?: string; target?: string }) => Promise<void>;
  saveMemory: (note: string) => Promise<void>;
  fileTask: (task: { title: string; detail: string; needsYou: boolean }) => Promise<void>;
  handoff: (handoff: { botSlug: string; summary: string }) => Promise<void>;
};

export type AgentRunResult = {
  stopped?: "paused" | "error";
  text: string;
  approvals: CreatedApproval[];
};

function textField(input: Record<string, unknown>, key: string) {
  const value = input[key];
  return typeof value === "string" ? value : "";
}

async function executeTool(call: ToolCall, deps: AgentDeps, approvals: CreatedApproval[]) {
  const input = call.input ?? {};
  const guardedFields = ["body", "text", "purpose", "note", "summary", "detail", "subject"].map((key) =>
    textField(input, key),
  );
  for (const field of guardedFields) {
    if (!field) continue;
    const guarded = guardOutboundText(field);
    if (guarded.blocked && guarded.reason !== "claimed-send") {
      await deps.audit({ action: "guardrail.blocked", detail: `${call.name}: ${guarded.reason}` });
      return JSON.stringify({
        ok: false,
        error: "Blocked. Remove coverage advice and binding language, then draft intake notes only.",
      });
    }
  }

  switch (call.name) {
    case "draft_sms": {
      const payload = {
        to: textField(input, "to"),
        contactName: textField(input, "contactName"),
        body: textField(input, "body"),
      };
      const title = `SMS to ${payload.contactName || payload.to}`;
      const created = await deps.createApproval({ kind: "sms", status: "pending", title, payload });
      approvals.push({ id: created.id, kind: "sms", status: "pending", title, payload });
      await deps.audit({ action: "approval.created", target: created.id, detail: `sms ${payload.to}` });
      return JSON.stringify({ ok: true, approvalId: created.id, status: "pending", sent: false });
    }
    case "draft_email": {
      const ready = input.ready !== false;
      const payload = {
        to: textField(input, "to"),
        subject: textField(input, "subject"),
        body: textField(input, "body"),
        attachment: textField(input, "attachment"),
      };
      const status = ready ? "pending" : "draft";
      const title = payload.subject || "Email draft";
      const created = await deps.createApproval({ kind: "email", status, title, payload });
      approvals.push({ id: created.id, kind: "email", status, title, payload });
      await deps.audit({ action: "approval.created", target: created.id, detail: `email ${payload.to} ${status}` });
      return JSON.stringify({ ok: true, approvalId: created.id, status, sent: false });
    }
    case "draft_call": {
      const payload = {
        to: textField(input, "to"),
        contactName: textField(input, "contactName"),
        purpose: textField(input, "purpose"),
      };
      const title = `Call ${payload.contactName || payload.to}`;
      const created = await deps.createApproval({ kind: "call", status: "pending", title, payload });
      approvals.push({ id: created.id, kind: "call", status: "pending", title, payload });
      await deps.audit({ action: "approval.created", target: created.id, detail: `call ${payload.to}` });
      return JSON.stringify({ ok: true, approvalId: created.id, status: "pending", sent: false });
    }
    case "note_status": {
      const text = textField(input, "text");
      await deps.addMessage({ role: "system", content: text, meta: { kind: "status" } });
      return JSON.stringify({ ok: true });
    }
    case "add_transcript": {
      const text = textField(input, "text");
      await deps.addMessage({ role: "assistant", content: text, meta: { kind: "transcript" } });
      return JSON.stringify({ ok: true });
    }
    case "log_activity": {
      await deps.addActivity({ text: textField(input, "text"), screen: textField(input, "screen") });
      return JSON.stringify({ ok: true });
    }
    case "save_memory": {
      await deps.saveMemory(textField(input, "note"));
      return JSON.stringify({ ok: true });
    }
    case "handoff": {
      await deps.handoff({ botSlug: textField(input, "botSlug"), summary: textField(input, "summary") });
      return JSON.stringify({ ok: true, sent: false });
    }
    case "file_task": {
      await deps.fileTask({
        title: textField(input, "title"),
        detail: textField(input, "detail"),
        needsYou: input.needsYou === true,
      });
      return JSON.stringify({ ok: true });
    }
    default:
      return JSON.stringify({ ok: false, error: `Unknown tool ${call.name}` });
  }
}

export async function runAgentTurn(input: {
  bot: BotRunState;
  agency: AgencyRunState;
  history: ChatTurn[];
  deps: AgentDeps;
}): Promise<AgentRunResult> {
  const { bot, agency, deps } = input;
  if (bot.paused) {
    const text = `${bot.name} is paused. ${bot.pausedReason || "Resume them before assigning more work."}`;
    await deps.addMessage({ role: "assistant", content: text });
    return { stopped: "paused", text, approvals: [] };
  }

  assertCanSpend({
    botSpentCents: bot.spentCents,
    botCapCents: bot.monthlyCapCents,
    agencySpentCents: agency.spentCents,
    agencyCapCents: agency.monthlyCapCents,
  });

  const system = buildSystemPrompt(bot, agency.name);
  const messages: ChatTurn[] = [...input.history];
  const approvals: CreatedApproval[] = [];
  let lastText = "";

  try {
    for (let round = 0; round < 3; round += 1) {
      const completion = await deps.provider.complete({ system, messages, tools: AGENT_TOOLS });
      const costCents = llmCostCents(completion.provider, completion.tokensIn, completion.tokensOut);
      await deps.recordUsage({
        provider: completion.provider,
        model: completion.model,
        tokensIn: completion.tokensIn,
        tokensOut: completion.tokensOut,
        costCents,
      });
      const guarded = guardOutboundText(completion.text);
      if (guarded.blocked) {
        await deps.audit({ action: "guardrail.blocked", detail: guarded.reason });
      }
      lastText = guarded.text;
      if (completion.toolCalls.length === 0 || round === 2) {
        if (lastText) await deps.addMessage({ role: "assistant", content: lastText });
        if (round === 2 && completion.toolCalls.length > 0) {
          for (const call of completion.toolCalls) {
            await executeTool(call, deps, approvals);
          }
        }
        break;
      }
      if (lastText) await deps.addMessage({ role: "assistant", content: lastText });
      const toolResults = [];
      for (const call of completion.toolCalls) {
        const output = await executeTool(call, deps, approvals);
        toolResults.push({ tool: call.name, output });
      }
      messages.push({ role: "assistant", content: lastText || "Working through the tools." });
      messages.push({ role: "user", content: `Tool results:\n${JSON.stringify(toolResults)}` });
    }
  } catch (error) {
    if (error instanceof BudgetExceededError) throw error;
    const message = error instanceof Error ? error.message : "Model request failed";
    const text = `I couldn't reach the model (${message}). Nothing was sent.`;
    await deps.addMessage({ role: "assistant", content: text });
    await deps.audit({ action: "llm.error", detail: message });
    return { stopped: "error", text, approvals };
  }

  return { text: lastText, approvals };
}
