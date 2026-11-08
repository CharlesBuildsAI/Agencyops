export const BOT_COLORS: Record<string, string> = {
  penny: "#FF6FB5",
  ivy: "#2EC4B6",
  quinn: "#FF9F43",
  reed: "#47C46B",
  sage: "#5B8CFF",
  gale: "#A78BFA",
};

export type AvatarMood = "idle" | "working" | "glance" | "happy";

type EyeSpec = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rot?: number;
  lid?: boolean;
};

type FaceSpec = {
  tilt?: string;
  blink: string;
  delay: string;
  double?: boolean;
  eyes: [EyeSpec, EyeSpec];
  back?: string;
  front?: string;
};

const PUPIL = "#16181f";

const FACES: Record<string, FaceSpec> = {
  penny: {
    tilt: "rotate(-7 32 36)",
    blink: "6.6s",
    delay: "0.4s",
    eyes: [
      { cx: 24, cy: 33.2, rx: 3.6, ry: 6.6 },
      { cx: 40, cy: 33.2, rx: 3.6, ry: 6.6 },
    ],
    front: `<path d="M16 27C16 8 48 8 48 27" fill="none" stroke="#f4f6f8" stroke-width="2.3" stroke-linecap="round"/><rect x="8.5" y="24" width="9" height="14" rx="4" fill="#f4f6f8"/><rect x="46.5" y="24" width="9" height="14" rx="4" fill="#f4f6f8"/><rect x="10.6" y="27.2" width="4.8" height="7.6" rx="2.2" fill="#2a2c32"/><rect x="48.6" y="27.2" width="4.8" height="7.6" rx="2.2" fill="#2a2c32"/>`,
  },
  ivy: {
    blink: "5.5s",
    delay: "1.3s",
    eyes: [
      { cx: 26.4, cy: 33.4, rx: 2.9, ry: 5.6 },
      { cx: 37.6, cy: 33.4, rx: 2.9, ry: 5.6 },
    ],
    front: `<path d="M32 15.5V7.2" stroke="#f4fffc" stroke-width="1.7" stroke-linecap="round"/><ellipse cx="26.8" cy="8.2" rx="4.6" ry="2.25" fill="#f4fffc" transform="rotate(-40 26.8 8.2)"/><ellipse cx="37.4" cy="7.6" rx="4.7" ry="2.3" fill="#fbfffe" transform="rotate(34 37.4 7.6)"/>`,
  },
  quinn: {
    blink: "7.4s",
    delay: "0.8s",
    double: true,
    eyes: [
      { cx: 23.4, cy: 30.6, rx: 2.95, ry: 7.05 },
      { cx: 40.6, cy: 34.6, rx: 3.25, ry: 5 },
    ],
    front: `<path d="M19.2 23.6c1.6-2.8 6.2-3.1 8.6-.4" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>`,
  },
  reed: {
    blink: "4.9s",
    delay: "2.1s",
    eyes: [
      { cx: 22.8, cy: 32.6, rx: 3.35, ry: 6.15 },
      { cx: 41.2, cy: 32.6, rx: 3.35, ry: 6.15 },
    ],
    back: `<path d="M32 14.2V6.4" stroke="#145c30" stroke-width="1.8" stroke-linecap="round"/><rect x="25.8" y="1.2" width="12.4" height="8.4" rx="1.8" fill="#f7f8f2"/><rect x="25.8" y="1.2" width="12.4" height="2.6" rx="1.2" fill="#1c6b38"/>`,
  },
  sage: {
    blink: "8.8s",
    delay: "1.1s",
    eyes: [
      { cx: 24.4, cy: 36.2, rx: 3.45, ry: 4.15, lid: true },
      { cx: 39.6, cy: 36.2, rx: 3.45, ry: 4.15, lid: true },
    ],
    back: `<path d="M17 17.5c2.2-8.6 27.8-8.6 30 0-4.2-2.2-8.6-3.2-15-3.2s-10.8 1-15 3.2z" fill="#315fce"/><ellipse cx="32" cy="17.6" rx="15.2" ry="3.15" fill="#274eae"/>`,
  },
  gale: {
    blink: "5.7s",
    delay: "2.7s",
    eyes: [
      { cx: 24.2, cy: 33, rx: 3.05, ry: 6.05, rot: -9 },
      { cx: 39.8, cy: 33, rx: 3.05, ry: 6.05, rot: 9 },
    ],
    front: `<path d="M46 46c7-.4 11 3.2 8.2 7.4" fill="none" stroke="#fff" stroke-opacity="0.78" stroke-width="1.7" stroke-linecap="round"/><path d="M50 5.2l1.15 3.7 3.85.55-3.05 2.35.95 3.75L50 13.2l-2.9 2.35.95-3.75-3.05-2.35 3.85-.55z" fill="#fff6c8"/>`,
  },
};

