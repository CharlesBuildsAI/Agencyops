export type ThemeName = "sunrise" | "day" | "sunset" | "night";
export type ThemeChoice = "auto" | ThemeName;

export type ThemeTokens = {
  g0: string;
  g1: string;
  g2: string;
  g3: string;
  radial: string;
  glass: string;
  chip: string;
  solid: string;
  ink: string;
  muted: string;
  faint: string;
  shadow: string;
  action: string;
  action2: string;
  rim: string;
  field: string;
  star: string;
};

type Rgba = { r: number; g: number; b: number; a: number };

const THEME_ORDER: ThemeName[] = ["sunrise", "day", "sunset", "night"];

export const THEMES: Record<ThemeName, ThemeTokens> = {
  sunrise: {
    g0: "#B7CDE3",
    g1: "#FFE9C7",
    g2: "#EDBB8E",
    g3: "#BB8977",
    radial: "#FFF9E9",
    glass: "rgba(255,255,255,0.78)",
    chip: "rgba(255,255,255,0.62)",
    solid: "rgba(255,255,255,0.92)",
    ink: "#49332D",
    muted: "#6E5348",
    faint: "#8A6E60",
    shadow: "rgba(165,103,67,0.28)",
    action: "#B45C29",
    action2: "#984622",
    rim: "rgba(255,255,255,0.95)",
    field: "rgba(255,255,255,0.72)",
    star: "0.12",
  },
  day: {
    g0: "#8AD4EE",
    g1: "#B29FCB",
    g2: "#4263AA",
    g3: "#304C90",
    radial: "#EEF1FD",
    glass: "rgba(255,255,255,0.78)",
    chip: "rgba(255,255,255,0.58)",
    solid: "rgba(255,255,255,0.94)",
    ink: "#17345E",
    muted: "#3E5A86",
    faint: "#5E7598",
    shadow: "rgba(25,58,135,0.22)",
    action: "#557AE7",
    action2: "#2F4FB9",
    rim: "rgba(255,255,255,0.95)",
    field: "rgba(255,255,255,0.74)",
    star: "0.08",
  },
  sunset: {
    g0: "#EDBA87",
    g1: "#D58C70",
    g2: "#AA707E",
    g3: "#655486",
    radial: "#FFEBD4",
    glass: "rgba(255,255,255,0.76)",
    chip: "rgba(255,255,255,0.55)",
    solid: "rgba(255,252,248,0.92)",
    ink: "#49203B",
    muted: "#6E4458",
    faint: "#8A6474",
    shadow: "rgba(117,66,90,0.28)",
    action: "#B9582F",
    action2: "#BE3E20",
    rim: "rgba(255,255,255,0.95)",
    field: "rgba(255,255,255,0.7)",
    star: "0.1",
  },
  night: {
    g0: "#1B2D54",
    g1: "#17234A",
    g2: "#0D1936",
    g3: "#080F24",
    radial: "#485D96",
    glass: "rgba(16,33,63,0.52)",
    chip: "rgba(22,42,82,0.55)",
    solid: "rgba(36,58,104,0.72)",
    ink: "#F4FBFF",
    muted: "#E7F4FF",
    faint: "#D5E8FA",
    shadow: "rgba(3,12,32,0.45)",
    action: "#486CC5",
    action2: "#304D9F",
    rim: "rgba(129,201,243,0.55)",
    field: "rgba(10,22,48,0.45)",
    star: "0.45",
  },
};

const FIXED_STARTS: { name: ThemeName; start: number }[] = [
  { name: "sunrise", start: 5 * 60 },
  { name: "day", start: 8 * 60 },
  { name: "sunset", start: 17 * 60 },
  { name: "night", start: 20 * 60 },
];

const BLEND_MINUTES = 45;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function mod1440(value: number) {
  return ((value % 1440) + 1440) % 1440;
}

