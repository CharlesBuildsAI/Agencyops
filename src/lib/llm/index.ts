import { secret } from "../runtime-secrets";
import { AnthropicProvider } from "./anthropic";
import { MockProvider } from "./mock";
import { OpenAiProvider } from "./openai";
import type { LlmProvider } from "./types";

export function getProvider(): LlmProvider {
  const preference = (process.env.LLM_PROVIDER || "auto").toLowerCase();
  if (preference === "mock") return new MockProvider();
  if (preference === "anthropic" || (preference === "auto" && secret("ANTHROPIC_API_KEY"))) {
    return new AnthropicProvider();
  }
  if (preference === "openai" || (preference === "auto" && secret("OPENAI_API_KEY"))) {
    return new OpenAiProvider();
  }
  return new MockProvider();
}

export function providerLabel() {
  const provider = getProvider();
  return provider.id === "mock" ? "Mock model" : `${provider.id} · ${provider.model}`;
}
