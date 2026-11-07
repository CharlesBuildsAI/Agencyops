import { describe, expect, it } from "vitest";
import { assertCanSpend, BudgetExceededError, llmCostCents } from "./budget";

const under = {
  botSpentCents: 4800,
  botCapCents: 12000,
  agencySpentCents: 26300,
  agencyCapCents: 50000,
};

describe("budget cap", () => {
  it("allows work under both caps", () => {
    expect(() => assertCanSpend(under)).not.toThrow();
  });

  it("hard-stops when the bot is already at its cap", () => {
    expect(() => assertCanSpend({ ...under, botSpentCents: 12000 })).toThrow(BudgetExceededError);
  });

  it("hard-stops when the next charge would pass the bot cap", () => {
    expect(() => assertCanSpend({ ...under, botSpentCents: 11900, additionCents: 200 })).toThrow(
      /Hard stop/,
    );
  });

  it("hard-stops at the workspace cap even if the bot has room", () => {
    try {
      assertCanSpend({ ...under, agencySpentCents: 50000 });
      throw new Error("expected a throw");
    } catch (error) {
      expect(error).toBeInstanceOf(BudgetExceededError);
      expect((error as BudgetExceededError).scope).toBe("agency");
    }
  });

  it("lets a charge land exactly on the cap", () => {
    expect(() => assertCanSpend({ ...under, botSpentCents: 11900, additionCents: 100 })).not.toThrow();
  });

  it("charges at least one cent for any model tokens", () => {
    expect(llmCostCents("mock", 10, 10)).toBeGreaterThanOrEqual(1);
    expect(llmCostCents("mock", 0, 0)).toBe(0);
  });
});
