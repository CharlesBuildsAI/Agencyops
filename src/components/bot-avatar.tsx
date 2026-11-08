"use client";

import { avatarFill, avatarInner, avatarTiming, type AvatarMood } from "@/lib/avatars";

export function BotAvatar({
  slug,
  color,
  size = 36,
  mood = "idle",
  plain = false,
  label,
}: {
  slug?: string;
  color: string;
  size?: number;
  mood?: AvatarMood;
  plain?: boolean;
  label?: string;
}) {
  const timing = avatarTiming(plain ? undefined : slug);
  const who = plain ? "plain" : slug || "plain";
  const labelled = label ? ` role="img" aria-label="${label.replace(/"/g, "")}"` : ` aria-hidden="true"`;
  const fill = plain ? color : avatarFill(slug, color);
  const svg = `<svg class="bot-avatar mood-${mood} who-${who}" width="${size}" height="${size}" viewBox="0 0 64 64"${labelled} style="--blink:${timing.blink};--blink-delay:${timing.delay}">${avatarInner({ slug, color: fill, plain })}</svg>`;
  return <span className="avatar-slot" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
