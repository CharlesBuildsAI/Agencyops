import { redirect } from "next/navigation";
import { Blob } from "@/components/blob";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dollars } from "@/lib/format";
import { loadHome } from "@/lib/view";

export default async function UsagePage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const [home, bots, pending] = await Promise.all([
    loadHome(user.agencyId),
    prisma.bot.findMany({ where: { agencyId: user.agencyId }, orderBy: { sortOrder: "asc" } }),
    prisma.approval.count({ where: { agencyId: user.agencyId, status: "pending" } }),
  ]);
  const max = Math.max(...bots.map((bot) => bot.spentCents), 1);
  const month = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: user.agency.timezone }).format(new Date());
  const capCents = user.agency.monthlyCapCents;
  const spentCents = bots.reduce((sum, bot) => sum + bot.spentCents, 0);
  return (
    <section className="panel grow page">
      <h1>Usage & budgets</h1>
      <p className="sub">{month} · {user.agency.name} workspace. Hard stop at the workspace cap.</p>
      <div className="stats">
        <div className="stat-card">
          <em className="mono">SPENT</em>
          <strong>{dollars(spentCents)}</strong>
          <div className="meter"><span style={{ width: `${Math.min(100, (spentCents / capCents) * 100)}%` }} /></div>
          <p className="faint">of {dollars(capCents)} workspace cap</p>
        </div>
        <div className="stat-card">
          <em className="mono">CALLS</em>
          <strong>{home.stats.callsMonth}</strong>
          <p className="faint">Front Desk · {user.agency.answeredRate}% answered</p>
        </div>
        <div className="stat-card">
          <em className="mono">APPROVALS</em>
          <strong>{home.stats.approvalsMonth}</strong>
          {pending > 0 && <span className="pill pill-needs">{pending} waiting</span>}
        </div>
      </div>
      <div className="sheet per">
        <p className="faint" style={{ padding: "10px 4px" }}>Per bot</p>
        {bots.map((bot) => (
          <div className="bot-spend" key={bot.id}>
            <Blob color={bot.color} size={22} />
            <b style={{ width: 72 }}>{bot.name}</b>
            <div className="track meter"><span className={bot.spentCents === max ? "" : ""} style={{ width: `${(bot.spentCents / max) * 100}%`, background: bot.spentCents === max ? "var(--accent)" : undefined }} /></div>
            <span className="mono faint">{dollars(bot.spentCents)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
