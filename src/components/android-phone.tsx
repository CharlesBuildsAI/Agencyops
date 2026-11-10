"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { PHONE_APPS } from "@/lib/providers";

type Account = { name?: string; status?: string; packageName?: string; username?: string };

export function AndroidPhone({
  slug,
  name,
  phone,
  email,
  hasDevice,
  provider,
  accounts,
  initialTab = "phone",
}: {
  slug: string;
  name: string;
  phone: string;
  email: string;
  hasDevice: boolean;
  provider: string;
  accounts: Account[];
  initialTab?: "phone" | "accounts";
}) {
  const [tab, setTab] = useState(initialTab);
  const [watching, setWatching] = useState(false);
  const [control, setControl] = useState(false);
  const [frame, setFrame] = useState(0);
  const [shot, setShot] = useState("");
  const [notice, setNotice] = useState("");
  const [text, setText] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [app, setApp] = useState<string>(PHONE_APPS[0].packageName);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!watching || !hasDevice || provider !== "mobilerun") return;
    let stop = false;
    const pull = async () => {
      const response = await fetch(`/api/bots/${slug}/phone/screen?t=${Date.now()}`);
      if (stop) return;
      if (response.status === 204) {
        setWatching(false);
        setNotice("No live screen yet. Add a Mobilerun key in setup, then press Watch.");
        return;
      }
      if (!response.ok) return;
      const blob = await response.blob();
      if (!blob.size) return;
      setShot((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
    };
    void pull();
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
    setNotice(data.error || "Login saved in the keychain. Sign in on the phone. No new account is created.");
    setLoginOpen(false);
    if (hasDevice) await act({ op: "open_app", packageName: app });
  }

  return (
    <aside className={`panel computer-panel phone-pane${tab === "accounts" ? " is-accounts" : ""}`}>
      <div className="comp-head">
        <strong>{name}&apos;s Android phone</strong>
      </div>
      <div className="handset">
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
            // Live device frame, not a static asset.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shot} alt="" />
          ) : watching && hasDevice && provider === "mobilerun" ? (
            <span className="phone-skeleton" aria-label="Loading the phone screen"><i /><i /><i /></span>
          ) : (
            <DemoScreen name={name} hasDevice={hasDevice} />
          )}
        </button>
        <div className="handset-keys">
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => act({ op: "key", key: "back" })}>Back</button>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => act({ op: "key", key: "home" })}>Home</button>
        </div>
      </div>
      <div className="actions phone-actions">
        <button type="button" className="btn btn-accent btn-sm" onClick={() => setWatching((value) => !value)}>{watching ? "Stop" : "Watch"}</button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setControl((value) => !value)}>{control ? "Release" : "Take control"}</button>
      </div>
      {control && (
        <div className="form-grid phone-type">
          <Input value={text} onChange={(event) => setText(event.target.value)} placeholder="Type on the phone" aria-label="Type on the phone" />
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => act({ op: "type", text })}>Type</button>
        </div>
      )}
      <div className="phone-tabs">
        <button type="button" className={tab === "phone" ? "on" : ""} onClick={() => setTab("phone")}>Line</button>
        <button type="button" className={tab === "accounts" ? "on" : ""} onClick={() => setTab("accounts")}>Accounts</button>
      </div>
      {tab === "phone" ? (
        <div className="phone-facts" key="phone">
          <p><b>Number</b> {phone || "No carrier line yet. A Mobilerun key, or AgentPhone or Twilio, assigns one."}</p>
          <p><b>Email</b> {email || "No inbox yet. Add an AgentMail key in setup to give this phone one."}</p>
        </div>
      ) : (
        <div className="phone-facts" key="accounts">
          <p className="muted">Sign in with an account the business already has. This does not create a new one.</p>
          <table className="account-table">
            <thead><tr><th>App</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {PHONE_APPS.map((item) => {
                const row = accounts.find((account) => account.packageName === item.packageName);
                return (
                  <tr key={item.packageName}>
                    <td>{item.name}</td>
                    <td>{row?.status === "saved" ? `Saved · ${row.username || ""}` : "Not signed in"}</td>
                    <td><button type="button" className="btn btn-quiet btn-sm" onClick={() => { setControl(true); void act({ op: "open_app", packageName: item.packageName }); }}>Sign in</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setLoginOpen((value) => !value)}>{loginOpen ? "Close" : "Save a login"}</button>
          {loginOpen && (
            <div className="form-grid">
              <p className="muted">Use an account the business already has. This does not create one.</p>
              <label>App
                <select value={app} onChange={(event) => setApp(event.target.value)}>
                  {PHONE_APPS.map((item) => <option key={item.packageName} value={item.packageName}>{item.name}</option>)}
                </select>
              </label>
              <label>Username<Input value={username} onChange={(event) => setUsername(event.target.value)} /></label>
              <label>Password<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
              <button type="button" className="btn btn-accent btn-sm" onClick={saveLogin}>Save in the keychain</button>
            </div>
          )}
        </div>
      )}
      {notice && <p className="hint">{notice}</p>}
    </aside>
  );
}

function DemoScreen({ name, hasDevice }: { name: string; hasDevice: boolean }) {
  return (
    <span className="demo-screen">
      <strong>{name}</strong>
      <em>Android phone</em>
      <span>{hasDevice ? "Press Watch to load the live screen." : "Add a Mobilerun key in setup to put a live phone here."}</span>
      <span>Gmail · Chrome · WhatsApp</span>
      <span>Instagram · X · Facebook</span>
      <span>LinkedIn · TikTok</span>
    </span>
  );
}