function parseColor(value: string): Rgba {
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) return { r: 0, g: 0, b: 0, a: 1 };
  const parts = match[1].split(",").map((part) => Number(part.trim()));
  return { r: parts[0] ?? 0, g: parts[1] ?? 0, b: parts[2] ?? 0, a: parts[3] ?? 1 };
}

function formatColor(color: Rgba, asAlpha: boolean) {
  const r = Math.round(color.r);
  const g = Math.round(color.g);
  const b = Math.round(color.b);
  if (asAlpha || color.a < 0.999) return `rgba(${r},${g},${b},${color.a.toFixed(3)})`;
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function mixColor(a: string, b: string, t: number) {
  const from = parseColor(a);
  const to = parseColor(b);
  const color = {
    r: from.r + (to.r - from.r) * t,
    g: from.g + (to.g - from.g) * t,
    b: from.b + (to.b - from.b) * t,
    a: from.a + (to.a - from.a) * t,
  };
  return formatColor(color, a.startsWith("rgba") || b.startsWith("rgba"));
}

export function mixThemes(from: ThemeTokens, to: ThemeTokens, t: number): ThemeTokens {
  const amount = clamp01(t);
  const mixed = {} as ThemeTokens;
  (Object.keys(from) as (keyof ThemeTokens)[]).forEach((key) => {
    if (key === "star") {
      const a = Number(from.star);
      const b = Number(to.star);
      mixed.star = (a + (b - a) * amount).toFixed(3);
      return;
    }
    mixed[key] = mixColor(from[key], to[key], amount);
  });
  return mixed;
}

function wrappedDelta(now: number, boundary: number) {
  let delta = now - boundary;
  if (delta > 720) delta -= 1440;
  if (delta < -720) delta += 1440;
  return delta;
}

export function periodAt(minute: number, starts: { name: ThemeName; start: number }[]) {
  const min = mod1440(minute);
  let name = starts[0]?.name ?? "day";
  let best = Number.POSITIVE_INFINITY;
  for (const item of starts) {
    const since = mod1440(min - item.start);
    if (since < best) {
      best = since;
      name = item.name;
    }
  }
  return name;
}

export function themeAtMinute(minute: number, starts = FIXED_STARTS, blendMinutes = BLEND_MINUTES) {
  const min = mod1440(minute);
  const half = blendMinutes / 2;
  const ordered = starts;
  for (let index = 0; index < ordered.length; index += 1) {
    const next = ordered[index];
    const prev = ordered[(index - 1 + ordered.length) % ordered.length];
    const delta = wrappedDelta(min, mod1440(next.start));
    if (Math.abs(delta) <= half) {
      const t = (delta + half) / blendMinutes;
      return {
        name: t < 0.5 ? prev.name : next.name,
        tokens: mixThemes(THEMES[prev.name], THEMES[next.name], t),
        blending: true,
      };
    }
  }
  const name = periodAt(min, ordered);
  return { name, tokens: THEMES[name], blending: false };
}

function rad(degrees: number) {
  return (degrees * Math.PI) / 180;
}
function deg(radians: number) {
  return (radians * 180) / Math.PI;
}
function norm360(value: number) {
  return ((value % 360) + 360) % 360;
}

/** NOAA-style sunrise and sunset, in minutes from local midnight. Null near the poles. */
export function solarMinutes(date: Date, lat: number, lon: number) {
  if (Math.abs(lat) > 66) return null;
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const n = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - start) / 86400000);
  const lngHour = lon / 15;
  const event = (sunrise: boolean) => {
    const t = n + ((sunrise ? 6 : 18) - lngHour) / 24;
    const M = 0.9856 * t - 3.289;
    let L = M + 1.916 * Math.sin(rad(M)) + 0.02 * Math.sin(rad(2 * M)) + 282.634;
    L = norm360(L);
    let RA = deg(Math.atan(0.91764 * Math.tan(rad(L))));
    RA = norm360(RA);
    const Lq = Math.floor(L / 90) * 90;
    const RAq = Math.floor(RA / 90) * 90;
    RA = (RA + (Lq - RAq)) / 15;
    const sinDec = 0.39782 * Math.sin(rad(L));
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(rad(90.833)) - sinDec * Math.sin(rad(lat))) / (cosDec * Math.cos(rad(lat)));
    if (cosH > 1 || cosH < -1) return null;
    const H = (sunrise ? 360 - deg(Math.acos(cosH)) : deg(Math.acos(cosH))) / 15;
    let UT = H + RA - 0.06571 * t - 6.622 - lngHour;
    UT = ((UT % 24) + 24) % 24;
    const local = UT + -date.getTimezoneOffset() / 60;
    return ((local % 24) + 24) % 24 * 60;
  };
  const sunrise = event(true);
  let sunset = event(false);
  if (sunrise == null || sunset == null) return null;
  if (sunset < sunrise) sunset += 1440;
  if (sunset - sunrise < 180 || sunset - sunrise > 1080) return null;
  return { sunrise, sunset };
}

