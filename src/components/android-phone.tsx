"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { PHONE_APPS } from "@/lib/providers";

type Account = { name?: string; status?: string; packageName?: string };

export function AndroidPhone({
  slug,
  name,
  phone,
  email,
  hasDevice,
  provider,
  accounts,
}: {
  slug: string;
  name: string;
  phone: string;
  email: string;
  hasDevice: boolean;
  provider: string;
  accounts: Account[];
}) {
  const [watching, setWatching] = useState(false);
  const [control, setControl] = useState(false);
  const [frame, setFrame] = useState(0);
  const [shot, setShot] = useState("");
  const [notice, setNotice] = useState("");
  const [text, setText] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [app, setApp] = useState<string>(PHONE_APPS[0].packageName);

  useEffect(() => {
    if (!watching || !hasDevice || provider !== "mobilerun") return;
    let stop = false;
    const pull = async () => {
      const response = await fetch(`/api/bots/${slug}/phone/screen?t=${Date.now()}`);
      if (!response.ok || stop) return;
      const blob = await response.blob();
      setShot((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
    };
    pull();
    const timer = window.setInterval(pull, 2500);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [watching, hasDevice, provider, slug, frame]);

  async function act(body: Record<string, unknown>) {
    const response = await fetch(`/api/bots/${slug}/phone/act`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as { detail?: string; error?: string };
    setNotice(data.detail || data.error || "");
    setFrame((value) => value + 1);
  }

  async function saveLogin() {
    const chosen = PHONE_APPS.find((item) => item.packageName === app);
    const response = await fetch(`/api/bots/${slug}/accounts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: chosen?.name, packageName: app, username }),
    });
    if (password && window.agencyops) {
      await window.agencyops.saveSecrets({ [`ACCT_${slug}_${app}`]: password });
    }
    setPassword("");
    const data = (await response.json()) as { error?: string };
    setNotice(data.error || "Login saved for this phone. Finish signing in with Take control. No new account is created.");
    if (hasDevice) await act({ op: "open_app", packageName: app });
  }

  const signed = accounts.filter((item) => item.status === "signed-in" || item.status === "saved");

  return (
    <div className="phone-desk">
      <div className="handset">
        <p className="handset-title">{name}&apos;s Android phone</p>
        <button
          type="button"
          className="handset-screen"
          disabled={!control || !hasDevice}
          onClick={(event) => {
            if (!control || !hasDevice) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 1080;
            const y = ((event.clientY - rect.top) / rect.height) * 2400;
            void act({ op: "tap", x, y });
          }}
        >
          {shot ? (
            // The frame is a live device screenshot, not a static asset.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shot} alt="" />
          ) : <DemoScreen name={name} />}
        </button>
        <div className="handset-keys">
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => act({ op: "key", key: "back" })}>Back</button>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => act({ op: "key", key: "home" })}>Home</button>
        </div>
      </div>
      <div className="phone-facts">
        <p><b>Number</b> {phone || "No carrier line yet"}</p>
        <p><b>Email</b> {email || "No inbox yet"}</p>
        <p><b>Signed in</b> {signed.length ? signed.map((item) => item.name).join(", ") : "No accounts yet"}</p>
        <div className="actions">
          <button type="button" className="btn btn-accent btn-sm" onClick={() => setWatching((value) => !value)}>{watching ? "Stop" : "Watch"}</button>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setControl((value) => !value)}>{control ? "Release" : "Take control"}</button>
        </div>
        {control && (
          <div className="form-grid">
            <label>Type<Input value={text} onChange={(event) => setText(event.target.value)} /></label>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => act({ op: "type", text })}>Type on the phone</button>
          </div>
        )}
        <h2>Accounts</h2>
        <p className="muted">Sign this phone into accounts the business already has. AgencyOps does not create them.</p>
        <ul className="account-list">
          {PHONE_APPS.map((item) => {
            const row = accounts.find((account) => account.packageName === item.packageName);
            return <li key={item.packageName}><b>{item.name}</b> <span>{row?.status || "Not signed in"}</span></li>;
          })}
        </ul>
        <div className="form-grid">
          <label>App
            <select value={app} onChange={(event) => setApp(event.target.value)}>
              {PHONE_APPS.map((item) => <option key={item.packageName} value={item.packageName}>{item.name}</option>)}
            </select>
          </label>
          <label>Username<Input value={username} onChange={(event) => setUsername(event.target.value)} /></label>
          <label>Password<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button type="button" className="btn btn-quiet btn-sm" onClick={saveLogin}>Save login for the agent</button>
        </div>
        {notice && <p className="hint">{notice}</p>}
      </div>
    </div>
  );
}

function DemoScreen({ name }: { name: string }) {
  return (
    <span className="demo-screen">
      <strong>{name}</strong>
      <em>Demo Android phone</em>
      <span>Gmail · Chrome · WhatsApp</span>
      <span>Instagram · X · Facebook</span>
      <span>LinkedIn · TikTok</span>
    </span>
  );
}
