import { redirect } from "next/navigation";
import { BotAvatar } from "@/components/bot-avatar";
import { MemoryForm } from "@/components/editors";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function MemoryPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const bots = await prisma.bot.findMany({ where: { agencyId: user.agencyId }, orderBy: { sortOrder: "asc" } });
  return (
    <section className="panel grow page">
      <h1>Memory</h1>
      <p className="sub">Notes each bot reads on the next turn. You can edit or wipe them. They are not hidden.</p>
      <div className="stack">
        {bots.map((bot) => (
          <article key={bot.id} className="sheet" style={{ padding: 16 }}>
            <div className="row" style={{ gap: 10, marginBottom: 10 }}>
              <BotAvatar slug={bot.slug} color={bot.color} size={28} />
              <b>{bot.name}</b>
              <span className="faint">{bot.roleTitle}</span>
            </div>
            {bot.memoryNotes.trim() ? null : <p className="faint">No notes yet.</p>}
            <MemoryForm slug={bot.slug} notes={bot.memoryNotes} />
          </article>
        ))}
      </div>
    </section>
  );
}