export function scheduleFor(date: Date, coords: { lat: number; lon: number } | null) {
  if (!coords) return FIXED_STARTS;
  const solar = solarMinutes(date, coords.lat, coords.lon);
  if (!solar) return FIXED_STARTS;
  return [
    { name: "sunrise" as const, start: solar.sunrise - 90 },
    { name: "day" as const, start: solar.sunrise + 90 },
    { name: "sunset" as const, start: solar.sunset - 90 },
    { name: "night" as const, start: solar.sunset + 90 },
  ];
}

export function resolveTheme(input: {
  date: Date;
  choice: ThemeChoice;
  coords: { lat: number; lon: number } | null;
  reducedMotion: boolean;
}) {
  if (input.choice !== "auto" && THEME_ORDER.includes(input.choice)) {
    return { name: input.choice, tokens: THEMES[input.choice], blending: false, source: "choice" as const };
  }
  const minute = input.date.getHours() * 60 + input.date.getMinutes() + input.date.getSeconds() / 60;
  const starts = scheduleFor(input.date, input.coords);
  if (input.reducedMotion) {
    const name = periodAt(minute, starts);
    return { name, tokens: THEMES[name], blending: false, source: "clock" as const };
  }
  const resolved = themeAtMinute(minute, starts);
  return { ...resolved, source: input.coords ? ("solar" as const) : ("clock" as const) };
}

export function applyTheme(tokens: ThemeTokens) {
  const root = document.documentElement;
  root.style.setProperty("--g0", tokens.g0);
  root.style.setProperty("--g1", tokens.g1);
  root.style.setProperty("--g2", tokens.g2);
  root.style.setProperty("--g3", tokens.g3);
  root.style.setProperty("--radial", tokens.radial);
  root.style.setProperty("--glass", tokens.glass);
  root.style.setProperty("--chip", tokens.chip);
  root.style.setProperty("--solid", tokens.solid);
  root.style.setProperty("--ink", tokens.ink);
  root.style.setProperty("--muted", tokens.muted);
  root.style.setProperty("--faint", tokens.faint);
  root.style.setProperty("--text", tokens.ink);
  root.style.setProperty("--shadow", tokens.shadow);
  root.style.setProperty("--action", tokens.action);
  root.style.setProperty("--action-2", tokens.action2);
  root.style.setProperty("--accent", tokens.action);
  root.style.setProperty("--accent-ink", "#ffffff");
  root.style.setProperty("--rim", tokens.rim);
  root.style.setProperty("--field", tokens.field);
  root.style.setProperty("--star", tokens.star);
  root.style.setProperty("--moon", tokens.muted);
}

export const THEME_STORAGE_KEY = "agencyops-theme";
export const COORDS_STORAGE_KEY = "agencyops-coords";

export function notifyThemeChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("agencyops-theme"));
}
