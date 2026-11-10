import { describe, expect, it } from "vitest";
import { contrastRatio } from "./accent";
import { periodAt, solarMinutes, themeAtMinute, THEMES, type ThemeTokens } from "./theme";

function channel(hex: string) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
}

function over(paint: string, base: string) {
  const match = paint.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (!match) return paint;
  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  const back = channel(base);
  const mixed = [1, 2, 3].map((index, slot) => Math.round(Number(match[index]) * alpha + back[slot] * (1 - alpha)));
  return `#${mixed.map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

function surfaces(theme: ThemeTokens) {
  return [over(theme.solid, theme.radial), over(theme.glass, theme.radial), over(theme.glass, theme.g0), over(theme.chip, theme.radial)];
}

describe("time of day", () => {
  it("uses the fixed local schedule away from the boundaries", () => {
    expect(periodAt(6 * 60, [
      { name: "sunrise", start: 5 * 60 },
      { name: "day", start: 8 * 60 },
      { name: "sunset", start: 17 * 60 },
      { name: "night", start: 20 * 60 },
    ])).toBe("sunrise");
    expect(themeAtMinute(10 * 60).name).toBe("day");
    expect(themeAtMinute(18 * 60 + 30).name).toBe("sunset");
    expect(themeAtMinute(22 * 60).name).toBe("night");
    expect(themeAtMinute(3 * 60).name).toBe("night");
  });

  it("is halfway between sunrise and day at 8:00", () => {
    const resolved = themeAtMinute(8 * 60);
    expect(resolved.blending).toBe(true);
    expect(resolved.tokens.ink).not.toBe(THEMES.sunrise.ink);
    expect(resolved.tokens.ink).not.toBe(THEMES.day.ink);
  });

  it("returns a daytime solar pair for a mid-latitude summer date", () => {
    const solar = solarMinutes(new Date("2026-06-21T12:00:00"), 39.7, -104.9);
    expect(solar).not.toBeNull();
    expect(solar!.sunset - solar!.sunrise).toBeGreaterThan(8 * 60);
    expect(solar!.sunrise).toBeGreaterThan(0);
    expect(solar!.sunset).toBeLessThan(48 * 60);
  });

  it("keeps ink, muted, and faint text above 4.5:1 on every theme surface", () => {
    for (const theme of Object.values(THEMES)) {
      for (const surface of surfaces(theme)) {
        expect(contrastRatio(theme.ink, surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(theme.muted, surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(theme.faint, surface)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
