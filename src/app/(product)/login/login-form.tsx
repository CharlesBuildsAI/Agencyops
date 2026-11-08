"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StarField } from "@/components/starfield";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({ showDemoHint }: { showDemoHint: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState(showDemoHint ? "rosa@rivera.insurance" : "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "Could not sign in.");
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <main className="login-wrap">
      <StarField />
      <form className="login-card" onSubmit={submit}>
        <span className="mark">A</span>
        <h1>AgencyOps</h1>
        <p className="muted">Outbound messages wait for a person. Bots do not give coverage advice.</p>
        <div className="form-grid">
          <Input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} aria-label="Email" required />
          <Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" aria-label="Password" required />
          {error && <p className="err">{error}</p>}
          <Button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        </div>
        {showDemoHint && (
          <p className="hint">
            Demo only, not a real agency: rosa@rivera.insurance / rivera-demo. No carrier or model keys required.
          </p>
        )}
        <p className="hint">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">Back to the site</a>
        </p>
      </form>
    </main>
  );
}
