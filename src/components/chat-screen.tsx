"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApprovalCard, type ApprovalCardData } from "./approval-card";
import { ComputerPane } from "./computer-pane";
import { BotAvatar } from "./bot-avatar";
import type { AvatarMood } from "@/lib/avatars";
import { Wave } from "./starfield";
import { formatDuration } from "@/lib/time";

type Desk = {
  bot: { slug: string; name: string; roleTitle: string; color: string; paused: boolean; pausedReason: string };
  messages: { id: string; role: string; content: string; meta: { kind?: string }; at: string }[];
  approvals: ApprovalCardData[];
  call: { id: string; contactName: string; phone: string; summary: string; startedAt: string } | null;
  activities: { id: string; text: string; screen: string; at: string }[];
  screens: { id: string; label: string; tint: string }[];
  activeScreen: string;
  screenUrl: string;
};

export function ChatScreen({ desk }: { desk: Desk }) {
  const router = useRouter();
  const params = useSearchParams();
  const screenMode = params.get("screen") === "1";
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [celebrate, setCelebrate] = useState(false);
  const approved = desk.approvals.filter((item) => item.status === "approved").length;
  const seenApproved = useRef(approved);
  useEffect(() => {
    if (approved > seenApproved.current) {
      setCelebrate(true);
      const timer = setTimeout(() => setCelebrate(false), 2400);
      seenApproved.current = approved;
      return () => clearTimeout(timer);
    }
    seenApproved.current = approved;
  }, [approved]);
  const mood: AvatarMood = celebrate ? "happy" : text.trim() ? "glance" : desk.call || busy ? "working" : "idle";
  useEffect(() => {
    if (!desk.call) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [desk.call]);

  async function send() {
    const value = text.trim();
    if (!value) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/bots/${desk.bot.slug}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: value }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!response.ok && response.status !== 402) {
      setError(data.error || "Message didn't send.");
    } else {
      setText("");
      if (data.error) setError(data.error);
    }
    router.refresh();
  }

  async function signedIn() {
    await fetch(`/api/bots/${desk.bot.slug}/signin`, { method: "POST" });
    router.refresh();
  }

  async function endCall() {
    if (!desk.call) return;
    await fetch(`/api/calls/${desk.call.id}/end`, { method: "POST" });
    router.refresh();
  }

  const firstAt = desk.messages[0]?.at;

  return (
    <div className={screenMode ? "stage screen-mode" : "contents-stage"}>
      <section className="panel chat-panel grow">
        <header className="chat-head">
          <a className="back-link" href="/app">Back</a>
          <BotAvatar slug={desk.bot.slug} color={desk.bot.color} size={36} mood={mood} />
          <div className="head-copy">
            <b><a href={`/app/bots/${desk.bot.slug}/profile`}>{desk.bot.name}</a></b>
            <span>{desk.call ? `On a call · ${desk.call.contactName}` : desk.bot.roleTitle}</span>
          </div>
          {desk.call && (
            <div className="head-tools">
              <span className="live-dot" />
              <span className="mono faint">{formatDuration(desk.call.startedAt, now)}</span>
              <Wave hot />
              <button className="round" aria-label="Mute" onClick={() => setNow(Date.now())}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z" /><path d="M19 11a7 7 0 0 1-14 0M12 18v3" /></svg>
              </button>
              <button className="round end" aria-label="End call" onClick={endCall}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 4.5 9 7 7.5 9.5a12 12 0 0 0 7 7L17 15l2.5 2.5-1 3A2 2 0 0 1 16.6 22 16 16 0 0 1 2 7.4a2 2 0 0 1 2-1.9l2.5 1Z" /></svg>
              </button>
            </div>
          )}
        </header>
        <div className="thread">
          {firstAt && <div className="daychip">Today · {firstAt}</div>}
          {desk.messages.length === 0 && (
            <div className="empty">
              <h2>{desk.bot.paused ? `${desk.bot.name} is paused` : `Message ${desk.bot.name}`}</h2>
              <p>{desk.bot.paused ? desk.bot.pausedReason : "Ask for intake, a draft, or a handoff. Nothing leaves without approval."}</p>
            </div>
          )}
          {desk.messages.map((message) => {
            if (message.meta.kind === "status") return <p key={message.id} className="status-line mono">{message.content}</p>;
            if (message.meta.kind === "transcript") return <div key={message.id} className="transcript">{message.content}</div>;
            if (message.meta.kind === "budget") return <p key={message.id} className="budget-note">{message.content}</p>;
            if (message.role === "user") return <div key={message.id} className="bubble user">{message.content}</div>;
            return <div key={message.id} className="bubble bot">{message.content}</div>;
          })}
          {desk.approvals.map((approval) => (
            <ApprovalCard key={approval.id} approval={approval} slug={desk.bot.slug} />
          ))}
        </div>
        <div className="composer">
          <div className="tool-row">
            {desk.call && <a className="btn btn-ghost btn-sm" href={`/app/bots/${desk.bot.slug}/call`}>Show call</a>}
            <button className="btn btn-ghost btn-sm" onClick={signedIn}>I&apos;ve signed in</button>
            <a className="btn btn-ghost btn-sm" href={`/app/bots/${desk.bot.slug}?screen=1`}>Show screen</a>
          </div>
          {error && <p className="err">{error}</p>}
          <form
            className="msg-box"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={`Message ${desk.bot.name}`}
              aria-label={`Message ${desk.bot.name}`}
              disabled={busy}
            />
            <button className="send" type="submit" aria-label="Send" disabled={busy}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
            </button>
          </form>
        </div>
      </section>
      <ComputerPane
        name={desk.bot.name}
        color={desk.bot.color}
        screens={desk.screens}
        initial={desk.activeScreen}
        url={desk.screenUrl}
        call={desk.call}
        activities={desk.activities}
        file={desk.approvals.find((approval) => approval.kind === "file")}
      />
    </div>
  );
}
