import { BotAvatar } from "./bot-avatar";
import { ButtonLink } from "./ui/button";

export function HomeScreen({
  home,
}: {
  home: {
    kicker: string;
    title: string;
    titleRest: string;
    body: string;
    focusHref: string;
    focusLabel: string;
    queue: {
      id: string;
      slug: string;
      color: string;
      title: string;
      detail: string;
      action: string;
      tone: "needs" | "ghost";
      href: string;
    }[];
    stats: { calls: number; waiting: number; spent: string };
  };
}) {
  return (
    <>
      <section className="panel grow home">
        <p className="kicker mono">{home.kicker}</p>
        <h1 className="display">{home.title}<br />{home.titleRest}</h1>
        <p className="lede">{home.body}</p>
        <div className="actions">
          <ButtonLink href={home.focusHref}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 5 5L20 7" /></svg>
            Review approval
          </ButtonLink>
          <ButtonLink variant="ghost" href={home.focusHref}>{home.focusLabel}</ButtonLink>
        </div>
        <div className="stat-row mono">
          <div><span>CALLS</span><strong>{home.stats.calls}</strong></div>
          <div><span>WAITING</span><strong>{home.stats.waiting}</strong></div>
          <div><span>SPENT</span><strong>{home.stats.spent}</strong></div>
        </div>
      </section>
      <aside className="panel queue-panel">
        <h2 className="mono">QUEUE</h2>
        {home.queue.length === 0 && <p className="faint" style={{ padding: "0 8px" }}>Nothing is waiting.</p>}
        {home.queue.map((item) => (
          <a className="q-item" key={item.id} href={item.href}>
            <BotAvatar slug={item.slug} color={item.color} size={30} mood={item.action === "Listen" ? "working" : "idle"} />
            <span>
              <b>{item.title}</b>
              <p>{item.detail}</p>
            </span>
            <span className={item.tone === "needs" ? "pill pill-needs" : "pill pill-ghost"}>{item.action}</span>
          </a>
        ))}
      </aside>
    </>
  );
}
