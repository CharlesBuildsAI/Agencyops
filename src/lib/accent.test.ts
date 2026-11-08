import { describe, expect, it } from "vitest";
import { accentFollowsTheme, contrastRatio, isStockAccent, tuneAccent } from "./accent";
import { THEMES } from "./theme";

describe("brand accent", () => {
  it("follows the time of day for the stock color unless the choice is explicit", () => {
    expect(isStockAccent("#e6f08a")).toBe(true);
    expect(accentFollowsTheme("#E6F08A", null)).toBe(true);
    expect(accentFollowsTheme("#1F8A4C", null)).toBe(false);
    expect(accentFollowsTheme("#1F8A4C", "theme")).toBe(true);
    expect(accentFollowsTheme("#E6F08A", "brand")).toBe(false);
  });

  it("keeps button text and white eyes readable on day and night", () => {
    for (const theme of [THEMES.day, THEMES.sunrise, THEMES.sunset, THEMES.night]) {
      for (const color of ["#E6F08A", "#C23B3B", "#1F8A4C", "#FFFFFF", "#111111"]) {
        const tuned = tuneAccent(color, theme);
        expect(contrastRatio(tuned.fill, tuned.ink)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(tuned.agent, "#FFFFFF")).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
