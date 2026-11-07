export class BudgetExceededError extends Error {
  readonly scope: "bot" | "agency";
  readonly spentCents: number;
  readonly capCents: number;

  constructor(scope: "bot" | "agency", spentCents: number, capCents: number) {
    const spent = formatCap(spentCents);
    const cap = formatCap(capCents);
    super(
      scope === "bot"
        ? `Monthly cap reached. This bot has spent ${spent} of ${cap}. Hard stop — nothing else runs until next month or you raise the cap.`
        : `Workspace cap reached. The agency has spent ${spent} of ${cap}. Hard stop.`,
    );
    this.name = "BudgetExceededError";
    this.scope = scope;
    this.spentCents = spentCents;
    this.capCents = capCents;
  }
}

function formatCap(cents: number) {
  return `$${Math.round(cents / 100)}`;
}

export function assertCanSpend(input: {
  botSpentCents: number;
  botCapCents: number;
  agencySpentCents: number;
  agencyCapCents: number;
  additionCents?: number;
}) {
  const addition = input.additionCents ?? 0;
  if (input.botSpentCents >= input.botCapCents || input.botSpentCents + addition > input.botCapCents) {
    throw new BudgetExceededError("bot", input.botSpentCents, input.botCapCents);
  }
  if (
    input.agencySpentCents >= input.agencyCapCents ||
    input.agencySpentCents + addition > input.agencyCapCents
  ) {
    throw new BudgetExceededError("agency", input.agencySpentCents, input.agencyCapCents);
  }
}

const RATES: Record<string, { input: number; output: number }> = {
  anthropic: { input: 3, output: 15 },
  openai: { input: 0.4, output: 1.6 },
  mock: { input: 0.5, output: 1.5 },
};

/** Cents, rounded up. Any non-zero token use costs at least one cent. Rates are USD per million tokens. */
export function llmCostCents(provider: string, tokensIn: number, tokensOut: number) {
  if (tokensIn + tokensOut <= 0) return 0;
  const rate = RATES[provider] ?? RATES.mock;
  const dollars = (tokensIn / 1_000_000) * rate.input + (tokensOut / 1_000_000) * rate.output;
  return Math.max(1, Math.ceil(dollars * 100));
}
