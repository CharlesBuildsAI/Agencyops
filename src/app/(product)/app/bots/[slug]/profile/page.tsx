import { notFound, redirect } from "next/navigation";
import { AndroidPhone } from "@/components/android-phone";
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
        <AndroidPhone
          slug={desk.bot.slug}
          name={desk.bot.name}
          phone={desk.bot.phone}
          email={desk.bot.email}
          hasDevice={Boolean(desk.bot.phoneDeviceId)}
          provider={desk.bot.phoneProvider}
          accounts={desk.bot.accounts}
        />
        <p className="chat-with"><a href={`/app/bots/${desk.bot.slug}`}>Chat with {desk.bot.name}</a></p>
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
          <div className="line"><span>SMS<small>Texts from this number</small></span></div>
        </div>
        {desk.bot.orgoComputerId ? (
          <div className="block">
            <h2>Optional desktop</h2>
            <div className="line">
              <span>Desktop · {desk.bot.orgoStatus || "created"}<small>{desk.bot.orgoComputerId}</small></span>
              <a className="btn btn-quiet btn-sm" href={`/app/bots/${desk.bot.slug}?screen=1`}>Open</a>
            </div>
          </div>
        ) : null}
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
