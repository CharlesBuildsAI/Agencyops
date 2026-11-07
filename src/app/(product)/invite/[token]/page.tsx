"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/auth/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: params.token, name, password }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error || "Invite could not be accepted.");
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <main className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <span className="mark">A</span>
        <h1>Join the desk</h1>
        <p className="muted">Set your name and a password. You can approve drafts. Bots still can&apos;t send on their own.</p>
        <div className="form-grid">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" aria-label="Name" required />
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password, 8+ characters" aria-label="Password" required />
          {error && <p className="err">{error}</p>}
          <Button type="submit">Join workspace</Button>
        </div>
      </form>
    </main>
  );
}
