import type { SendReceipt } from "../approvals";

type Payload = Record<string, unknown>;

function text(payload: Payload, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : "";
}

function sandbox(provider: string, detail: string): SendReceipt {
  return { provider, id: `${provider}_${Date.now().toString(36)}`, sandbox: true, detail };
}

export function channelMode() {
  return process.env.CHANNEL_MODE === "live" ? "live" : "mock";
}

async function sendTwilioSms(payload: Payload): Promise<SendReceipt> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (channelMode() !== "live" || !sid || !token || !from) {
    return sandbox("twilio", `Sandbox SMS to ${text(payload, "to")}. Twilio keys are not in use.`);
  }
  const body = new URLSearchParams({
    To: text(payload, "to"),
    From: from,
    Body: text(payload, "body"),
  });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await response.json()) as { sid?: string; message?: string };
  if (!response.ok) throw new Error(json.message || `Twilio returned ${response.status}`);
  return { provider: "twilio", id: json.sid || "sms", sandbox: false, detail: "Sent through Twilio." };
}

async function sendAgentPhone(payload: Payload): Promise<SendReceipt> {
  const key = process.env.AGENTPHONE_API_KEY;
  const base = process.env.AGENTPHONE_BASE_URL;
  if (channelMode() !== "live" || !key || !base) {
    return sandbox("agentphone", "AgentPhone adapter is idle. Set AGENTPHONE_API_KEY and AGENTPHONE_BASE_URL to dial.");
  }
  const response = await fetch(`${base.replace(/\/$/, "")}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ to: text(payload, "to"), body: text(payload, "body") || text(payload, "purpose") }),
  });
  if (!response.ok) throw new Error(`AgentPhone returned ${response.status}`);
  const json = (await response.json()) as { id?: string };
  return { provider: "agentphone", id: json.id || "call", sandbox: false, detail: "Handed to AgentPhone." };
}

async function sendAgentMail(payload: Payload): Promise<SendReceipt> {
  const key = process.env.AGENTMAIL_API_KEY;
  const inbox = process.env.AGENTMAIL_INBOX_ID;
  if (channelMode() !== "live" || !key || !inbox) {
    return sandbox("agentmail", `Sandbox email to ${text(payload, "to")}. AgentMail is not connected.`);
  }
  const response = await fetch(`https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inbox)}/messages/send`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      to: text(payload, "to"),
      subject: text(payload, "subject"),
      text: text(payload, "body"),
    }),
  });
  const json = (await response.json()) as { message_id?: string; message?: string };
  if (!response.ok) throw new Error(json.message || `AgentMail returned ${response.status}`);
  return { provider: "agentmail", id: json.message_id || "email", sandbox: false, detail: "Sent through AgentMail." };
}

export async function sendOutbound(kind: string, payload: Payload): Promise<SendReceipt> {
  if (kind === "sms") {
    if (process.env.AGENTPHONE_API_KEY && !process.env.TWILIO_ACCOUNT_SID) return sendAgentPhone(payload);
    return sendTwilioSms(payload);
  }
  if (kind === "email") return sendAgentMail(payload);
  if (kind === "call") {
    if (process.env.AGENTPHONE_API_KEY) return sendAgentPhone(payload);
    if (channelMode() === "live" && process.env.TWILIO_ACCOUNT_SID) {
      return sandbox("twilio", "Call approved. Twilio voice is recorded as a desk release in v1; the script is in the audit log.");
    }
    return sandbox("twilio", `Sandbox call to ${text(payload, "to")}. Nothing was dialed.`);
  }
  if (kind === "file") {
    return sandbox("desk", "Certificate released. Download is now available.");
  }
  throw new Error(`Unknown outbound kind ${kind}`);
}
