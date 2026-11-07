import type { LlmProvider, LlmRequest, LlmResult, ToolCall } from "./types";

function result(text: string, toolCalls: ToolCall[], tokensIn: number, tokensOut: number): LlmResult {
  return {
    text,
    toolCalls,
    tokensIn,
    tokensOut,
    provider: "mock",
    model: "agencyops-mock",
  };
}

export class MockProvider implements LlmProvider {
  readonly id = "mock";
  readonly model = "agencyops-mock";

  async complete(request: LlmRequest): Promise<LlmResult> {
    const last = request.messages[request.messages.length - 1]?.content ?? "";
    if (last.startsWith("Tool results:")) {
      return result("Drafted an SMS confirmation. Needs your yes before I send.", [], 700, 80);
    }
    if (/dana chen/i.test(last) && /rav4|auto quote|80205/i.test(last)) {
      return result("On it. Calling her back from my number now.", danaTools(), 900, 260);
    }
    if (/\b(text|sms)\b/i.test(last)) {
      return result("I drafted a text. It waits for your yes.", [
        {
          id: "mock_sms",
          name: "draft_sms",
          input: {
            to: "+17205550198",
            contactName: "Customer",
            body: "Hi — this is the desk at the agency. Reply here and a person will follow up.",
          },
        },
      ], 200, 80);
    }
    if (/\b(email|e-mail)\b/i.test(last)) {
      return result("I drafted an email for you to review.", [
        {
          id: "mock_email",
          name: "draft_email",
          input: {
            to: "customer@example.com",
            subject: "Following up",
            body: "Hi — following up from the agency. A licensed agent can take the next step.",
            ready: true,
          },
        },
      ], 200, 80);
    }
    const name = /you are ([a-z]+)/i.exec(request.system)?.[1] ?? "I";
    return result(
      `${name === "I" ? "I" : name.charAt(0).toUpperCase() + name.slice(1)} can collect the details and draft the next step. I won't send anything, and I won't give coverage advice.`,
      [],
      180,
      60,
    );
  }
}

function danaTools(): ToolCall[] {
  return [
    { id: "dana_status", name: "note_status", input: { text: "42s · Phone call started" } },
    {
      id: "dana_transcript",
      name: "add_transcript",
      input: {
        text: "Dana wants liability + comprehensive on a 2024 RAV4, zip 80205. I pulled her prior Progressive policy from the thread Ivy filed yesterday.",
      },
    },
    {
      id: "dana_sms",
      name: "draft_sms",
      input: {
        to: "+17205550198",
        contactName: "Dana Chen",
        body: "Hi Dana — Penny at Rivera Insurance. Got everything for your RAV4 quote. Prefer a call this afternoon, or should I text the options?",
      },
    },
    {
      id: "dana_email",
      name: "draft_email",
      input: {
        to: "dana.chen@example.com",
        subject: "Auto quote next steps",
        body: "Hi Dana — attached is the ACORD intake checklist for the 2024 RAV4. A licensed agent will price it. Nothing is bound.",
        attachment: "ACORD intake checklist",
        ready: false,
      },
    },
    {
      id: "dana_log",
      name: "log_activity",
      input: {
        screen: "call",
        text: "Taking Dana's RAV4 intake. Handing missing prior-carrier fields to Ivy when done.",
      },
    },
    {
      id: "dana_memory",
      name: "save_memory",
      input: {
        note: "Dana Chen, +1 (720) 555-0198, 2024 RAV4, zip 80205, asked about liability and comprehensive. Prior Progressive policy. Do not quote or bind.",
      },
    },
  ];
}
