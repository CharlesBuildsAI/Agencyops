export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ToolDef = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export type ToolCall = {
  id: string;
  name: string;
  input: Record<string, unknown>;
};

export type LlmResult = {
  text: string;
  toolCalls: ToolCall[];
  tokensIn: number;
  tokensOut: number;
  provider: string;
  model: string;
};

export type LlmRequest = {
  system: string;
  messages: ChatTurn[];
  tools: ToolDef[];
};

export interface LlmProvider {
  id: string;
  model: string;
  complete(request: LlmRequest): Promise<LlmResult>;
}