const PLAIN_EYES: [EyeSpec, EyeSpec] = [
  { cx: 24.5, cy: 33, rx: 3.1, ry: 6.2 },
  { cx: 39.5, cy: 33, rx: 3.1, ry: 6.2 },
];

function eyeMarkup(eye: EyeSpec, color: string) {
  const pupilRx = Math.max(0.95, eye.rx * 0.34);
  const pupilRy = Math.max(1.35, eye.ry * 0.3);
  const pupilCy = eye.cy - eye.ry * 0.16;
  const lid = eye.lid
    ? `<path d="M${eye.cx - eye.rx} ${eye.cy - eye.ry * 0.05}Q${eye.cx} ${eye.cy - eye.ry * 0.72} ${eye.cx + eye.rx} ${eye.cy - eye.ry * 0.05}" fill="none" stroke="${color}" stroke-width="2.3" stroke-linecap="round"/>`
    : "";
  const inner = `<ellipse cx="${eye.cx}" cy="${eye.cy}" rx="${eye.rx}" ry="${eye.ry}" fill="#fff"/><ellipse cx="${eye.cx}" cy="${pupilCy}" rx="${pupilRx}" ry="${pupilRy}" fill="${PUPIL}"/>${lid}`;
  const wrapped = eye.rot ? `<g transform="rotate(${eye.rot} ${eye.cx} ${eye.cy})">${inner}</g>` : inner;
  return `<g class="eye">${wrapped}</g>`;
}

function bodyMarkup(color: string) {
  return `<circle cx="32" cy="34" r="22" fill="${color}"/><ellipse cx="24.5" cy="24" rx="7.2" ry="3.3" fill="#fff" fill-opacity="0.2" transform="rotate(-26 24.5 24)"/>`;
}

function cheeks() {
  return `<g class="cheeks"><circle class="cheek" cx="18" cy="42" r="2.15" fill="#fff"/><circle class="cheek" cx="46" cy="42" r="2.15" fill="#fff"/></g>`;
}

export function avatarTiming(slug?: string) {
  const face = slug ? FACES[slug] : undefined;
  return {
    blink: face?.blink ?? "6.2s",
    delay: face?.delay ?? "0s",
    double: Boolean(face?.double),
  };
}

export function avatarInner(options: { slug?: string; color: string; plain?: boolean }) {
  const face = !options.plain && options.slug ? FACES[options.slug] : undefined;
  const eyes = face?.eyes ?? PLAIN_EYES;
  const tilt = face?.tilt ? `<g class="tilt" transform="${face.tilt}">` : `<g class="tilt">`;
  return `<g class="bob"><rect width="64" height="64" fill="none"/>${tilt}${face?.back ?? ""}${bodyMarkup(options.color)}<g class="eyes">${eyes.map((item) => eyeMarkup(item, options.color)).join("")}</g>${cheeks()}${face?.front ?? ""}</g></g>`;
}

export function avatarSvg(slug: string, size = 40) {
  const color = BOT_COLORS[slug] ?? "#A8B8D4";
  const timing = avatarTiming(slug);
  return `<svg class="bot-avatar who-${slug}${timing.double ? " blink-double" : ""}" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" style="--blink:${timing.blink};--blink-delay:${timing.delay}">${avatarInner({ slug, color })}</svg>`;
}
