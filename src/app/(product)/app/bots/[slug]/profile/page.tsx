import { notFound, redirect } from "next/navigation";
import { AgentResources } from "@/components/agent-resources";
import { BotAvatar } from "@/components/bot-avatar";
import { PauseButton } from "@/components/editors";
import { requireUser } from "@/lib/auth";
import { loadDesk } from "@/lib/view";

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const { slug } = await params;
  const desk = await loadDesk(user.agencyId, slug);
  if (!desk) notFound();
  const pct = Math.min(100, Math.round((desk.bot.spentCents / Math.max(1, desk.bot.monthlyCapCents)) * 100));
  return (
    <div className="profile-wrap">
      <section className="panel profile-mid">
        <div style={{ textAlign: "center" }}>
          <BotAvatar slug={desk.bot.slug} color={desk.bot.color} size={148} mood={desk.call ? "working" : "idle"} />
          <p style={{ marginTop: 12 }}>Chat with {desk.bot.name}</p>
          <a className="btn btn-ghost btn-sm" href={`/app/bots/${desk.bot.slug}`} style={{ marginTop: 12 }}>Open chat</a>
        </div>
      </section>
      <aside className="panel profile-side">
        <header className="chat-head" style={{ paddingLeft: 0 }}>
          <BotAvatar slug={desk.bot.slug} color={desk.bot.color} size={48} mood={desk.call ? "working" : "idle"} />
          <div className="head-copy">
            <b>{desk.bot.name}</b>
            <span>{desk.bot.roleTitle} · {user.agency.name}</span>
          </div>
          <PauseButton slug={desk.bot.slug} paused={desk.bot.paused} />
        </header>
        <div className="block">
          <h2>Reach {desk.bot.name}</h2>
          <div className="line"><span>Phone<small>{desk.bot.phone}</small></span><a className="btn btn-ghost btn-sm" href={`/app/bots/${desk.bot.slug}/call`}>Call</a></div>
          <div className="line"><span>Email<small>{desk.bot.email}</small></span></div>
          <div className="line"><span>SMS<small>Texts from her number</small></span></div>
        </div>
        <AgentResources
          slug={desk.bot.slug}
          email={desk.bot.email}
          phone={desk.bot.phone}
          orgoStatus={desk.bot.orgoStatus}
          orgoComputerId={desk.bot.orgoComputerId}
          composioSummary={desk.bot.composioSummary}
          errors={desk.bot.provision}
        />
        <div className="block">
          <h2>Computer</h2>
          <div className="line">
            <span>{desk.bot.orgoComputerId ? `Desktop · ${desk.bot.orgoStatus || "created"}` : "Android phone is the main device"}<small>{desk.bot.orgoComputerId ? desk.bot.orgoComputerId : "A desktop computer is optional"}</small></span>
            <a className="btn btn-quiet btn-sm" href={`/app/bots/${desk.bot.slug}?screen=1`}>Open</a>
          </div>
        </div>
        <div className="block" style={{ paddingBottom: 14 }}>
          <h2>This month</h2>
          <div className="spread" style={{ justifyContent: "space-between" }}>
            <strong>{desk.bot.spentLabel} of {desk.bot.capLabel}</strong>
            <span className="faint">{pct}%</span>
          </div>
          <div className="meter" style={{ marginTop: 8 }}><span style={{ width: `${pct}%` }} /></div>
          {desk.bot.paused && <p className="faint">{desk.bot.pausedReason}</p>}
        </div>
      </aside>
    </div>
  );
}
