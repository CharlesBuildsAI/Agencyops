import { secret } from "../runtime-secrets";
import type { LlmProvider, LlmRequest, LlmResult, ToolCall } from "./types";

type AnthropicBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };

export class AnthropicProvider implements LlmProvider {
  readonly id = "anthropic";
  readonly model: string;

  constructor(model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5") {
    this.model = model;
  }

  async complete(request: LlmRequest): Promise<LlmResult> {
    const key = secret("ANTHROPIC_API_KEY");
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 900,
        system: request.system,
        tools: request.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.parameters,
        })),
        messages: request.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      }),
    });
    const payload = (await response.json()) as {
      error?: { message?: string };
      content?: AnthropicBlock[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    if (!response.ok) {
      throw new Error(payload.error?.message || `Anthropic returned ${response.status}`);
    }
    const blocks = payload.content ?? [];
    const text = blocks
      .filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    const toolCalls: ToolCall[] = blocks
      .filter((block): block is Extract<AnthropicBlock, { type: "tool_use" }> => block.type === "tool_use")
      .map((block) => ({ id: block.id, name: block.name, input: block.input ?? {} }));
    return {
      text,
      toolCalls,
      tokensIn: payload.usage?.input_tokens ?? 0,
      tokensOut: payload.usage?.output_tokens ?? 0,
      provider: "anthropic",
      model: this.model,
    };
  }
}
