"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BotAvatar } from "./bot-avatar";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { FrameData } from "@/lib/view";

const PAGES = [
  { href: "/app/connectors", label: "Connectors" },
  { href: "/app/usage", label: "Usage & budgets" },
  { href: "/app/brand", label: "Brand" },
  { href: "/app/memory", label: "Memory" },
  { href: "/app/logins", label: "Logins" },
  { href: "/app/audit", label: "Audit log" },
];

export function Sidebar({ frame }: { frame: FrameData }) {
  const path = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const q = query.trim().toLowerCase();
  const bots = frame.bots.filter((bot) =>
    q ? `${bot.name} ${bot.roleTitle} ${bot.statusLine}`.toLowerCase().includes(q) : true,
  );
  const pages = q ? PAGES.filter((page) => page.label.toLowerCase().includes(q)) : [];

  async function invite() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await response.json()) as { error?: string; url?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "Could not create the invite.");
      return;
    }
    setInviteUrl(data.url || "");
  }

  async function replay() {
    setMenu(false);
    setBusy(true);
    await fetch("/api/demo/dana", { method: "POST" });
    setBusy(false);
    router.push("/app/bots/penny");
    router.refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <aside className="sidebar panel">
      <div className="side-head">
        {/* Full navigation so the marketing stylesheet does not stay attached to the desk. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="brand" href="/">
          <span className="mark">{frame.agency.mark}</span>
          <span>
            <strong>{frame.agency.productName}</strong>
            <em>{frame.agency.name}</em>
          </span>
        </a>
        <a className="icon-btn mobile-only" href="/app/settings" aria-label="Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </a>
      </div>
      <a className="needs-row" href={frame.needsHref}>
        <span>Needs you</span>
        <span className="badge">{frame.needsCount}</span>
      </a>
      <label className="search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search team & work" aria-label="Search the team" />
      </label>
      <h1 className="mobile-title">Team</h1>
      <p className="side-label">Team</p>
      {pages.length > 0 && (
        <ul className="hits">
          {pages.map((page) => (
            <li key={page.href}><a href={page.href}>{page.label}</a></li>
          ))}
        </ul>
      )}
      <ul className="team-list">
        {bots.map((bot) => {
          const active = path.startsWith(`/app/bots/${bot.slug}`);
          return (
            <li key={bot.slug}>
              <a className={active ? "team-row active" : `team-row${bot.paused ? " paused" : ""}`} href={`/app/bots/${bot.slug}`}>
                <BotAvatar slug={bot.slug} color={bot.color} size={28} mood={bot.live ? "working" : "idle"} />
                <span className="who">
                  <span className="who-top"><b>{bot.name}</b><i>{bot.roleTitle}</i></span>
                  <span className="who-sub">{bot.statusLine}</span>
                </span>
                <span className="meta">
                  <span className="when">{bot.stamp}</span>
                  {bot.pending > 0 ? <span className="badge">{bot.pending}</span> : null}
                </span>
              </a>
            </li>
          );
        })}
        {bots.length === 0 && <li className="faint" style={{ padding: "8px 12px" }}>No one matches.</li>}
      </ul>
      <nav className="side-links" aria-label="Workspace">
        <a href="/app/connectors">Connectors</a>
        <a href="/app/usage">Usage & budgets</a>
        <a href="/app/brand">Brand settings</a>
        <a href="/app/settings">Light & settings</a>
      </nav>
      <div className="side-foot">
        <a href="/app/logins">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="8" cy="15" r="4" /><path d="m10.5 12.5 8-8 3 3-8 8" /><path d="m16 6 2 2" /></svg>
          Logins
        </a>
        <a href="/app/memory">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 3a7 7 0 0 0-4 12.7V19h8v-3.3A7 7 0 0 0 12 3Z" /><path d="M9 22h6" /></svg>
          Memory
        </a>
        <div className="menu-wrap">
          <button className="avatar" onClick={() => setMenu((open) => !open)} aria-label="Account">
            {frame.user.initials}
          </button>
          {menu && (
            <div className="menu">
              <p><strong>{frame.user.name}</strong><span className="faint">{frame.user.email}</span></p>
              <button onClick={replay} disabled={busy}>Replay Dana&apos;s call</button>
              <button onClick={() => { setMenu(false); setInviteOpen(true); }}>Invite staff</button>
              <a href="/app/audit">Audit log</a>
              <button onClick={logout}>Sign out</button>
            </div>
          )}
        </div>
      </div>
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen} title="Invite staff">
        <p>They&apos;ll join {frame.agency.name}. Bots still can&apos;t send without a person&apos;s yes.</p>
        <div className="form-grid">
          <Input type="email" placeholder="leo@rivera.insurance" value={email} onChange={(event) => setEmail(event.target.value)} aria-label="Email" />
          {inviteUrl && <p className="mono" style={{ wordBreak: "break-all" }}>{inviteUrl}</p>}
          {error && <p className="err">{error}</p>}
          <Button onClick={invite} disabled={busy}>Create invite</Button>
        </div>
      </Dialog>
    </aside>
  );
}
