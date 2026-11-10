"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export function AgentResources({
  slug,
  email,
  phone,
  orgoStatus,
  orgoComputerId,
  composioSummary,
  errors,
}: {
  slug: string;
  email: string;
  phone: string;
  orgoStatus: string;
  orgoComputerId: string;
  composioSummary: string;
  errors: { mail?: string; phone?: string; orgo?: string; composio?: string };
}) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function retry() {
    setBusy(true);
    setNotice("");
    const response = await fetch(`/api/bots/${slug}/provision`, { method: "POST" });
    const data = (await response.json()) as { error?: string; statusLine?: string };
    setBusy(false);
    setNotice(data.error || data.statusLine || "Retried.");
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`Remove ${slug}? A provisioned inbox, number, and computer will be released.`)) return;
    setBusy(true);
    const response = await fetch(`/api/bots/${slug}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string; errors?: string[] };
    setBusy(false);
    if (!response.ok) {
      setNotice(data.error || "Could not remove the agent.");
      return;
    }
    if (data.errors && data.errors.length > 0) setNotice(data.errors.join(" "));
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="block">
      <h2>Services</h2>
      <div className="line"><span>Email<small>{email || errors.mail || "No inbox yet"}</small></span></div>
      <div className="line"><span>Phone<small>{phone || errors.phone || "No number yet"}</small></span></div>
      <div className="line"><span>Desktop<small>{orgoComputerId ? `${orgoStatus || "created"} · ${orgoComputerId}` : errors.orgo || "Optional. The Android phone is the main device."}</small></span></div>
      <div className="line"><span>Apps<small>{composioSummary || errors.composio || "Composio not connected"}</small></span></div>
      {notice && <p className="faint">{notice}</p>}
      <div className="actions">
        <button className="btn btn-quiet btn-sm" type="button" disabled={busy} onClick={retry}>{busy ? "Working…" : "Retry setup"}</button>
        <button className="btn btn-danger btn-sm" type="button" disabled={busy} onClick={remove}>Remove agent</button>
      </div>
    </div>
  );
}

export function NewAgentForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    setNotice("");
    const response = await fetch("/api/bots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, roleTitle }),
    });
    const data = (await response.json()) as { error?: string; slug?: string; statusLine?: string };
    setBusy(false);
    if (!response.ok || !data.slug) {
      setNotice(data.error || "Could not create the agent.");
      return;
    }
    router.push(`/app/bots/${data.slug}/profile`);
    router.refresh();
  }

  return (
    <div className="sheet" style={{ padding: 16, marginTop: 16 }}>
      <h2 style={{ marginTop: 0 }}>New agent</h2>
      <p className="faint">If a key is saved, this creates that service for real. Skipped keys stay in demo mode and show a retry on the profile.</p>
      <div className="form-grid">
        <label>Name<Input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Role<Input value={roleTitle} onChange={(event) => setRoleTitle(event.target.value)} placeholder="Front desk" /></label>
        <button className="btn btn-accent" type="button" disabled={busy} onClick={create}>{busy ? "Creating…" : "Create agent"}</button>
        {notice && <p className="hint">{notice}</p>}
      </div>
    </div>
  );
}
