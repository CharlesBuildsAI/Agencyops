"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function BrandForm({
  initial,
}: {
  initial: { name: string; productName: string; mark: string; accentColor: string };
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save() {
    setError("");
    setSaved(false);
    const response = await fetch("/api/brand", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error || "Could not save.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="form-grid">
      <label>Agency name<Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
      <label>Product<Input value={form.productName} onChange={(event) => setForm({ ...form, productName: event.target.value })} /></label>
      <label>Mark<Input value={form.mark} maxLength={2} onChange={(event) => setForm({ ...form, mark: event.target.value })} /></label>
      <label>Accent<Input value={form.accentColor} onChange={(event) => setForm({ ...form, accentColor: event.target.value })} /></label>
      {error && <p className="err">{error}</p>}
      {saved && <p className="faint">Saved. The highlight color updates on the next view.</p>}
      <Button onClick={save}>Save brand</Button>
    </div>
  );
}

export function MemoryForm({ slug, notes }: { slug: string; notes: string }) {
  const router = useRouter();
  const [value, setValue] = useState(notes);
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="form-grid"
      onSubmit={async (event) => {
        event.preventDefault();
        await fetch(`/api/bots/${slug}/memory`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ notes: value }),
        });
        setSaved(true);
        router.refresh();
      }}
    >
      <textarea className="field" rows={5} value={value} onChange={(event) => setValue(event.target.value)} aria-label="Memory notes" />
      <Button type="submit">Save notes</Button>
      {saved && <p className="faint">Saved. The bot reads this on the next turn.</p>}
    </form>
  );
}

export function VaultForm() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [username, setUsername] = useState("");
  return (
    <form
      className="form-grid"
      onSubmit={async (event) => {
        event.preventDefault();
        await fetch("/api/vault", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ label, username }),
        });
        setLabel("");
        setUsername("");
        router.refresh();
      }}
    >
      <Input placeholder="Portal name, e.g. Progressive" value={label} onChange={(event) => setLabel(event.target.value)} aria-label="Portal" required />
      <Input placeholder="Username hint only" value={username} onChange={(event) => setUsername(event.target.value)} aria-label="Username" />
      <Button type="submit">Add reference</Button>
    </form>
  );
}

export function ConnectorButtons({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  async function run(action: "connect" | "disconnect") {
    await fetch(`/api/connectors/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    router.refresh();
  }
  if (status === "connected") {
    return (
      <span className="row" style={{ gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => run("connect")}>Manage</button>
      </span>
    );
  }
  return <button className="btn btn-accent btn-sm" onClick={() => run("connect")}>Connect</button>;
}

export function PauseButton({ slug, paused }: { slug: string; paused: boolean }) {
  const router = useRouter();
  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        await fetch(`/api/bots/${slug}/pause`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ paused: !paused }),
        });
        router.refresh();
      }}
    >
      {paused ? "Resume" : "Pause"}
    </button>
  );
}
