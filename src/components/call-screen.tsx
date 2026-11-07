"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Blob } from "./blob";
import { StarField, Wave } from "./starfield";
import { formatDuration } from "@/lib/time";

export function CallScreen({
  call,
  bot,
}: {
  call: { id: string; contactName: string; phone: string; summary: string; startedAt: string } | null;
  bot: { slug: string; name: string; color: string; roleTitle: string };
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    if (!call) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [call]);

  async function end() {
    if (!call) return;
    await fetch(`/api/calls/${call.id}/end`, { method: "POST" });
    router.push(`/app/bots/${bot.slug}`);
    router.refresh();
  }

  return (
    <section className="call-stage">
      <StarField />
      <svg className="moon-svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d7deea" strokeWidth="1.5"><path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5Z" /></svg>
      <header className="chat-head" style={{ position: "relative", zIndex: 1, justifyContent: "center" }}>
        <Blob color={bot.color} size={28} />
        <div className="head-copy" style={{ flex: "none" }}>
          <b>{bot.name}</b>
          <span>{call ? "Live" : bot.roleTitle}</span>
        </div>
        {call && <span className="mono faint">{formatDuration(call.startedAt, now)}</span>}
        {call && <Wave />}
        {call && <button className="round end" aria-label="End" onClick={end}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10c4-4 12-4 16 0l-2 2c-3-2-9-2-12 0Z" /></svg>
        </button>}
      </header>
      <div className="call-hero">
        {call ? (
          <>
            <Blob color={bot.color} size={112} />
            <h2>{bot.name}</h2>
            <p className="faint">FaceTime Audio · {formatDuration(call.startedAt, now)}</p>
            <p className="muted" style={{ maxWidth: 420 }}>{call.summary}</p>
          </>
        ) : (
          <>
            <Blob color={bot.color} size={112} />
            <h2>{bot.name}</h2>
            <p className="muted">The line is quiet. Inbound calls show up here.</p>
          </>
        )}
        <div className="call-controls">
          <button onClick={() => setMuted((value) => !value)}>
            <span className="round">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z" /><path d="M19 11a7 7 0 0 1-14 0M12 18v3" /></svg>
            </span>
            {muted ? "Unmute" : "Mute"}
          </button>
          <button type="button">
            <span className="round">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01M8 17h8" /></svg>
            </span>
            Keypad
          </button>
          <button type="button">
            <span className="round">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" /></svg>
            </span>
            Audio
          </button>
          <button onClick={end}>
            <span className="round end">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 15.5c4.5-4 11.5-4 16 0l-1.8 1.8c-3.4-2.4-9-2.4-12.4 0Z" /></svg>
            </span>
            End
          </button>
        </div>
      </div>
    </section>
  );
}
