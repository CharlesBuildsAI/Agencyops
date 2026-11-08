import { redirect } from "next/navigation";
import { BotAvatar } from "@/components/bot-avatar";
import { requireUser } from "@/lib/auth";
import { BOT_COLORS, type AvatarMood } from "@/lib/avatars";
import { prisma } from "@/lib/db";

const MOODS: { mood: AvatarMood; label: string }[] = [
  { mood: "idle", label: "Idle" },
  { mood: "working", label: "Work" },
  { mood: "glance", label: "Type" },
  { mood: "happy", label: "Yes" },
];

export default async function AvatarLineupPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const bots = await prisma.bot.findMany({
    where: { agencyId: user.agencyId },
    orderBy: { sortOrder: "asc" },
  });
  return (
    <section className="panel grow page">
      <h1>The six</h1>
      <p className="sub">Same dot, different habit. Blink is idle. Working bobs. Typing glances at the thread. A yes gets a squint.</p>
      <div className="lineup">
        {bots.map((bot) => (
          <article key={bot.id} className="lineup-card">
            <BotAvatar slug={bot.slug} color={bot.color || BOT_COLORS[bot.slug]} size={112} label={bot.name} />
            <h2>{bot.name}</h2>
            <p>{bot.roleTitle}</p>
            <div className="lineup-states">
              {MOODS.map((item) => (
                <figure key={item.mood}>
                  <BotAvatar slug={bot.slug} color={bot.color || BOT_COLORS[bot.slug]} size={48} mood={item.mood} />
                  <figcaption>{item.label}</figcaption>
                </figure>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
