import { redirect } from "next/navigation";
import { BotAvatar } from "@/components/bot-avatar";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function CallsPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const calls = await prisma.callSession.findMany({
    where: { agencyId: user.agencyId },
    include: { bot: true },
    orderBy: { startedAt: "desc" },
    take: 20,
  });
  const live = calls.filter((call) => call.status === "live");
  const recent = calls.filter((call) => call.status !== "live");
  return (
    <section className="panel grow page">
      <h1>Calls</h1>
      <p className="sub">Live lines and the last calls the desk picked up.</p>
      {calls.length === 0 && <div className="empty"><h2>No calls yet.</h2><p>An inbound call to Penny shows up here and in her chat.</p></div>}
      <div className="call-list" style={{ display: "grid", gap: 8 }}>
        {live.map((call) => (
          <a key={call.id} href={`/app/bots/${call.bot.slug}/call`}>
            <span className="row" style={{ gap: 10 }}><BotAvatar slug={call.bot.slug} color={call.bot.color} size={28} mood={call.status === "live" ? "working" : "idle"} /><span><b>{call.bot.name} · {call.contactName}</b><small className="faint" style={{ display: "block" }}>{call.summary}</small></span></span>
            <span className="pill pill-needs">Live</span>
          </a>
        ))}
        {recent.map((call) => (
          <a key={call.id} href={`/app/bots/${call.bot.slug}`}>
            <span className="row" style={{ gap: 10 }}><BotAvatar slug={call.bot.slug} color={call.bot.color} size={28} mood={call.status === "live" ? "working" : "idle"} /><span><b>{call.contactName}</b><small className="faint" style={{ display: "block" }}>{call.bot.name} · ended</small></span></span>
          </a>
        ))}
      </div>
    </section>
  );
}
