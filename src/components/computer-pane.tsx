"use client";

import { useEffect, useState } from "react";
import { BotAvatar } from "./bot-avatar";
import { StarField, Wave } from "./starfield";
import { formatDuration } from "@/lib/time";
import type { ApprovalCardData } from "./approval-card";

type Screen = { id: string; label: string; tint: string };
type Call = { id: string; contactName: string; phone: string; summary: string; startedAt: string } | null;

export function ComputerPane({
  name,
  color,
  screens,
  initial,
  url,
  call,
  activities,
  file,
}: {
  name: string;
  color: string;
  screens: Screen[];
  initial: string;
  url: string;
  call: Call;
  activities: { id: string; text: string; at: string }[];
  file?: ApprovalCardData;
}) {
  const [screen, setScreen] = useState(initial === "call" && call ? "call" : initial);
  const [log, setLog] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [note, setNote] = useState("");
  useEffect(() => {
    if (screen !== "call" || !call) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [screen, call]);
  const active = screens.find((item) => item.id === screen);
  const address =
    screen === "call"
      ? "agentphone · live call"
      : screen === "ams360"
        ? url || "ams360.applied.com/certificates"
        : screen === "gmail"
          ? "mail.google.com"
          : screen === "quote"
            ? "quote · intake"
            : "carrier portal · vault";

  async function download() {
    if (!file) return;
    if (file.status !== "approved") {
      setNote("Waiting for your yes before this downloads.");
      return;
    }
    window.location.href = `/api/approvals/${file.id}/file`;
  }

  return (
    <aside className="panel computer-panel">
      <div className="comp-head">
        <div>
          <strong>{name}&apos;s computer</strong>
        </div>
        <div className="screen-nums mono">
          {screens.map((item, index) => (
            <span key={item.id} className={item.id === screen ? "on" : ""}>{index + 1}</span>
          ))}
        </div>
      </div>
      <div className="comp-head" style={{ paddingTop: 0 }}>
        <span className="dots" aria-hidden><i /><i /><i /></span>
        <span className="url mono">{address}</span>
        <button className="icon-btn" onClick={() => setLog((open) => !open)}>{log ? "Hide log" : "Log"}</button>
      </div>
      <div className="desktop">
        {screen === "call" && call ? (
          <div className="call-hero">
            <StarField />
            <svg className="moon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d7deea" strokeWidth="1.5"><path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5Z" /></svg>
            <BotAvatar color={color} plain size={84} mood="working" label={call.contactName} />
            <h2>{call.contactName}</h2>
            <p className="faint mono">{formatDuration(call.startedAt, now)} · mobile</p>
            <div style={{ marginTop: 12 }}><Wave hot /></div>
          </div>
        ) : screen === "ams360" && file ? (
          <div className="doc">
            <div className="eyebrow mono">APPLIED AMS360 · CERTIFICATES</div>
            <h2>Issue Certificate of Insurance</h2>
            <dl>
              <div><dt>Named insured</dt><dd>{file.payload.namedInsured}</dd></div>
              <div><dt>Additional insured</dt><dd>{file.payload.additionalInsured}</dd></div>
              <div><dt>Job site</dt><dd>{file.payload.jobSite}</dd></div>
              <div><dt>Coverages</dt><dd>{file.payload.coverages}</dd></div>
            </dl>
            <div style={{ marginTop: 18 }}>
              <button className="btn btn-quiet" onClick={download}>Download PDF</button>
              {note && <p className="err">{note}</p>}
            </div>
          </div>
        ) : (
          <div className="doc">
            <div className="eyebrow mono">{(active?.label || "Desktop").toUpperCase()}</div>
            <h2>{screen === "gmail" ? "Inbox is quiet on this screen." : screen === "quote" ? "Intake notes stay on the desk." : "Carrier portal"}</h2>
            <p className="muted">
              {screen === "carrier"
                ? "Passwords stay in the keychain. Models never see them."
                : "This screen is a local stand-in. An Orgo desktop can replace the adapter later."}
            </p>
          </div>
        )}
      </div>
      {log && (
        <div className="log mono">
          {activities.length === 0 && <p>No activity yet.</p>}
          {activities.map((activity) => (
            <p key={activity.id}>{activity.at} · {activity.text}</p>
          ))}
        </div>
      )}
      <div className="tiles">
        {screens.map((item, index) => (
          <button key={item.id} className={`tile ${item.tint} ${item.id === screen ? "on" : ""}`} onClick={() => setScreen(item.id)}>
            <small>{index + 1}</small>
            {item.label}
          </button>
        ))}
      </div>
    </aside>
  );
}
