import type { ThemeTokens } from "./theme";

export const STOCK_ACCENT = "#E6F08A";
export const ACCENT_FOLLOW_KEY = "agencyops-accent-follow";

type RGB = { r: number; g: number; b: number };

export function normalizeHex(value: string) {
  const raw = value.trim().replace("#", "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw.split("").map((char) => char + char).join("").toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return STOCK_ACCENT;
}

export function isStockAccent(value: string) {
  return normalizeHex(value) === STOCK_ACCENT;
}

/** Unset preference: stock yellow follows the time of day. Any other saved color is the brand. */
export function accentFollowsTheme(accent: string, stored: string | null) {
  if (stored === "theme") return true;
  if (stored === "brand") return false;
  return isStockAccent(accent);
}

function rgb(hex: string): RGB {
  const n = parseInt(normalizeHex(hex).slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function channel(value: number) {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string) {
  const { r, g, b } = rgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string) {
  const left = luminance(a);
  const right = luminance(b);
  const hi = Math.max(left, right);
  const lo = Math.min(left, right);
  return (hi + 0.05) / (lo + 0.05);
}

function rgbToHsl({ r, g, b }: RGB) {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === R) h = (G - B) / d + (G < B ? 6 : 0);
  else if (max === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  return { h: (h / 6) * 360, s, l };
}

function hue(p: number, q: number, t: number) {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function hslToHex(h: number, s: number, l: number) {
  const H = ((h % 360) + 360) % 360 / 360;
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue(p, q, H + 1 / 3);
    g = hue(p, q, H);
    b = hue(p, q, H - 1 / 3);
  }
  const hex = [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
  return `#${hex.toUpperCase()}`;
}

function withLightness(hex: string, l: number) {
  const hsl = rgbToHsl(rgb(hex));
  return hslToHex(hsl.h, hsl.s, Math.min(0.94, Math.max(0.08, l)));
}

function darkenUntil(hex: string, against: string, min: number) {
  const hsl = rgbToHsl(rgb(hex));
  let l = hsl.l;
  let current = hex;
  while (contrastRatio(current, against) < min && l > 0.08) {
    l -= 0.02;
    current = hslToHex(hsl.h, hsl.s, l);
  }
  return current;
}

export type TunedAccent = {
  fill: string;
  fill2: string;
  ink: string;
  agent: string;
};

/** Keep button text at 4.5:1 and white eyes on the agent at 3:1, per theme. */
export function tuneAccent(hex: string, theme: ThemeTokens): TunedAccent {
  const start = normalizeHex(hex);
  const white = "#FFFFFF";
  let fill = start;
  let ink = white;
  const onWhite = contrastRatio(start, white);
  const onInk = contrastRatio(start, theme.ink);
  if (onWhite >= 4.5) {
    fill = start;
    ink = white;
  } else if (onInk >= 4.5 && luminance(start) > luminance(theme.ink)) {
    fill = start;
    ink = theme.ink;
  } else {
    fill = darkenUntil(start, white, 4.5);
    ink = white;
    if (contrastRatio(fill, white) < 4.5) {
      const hsl = rgbToHsl(rgb(start));
      let l = hsl.l;
      fill = start;
      while (contrastRatio(fill, theme.ink) < 4.5 && l < 0.92) {
        l += 0.02;
        fill = hslToHex(hsl.h, hsl.s, l);
      }
      ink = theme.ink;
    }
  }
  if (contrastRatio(fill, theme.radial) < 2.4) {
    const away = luminance(theme.radial) > 0.5 ? -0.12 : 0.12;
    const hsl = rgbToHsl(rgb(fill));
    const nudged = withLightness(fill, hsl.l + away);
    if (contrastRatio(nudged, ink) >= 4.5) fill = nudged;
  }
  const hsl = rgbToHsl(rgb(fill));
  const fill2 = withLightness(fill, hsl.l - 0.08);
  const agent = darkenUntil(fill, white, 3);
  return { fill, fill2, ink, agent };
}

const SHIFTS: Record<string, number> = {
  penny: 0,
  ivy: 0.04,
  quinn: -0.03,
  reed: 0.05,
  sage: -0.05,
  gale: 0.07,
};

export function shadeAgent(base: string, slug?: string) {
  const hsl = rgbToHsl(rgb(base));
  const shifted = withLightness(base, hsl.l + (slug ? SHIFTS[slug] ?? 0 : 0));
  return darkenUntil(shifted, "#FFFFFF", 3);
}

export function applyAccent(tuned: TunedAccent) {
  const root = document.documentElement;
  root.style.setProperty("--action", tuned.fill);
  root.style.setProperty("--action-2", tuned.fill2);
  root.style.setProperty("--accent", tuned.fill);
  root.style.setProperty("--accent-ink", tuned.ink);
  root.style.setProperty("--agent", tuned.agent);
}
