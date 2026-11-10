import { secret } from "../runtime-secrets";
import type { LlmProvider, LlmRequest, LlmResult, ToolCall } from "./types";

type OpenAiMessage = {
  content?: string | null;
  tool_calls?: {
    id: string;
    function: { name: string; arguments: string };
  }[];
};

export class OpenAiProvider implements LlmProvider {
  readonly id = "openai";
  readonly model: string;

  constructor(model = process.env.OPENAI_MODEL || "gpt-4.1-mini") {
    this.model = model;
  }

  async complete(request: LlmRequest): Promise<LlmResult> {
    const key = secret("OPENAI_API_KEY");
    if (!key) throw new Error("OPENAI_API_KEY is not set");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: request.system },
          ...request.messages.map((message) => ({ role: message.role, content: message.content })),
        ],
        tools: request.tools.map((tool) => ({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        })),
      }),
    });
    const payload = (await response.json()) as {
      error?: { message?: string };
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      choices?: { message?: OpenAiMessage }[];
    };
    if (!response.ok) {
      throw new Error(payload.error?.message || `OpenAI returned ${response.status}`);
    }
    const message = payload.choices?.[0]?.message;
    const toolCalls: ToolCall[] = (message?.tool_calls ?? []).map((call) => {
      let input: Record<string, unknown> = {};
      try {
        input = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
      } catch {
        input = {};
      }
      return { id: call.id, name: call.function.name, input };
    });
    return {
      text: (message?.content ?? "").trim(),
      toolCalls,
      tokensIn: payload.usage?.prompt_tokens ?? 0,
      tokensOut: payload.usage?.completion_tokens ?? 0,
      provider: "openai",
      model: this.model,
    };
  }
}
