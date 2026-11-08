import { describe, expect, it } from "vitest";
import { periodAt, solarMinutes, themeAtMinute, THEMES } from "./theme";

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
});
