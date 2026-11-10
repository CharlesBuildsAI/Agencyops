"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STARTER_AGENTS } from "@/lib/starters";
import { Input } from "@/components/ui/input";

declare global {
  interface Window {
    agencyops?: {
      saveSecrets: (secrets: Record<string, string>) => Promise<{ ok: boolean; error?: string }>;
    };
  }
}

const STEPS = ["Business", "Account", "Phone", "Model", "Email", "Apps", "Desktop", "Team"] as const;

type Secrets = {
  agentmail: string;
  mobilerun: string;
  limrun: string;
  agentphone: string;
  twilioSid: string;
  twilioToken: string;
  orgo: string;
  composio: string;
  llm: string;
};

const EMPTY: Secrets = {
  agentmail: "",
  mobilerun: "",
  limrun: "",
  agentphone: "",
  twilioSid: "",
  twilioToken: "",
  orgo: "",
  composio: "",
  llm: "",
};

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [accentColor, setAccentColor] = useState("#2F62E6");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secrets, setSecrets] = useState<Secrets>(EMPTY);
  const [phoneChoice, setPhoneChoice] = useState<"mobilerun" | "limrun">("mobilerun");
  const [agents, setAgents] = useState<string[]>(["ada", "nia"]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function test(provider: string, value: string, extra?: { sid?: string; token?: string }) {
    setBusy(true);
    setNotice("");
    const response = await fetch("/api/setup/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, value, ...extra }),
    });
    const data = (await response.json()) as { ok?: boolean; detail?: string; error?: string };
    setBusy(false);
    setNotice(data.detail || data.error || "No answer from the provider.");
  }

  function skip() {
    setNotice("");
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
  }

  async function finish(sample = false) {
    setBusy(true);
    setNotice("");
    if (!sample && window.agencyops) {
      const saved = await window.agencyops.saveSecrets({
        AGENTMAIL_API_KEY: secrets.agentmail,
        MOBILERUN_CLOUD_API_KEY: secrets.mobilerun,
        LIM_API_KEY: secrets.limrun,
        AGENTPHONE_API_KEY: secrets.agentphone,
        TWILIO_ACCOUNT_SID: secrets.twilioSid,
        TWILIO_AUTH_TOKEN: secrets.twilioToken,
        ORGO_API_KEY: secrets.orgo,
        COMPOSIO_API_KEY: secrets.composio,
        ANTHROPIC_API_KEY: secrets.llm.startsWith("sk-ant-") ? secrets.llm : "",
        OPENAI_API_KEY: secrets.llm && !secrets.llm.startsWith("sk-ant-") ? secrets.llm : "",
      });
      if (!saved.ok) {
        setBusy(false);
        setNotice(saved.error || "The keychain could not store these keys.");
        return;
      }
    }
    const response = await fetch(sample ? "/api/setup/sample" : "/api/setup/finish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: sample ? "{}" : JSON.stringify({
        businessName,
        industry,
        accentColor,
        ownerName,
        email,
        password,
        agentIds: agents,
        secrets: {
          agentmail: secrets.agentmail,
          mobilerun: secrets.mobilerun,
          limrun: secrets.limrun,
          agentphone: secrets.agentphone,
          twilioSid: secrets.twilioSid,
          twilioToken: secrets.twilioToken,
          orgo: secrets.orgo,
          composio: secrets.composio,
          llm: secrets.llm,
        },
      }),
    });
    const data = (await response.json()) as { error?: string; bots?: { slug: string }[] };
    setBusy(false);
    if (!response.ok) {
      setNotice(data.error || "Setup did not finish.");
      return;
    }
    const first = data.bots?.[0]?.slug;
    router.push(first ? `/app/bots/${first}/profile` : "/app");
    router.refresh();
  }

  return (
    <main className="login-wrap">
      <form className="login-card wizard" onSubmit={(event) => event.preventDefault()}>
        <p className="kicker mono">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
        <h1>Set up AgencyOps</h1>
        {step === 0 && (
          <div className="form-grid">
            <label>Business name<Input value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Northwind Studio" /></label>
            <label>Industry<Input value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder="Design studio, clinic, agency…" /></label>
            <label>Brand color<Input value={accentColor} onChange={(event) => setAccentColor(event.target.value)} placeholder="#2F62E6" /></label>
          </div>
        )}
        {step === 1 && (
          <div className="form-grid">
            <label>Your name<Input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} /></label>
            <label>Email<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>
          </div>
        )}
        {step === 4 && (
          <KeyStep
            label="AgentMail API key"
            href="https://www.agentmail.to/docs/quickstart"
            link="Get an AgentMail key"
            value={secrets.agentmail}
            onChange={(value) => setSecrets({ ...secrets, agentmail: value })}
            onTest={() => test("agentmail", secrets.agentmail)}
            busy={busy}
          />
        )}
        {step === 2 && (
          <div className="form-grid">
            <p className="muted">Each agent gets its own Android phone. Mobilerun is the phone we can drive from the desk. Limrun is the other phone key. Skip and the phone stays a demo screen.</p>
            <label className="follow-toggle"><input type="radio" checked={phoneChoice === "mobilerun"} onChange={() => setPhoneChoice("mobilerun")} /> Mobilerun</label>
            <label className="follow-toggle"><input type="radio" checked={phoneChoice === "limrun"} onChange={() => setPhoneChoice("limrun")} /> Limrun</label>
            {phoneChoice === "mobilerun" ? (
              <KeyStep
                label="Mobilerun API key"
                href="https://docs.mobilerun.ai/cloud/quickstart"
                link="Mobilerun cloud quickstart"
                value={secrets.mobilerun}
                onChange={(value) => setSecrets({ ...secrets, mobilerun: value })}
                onTest={() => test("mobilerun", secrets.mobilerun)}
                busy={busy}
                note="A new agent provisions an Android phone on your account. An included phone number is requested. If Mobilerun would charge or open checkout, we stop and can use AgentPhone or Twilio instead."
              />
            ) : (
              <KeyStep
                label="Limrun API key"
                href="https://docs.limrun.com/docs/android/run-emulator"
                link="Limrun Android docs"
                value={secrets.limrun}
                onChange={(value) => setSecrets({ ...secrets, limrun: value })}
                onTest={() => test("limrun", secrets.limrun)}
                busy={busy}
                note="Limrun creates the Android phone. Its management API does not tap, type, or install. Use Mobilerun if the agent should use the screen."
              />
            )}
            <p className="muted">Optional line if the phone has no number of its own.</p>
            <label>AgentPhone key<Input type="password" value={secrets.agentphone} onChange={(event) => setSecrets({ ...secrets, agentphone: event.target.value })} /></label>
            <label>Twilio SID<Input value={secrets.twilioSid} onChange={(event) => setSecrets({ ...secrets, twilioSid: event.target.value })} /></label>
            <label>Twilio token<Input type="password" value={secrets.twilioToken} onChange={(event) => setSecrets({ ...secrets, twilioToken: event.target.value })} /></label>
          </div>
        )}
        {step === 6 && (
          <KeyStep
            label="Orgo API key"
            href="https://docs.orgo.ai/quickstart"
            link="Create an Orgo key"
            value={secrets.orgo}
            onChange={(value) => setSecrets({ ...secrets, orgo: value })}
            onTest={() => test("orgo", secrets.orgo)}
            busy={busy}
            note="Optional. The Android phone is the device the agent uses. Orgo adds a separate desktop computer."
          />
        )}
        {step === 5 && (
          <KeyStep
            label="Composio API key"
            href="https://docs.composio.dev/docs/authentication"
            link="Composio authentication"
            value={secrets.composio}
            onChange={(value) => setSecrets({ ...secrets, composio: value })}
            onTest={() => test("composio", secrets.composio)}
            busy={busy}
            note="Apps are connected by you in Composio. This desk lists them. It does not open accounts on other sites."
          />
        )}
        {step === 3 && (
          <KeyStep
            label="Anthropic or OpenAI key"
            href="https://console.anthropic.com/"
            link="Anthropic console"
            value={secrets.llm}
            onChange={(value) => setSecrets({ ...secrets, llm: value })}
            onTest={() => test("llm", secrets.llm)}
            busy={busy}
            note="A key that starts with sk-ant- is checked at Anthropic. Any other key is checked at OpenAI. Skip and the desk stays on the built-in mock."
          />
        )}
        {step === 7 && (
          <div className="form-grid">
            <p className="muted">Pick the people to start with. You can add more later.</p>
            {STARTER_AGENTS.map((agent) => (
              <label key={agent.id} className="follow-toggle">
                <input
                  type="checkbox"
                  checked={agents.includes(agent.id)}
                  onChange={(event) => setAgents(event.target.checked ? [...agents, agent.id] : agents.filter((id) => id !== agent.id))}
                />
                {agent.name} · {agent.roleTitle}
              </label>
            ))}
          </div>
        )}
        {notice && <p className="hint">{notice}</p>}
        <div className="actions">
          {step > 0 && <button className="btn btn-quiet" type="button" onClick={() => setStep(step - 1)}>Back</button>}
          {step > 1 && step < 7 && <button className="btn btn-quiet" type="button" onClick={skip}>Skip</button>}
          {step < 7 && <button className="btn btn-accent" type="button" onClick={() => setStep(step + 1)}>Continue</button>}
          {step === 7 && <button className="btn btn-accent" type="button" disabled={busy} onClick={() => finish(false)}>{busy ? "Creating…" : "Create the desk"}</button>}
        </div>
        {step === 7 && (
          <p className="hint">
            <button className="btn btn-quiet" type="button" disabled={busy} onClick={() => finish(true)}>Use the Rivera Insurance sample</button>
          </p>
        )}
      </form>
    </main>
  );
}

function KeyStep({
  label,
  href,
  link,
  value,
  onChange,
  onTest,
  busy,
  note,
}: {
  label: string;
  href: string;
  link: string;
  value: string;
  onChange: (value: string) => void;
  onTest: () => void;
  busy: boolean;
  note?: string;
}) {
  return (
    <div className="form-grid">
      {note && <p className="muted">{note}</p>}
      <label>{label}<Input type="password" value={value} onChange={(event) => onChange(event.target.value)} autoComplete="off" /></label>
      <p className="muted"><a href={href}>{link}</a></p>
      <button className="btn btn-quiet" type="button" disabled={busy || !value.trim()} onClick={onTest}>Test</button>
    </div>
  );
}
