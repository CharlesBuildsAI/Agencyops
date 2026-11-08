/** Flat blue family. Shade only. Eyes are white pills, with no accessories. */
export const BOT_COLORS: Record<string, string> = {
  penny: "#2F62E6",
  ivy: "#3A6AE8",
  quinn: "#345EDC",
  reed: "#4872EA",
  sage: "#2A56D4",
  gale: "#4E78EC",
};

export type AvatarMood = "idle" | "working" | "glance" | "happy";

type Eye = { cx: number; cy: number; rx: number; ry: number };

const EYES: Record<string, { blink: string; delay: string; eyes: [Eye, Eye] }> = {
  penny: {
    blink: "6.4s",
    delay: "0.2s",
    eyes: [
      { cx: 24, cy: 31, rx: 3.5, ry: 7.2 },
      { cx: 40, cy: 31, rx: 3.5, ry: 7.2 },
    ],
  },
  ivy: {
    blink: "5.4s",
    delay: "1.1s",
    eyes: [
      { cx: 25.2, cy: 32, rx: 3.3, ry: 6.6 },
      { cx: 38.8, cy: 32, rx: 3.3, ry: 6.6 },
    ],
  },
  quinn: {
    blink: "7.2s",
    delay: "0.6s",
    eyes: [
      { cx: 23.6, cy: 30.5, rx: 3.2, ry: 7.4 },
      { cx: 40.2, cy: 32.4, rx: 3.4, ry: 6.2 },
    ],
  },
  reed: {
    blink: "5s",
    delay: "1.8s",
    eyes: [
      { cx: 23.4, cy: 32, rx: 3.6, ry: 6.8 },
      { cx: 40.6, cy: 32, rx: 3.6, ry: 6.8 },
    ],
  },
  sage: {
    blink: "8.4s",
    delay: "0.9s",
    eyes: [
      { cx: 24.5, cy: 33, rx: 3.5, ry: 5.6 },
      { cx: 39.5, cy: 33, rx: 3.5, ry: 5.6 },
    ],
  },
  gale: {
    blink: "5.8s",
    delay: "2.4s",
    eyes: [
      { cx: 24, cy: 31.5, rx: 3.4, ry: 7 },
      { cx: 40, cy: 31.5, rx: 3.4, ry: 7 },
    ],
  },
};

const PLAIN: [Eye, Eye] = [
  { cx: 24.5, cy: 31.5, rx: 3.4, ry: 7 },
  { cx: 39.5, cy: 31.5, rx: 3.4, ry: 7 },
];

export function avatarTiming(slug?: string) {
  const face = slug ? EYES[slug] : undefined;
  return { blink: face?.blink ?? "6.2s", delay: face?.delay ?? "0s", double: false };
}

export function avatarFill(slug: string | undefined, fallback: string) {
  if (slug && BOT_COLORS[slug]) return BOT_COLORS[slug];
  return fallback || BOT_COLORS.penny;
}

export function avatarInner(options: { slug?: string; color: string; plain?: boolean }) {
  const face = !options.plain && options.slug ? EYES[options.slug] : undefined;
  const eyes = face?.eyes ?? PLAIN;
  const fill = options.plain ? options.color || BOT_COLORS.penny : avatarFill(options.slug, options.color);
  const marks = eyes
    .map((eye) => `<g class="eye"><ellipse cx="${eye.cx}" cy="${eye.cy}" rx="${eye.rx}" ry="${eye.ry}" fill="#fff"/></g>`)
    .join("");
  return `<g class="bob"><rect width="64" height="64" fill="none"/><circle cx="32" cy="32" r="22" fill="${fill}"/><g class="eyes">${marks}</g></g>`;
}

export function avatarSvg(slug: string, size = 40) {
  const timing = avatarTiming(slug);
  return `<svg class="bot-avatar who-${slug}" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" style="--blink:${timing.blink};--blink-delay:${timing.delay}">${avatarInner({ slug, color: BOT_COLORS[slug] })}</svg>`;
}
