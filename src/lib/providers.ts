import { secret } from "./runtime-secrets";

export type FetchLike = typeof fetch;

export type ProviderTest = { ok: boolean; detail: string };

type Json = Record<string, unknown>;

function clip(value: string) {
  return value.replace(/\s+/g, " ").slice(0, 220);
}

async function readBody(response: Response) {
  const text = await response.text();
  if (!text) return "";
  try {
    const json = JSON.parse(text) as { message?: string; error?: string; detail?: string };
    return clip(json.message || json.error || json.detail || text);
  } catch {
    return clip(text);
  }
}

async function request(fetchImpl: FetchLike, url: string, init: RequestInit) {
  const response = await fetchImpl(url, init);
  if (!response.ok) {
    const detail = await readBody(response);
    throw new Error(detail || `The provider returned ${response.status}.`);
  }
  if (response.status === 204 || response.status === 202) return {} as Json;
  const text = await response.text();
  if (!text) return {} as Json;
  return JSON.parse(text) as Json;
}

export async function testAgentMail(apiKey: string, fetchImpl: FetchLike = fetch): Promise<ProviderTest> {
  await request(fetchImpl, "https://api.agentmail.to/v0/inboxes?limit=1", {
    headers: { authorization: `Bearer ${apiKey}` },
  });
  return { ok: true, detail: "AgentMail accepted the key. Inboxes can be created." };
}

export async function createAgentMailInbox(input: { apiKey: string; name: string; clientId: string }, fetchImpl: FetchLike = fetch) {
  const json = await request(fetchImpl, "https://api.agentmail.to/v0/inboxes", {
    method: "POST",
    headers: { authorization: `Bearer ${input.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ display_name: input.name, client_id: input.clientId }),
  });
  const inboxId = String(json.inbox_id || "");
  const email = String(json.email || inboxId);
  if (!inboxId) throw new Error("AgentMail did not return an inbox id.");
  return { inboxId, email };
}

export async function deleteAgentMailInbox(apiKey: string, inboxId: string, fetchImpl: FetchLike = fetch) {
  await request(fetchImpl, `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inboxId)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${apiKey}` },
  });
}

export async function testAgentPhone(apiKey: string, fetchImpl: FetchLike = fetch): Promise<ProviderTest> {
  await request(fetchImpl, "https://api.agentphone.ai/v1/usage", {
    headers: { authorization: `Bearer ${apiKey}` },
  });
  return { ok: true, detail: "AgentPhone accepted the key. A new agent buys a US number on this account." };
}

export async function createAgentPhoneNumber(input: { apiKey: string; externalId: string }, fetchImpl: FetchLike = fetch) {
  const json = await request(fetchImpl, "https://api.agentphone.ai/v1/numbers", {
    method: "POST",
    headers: { authorization: `Bearer ${input.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ country: "US", externalId: input.externalId }),
  });
  const id = String(json.id || "");
  const phoneNumber = String(json.phoneNumber || "");
  if (!id || !phoneNumber) throw new Error("AgentPhone did not return a number.");
  return { id, phoneNumber, status: String(json.status || "active") };
}

export async function deleteAgentPhoneNumber(apiKey: string, numberId: string, fetchImpl: FetchLike = fetch) {
  await request(fetchImpl, `https://api.agentphone.ai/v1/numbers/${encodeURIComponent(numberId)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${apiKey}` },
  });
}

export async function testTwilio(sid: string, token: string, fetchImpl: FetchLike = fetch): Promise<ProviderTest> {
  await request(fetchImpl, `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}.json`, {
    headers: { authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` },
  });
  return { ok: true, detail: "Twilio accepted the account. A new agent buys a number on this account." };
}

export async function createTwilioNumber(sid: string, token: string, fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/IncomingPhoneNumbers.json`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ FriendlyName: "AgencyOps" }),
  });
  const json = (await response.json()) as { sid?: string; phone_number?: string; message?: string };
  if (!response.ok) throw new Error(json.message || `Twilio returned ${response.status}.`);
  if (!json.sid || !json.phone_number) throw new Error("Twilio did not return a number.");
  return { id: json.sid, phoneNumber: json.phone_number };
}

export async function deleteTwilioNumber(accountSid: string, token: string, numberSid: string, fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/IncomingPhoneNumbers/${encodeURIComponent(numberSid)}.json`,
    { method: "DELETE", headers: { authorization: `Basic ${Buffer.from(`${accountSid}:${token}`).toString("base64")}` } },
  );
  if (!response.ok && response.status !== 204) {
    throw new Error((await readBody(response)) || `Twilio returned ${response.status}.`);
  }
}

export async function testOrgo(apiKey: string, fetchImpl: FetchLike = fetch): Promise<ProviderTest> {
  const json = await request(fetchImpl, "https://www.orgo.ai/api/workspaces", {
    headers: { authorization: `Bearer ${apiKey}` },
  });
  const workspaces = Array.isArray(json.workspaces) ? json.workspaces : [];
  return {
    ok: true,
    detail: workspaces.length
      ? `Orgo accepted the key. ${workspaces.length} workspace${workspaces.length === 1 ? "" : "s"} visible.`
      : "Orgo accepted the key. No workspace was listed.",
  };
}

export async function createOrgoComputer(input: { apiKey: string; name: string }, fetchImpl: FetchLike = fetch) {
  const listed = await request(fetchImpl, "https://www.orgo.ai/api/workspaces", {
    headers: { authorization: `Bearer ${input.apiKey}` },
  });
  const workspaces = Array.isArray(listed.workspaces) ? listed.workspaces as { id?: string }[] : [];
  const workspaceId = workspaces.find((item) => item.id)?.id;
  if (!workspaceId) throw new Error("Orgo did not return a workspace, so no computer was created.");
  const json = await request(fetchImpl, "https://www.orgo.ai/api/computers", {
    method: "POST",
    headers: { authorization: `Bearer ${input.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      workspace_id: workspaceId,
      name: input.name.slice(0, 80),
      os: "linux",
      ram: 4,
      cpu: 1,
    }),
  });
  const id = String(json.id || "");
  if (!id) throw new Error("Orgo did not return a computer id.");
  return { id, status: String(json.status || "creating") };
}

export async function deleteOrgoComputer(apiKey: string, computerId: string, fetchImpl: FetchLike = fetch) {
  await request(fetchImpl, `https://www.orgo.ai/api/computers/${encodeURIComponent(computerId)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${apiKey}` },
  });
}

export async function testComposio(apiKey: string, fetchImpl: FetchLike = fetch): Promise<ProviderTest> {
  const summary = await listComposio(apiKey, fetchImpl);
  return { ok: true, detail: summary };
}

export async function listComposio(apiKey: string, fetchImpl: FetchLike = fetch) {
  const json = await request(fetchImpl, "https://backend.composio.dev/api/v3.1/connected_accounts?limit=20", {
    headers: { "x-api-key": apiKey },
  });
  const items = Array.isArray(json.items) ? json.items as { toolkit?: { slug?: string }; status?: string }[] : [];
  const names = items
    .map((item) => item.toolkit?.slug)
    .filter((slug): slug is string => Boolean(slug));
  if (names.length === 0) {
    return "Composio accepted the key. No app is connected yet. Connect apps in Composio; this desk does not sign you up for them.";
  }
  return `Connected in your Composio project: ${names.slice(0, 8).join(", ")}.`;
}

export async function testLlm(apiKey: string, fetchImpl: FetchLike = fetch): Promise<ProviderTest> {
  if (apiKey.startsWith("sk-ant-")) {
    await request(fetchImpl, "https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    });
    return { ok: true, detail: "Anthropic accepted the key." };
  }
  await request(fetchImpl, "https://api.openai.com/v1/models", {
    headers: { authorization: `Bearer ${apiKey}` },
  });
  return { ok: true, detail: "OpenAI accepted the key." };
}

export const PHONE_APPS = [
  { name: "Gmail", packageName: "com.google.android.gm" },
  { name: "Chrome", packageName: "com.android.chrome" },
  { name: "WhatsApp", packageName: "com.whatsapp" },
  { name: "Instagram", packageName: "com.instagram.android" },
  { name: "X", packageName: "com.twitter.android" },
  { name: "Facebook", packageName: "com.facebook.katana" },
  { name: "LinkedIn", packageName: "com.linkedin.android" },
  { name: "TikTok", packageName: "com.zhiliaoapp.musically" },
] as const;

const MOBILERUN = "https://api.mobilerun.ai/v1";

function deviceIdFrom(json: Json) {
  if (typeof json.id === "string") return json.id;
  const nested = json.device as Json | undefined;
  if (nested && typeof nested.id === "string") return nested.id;
  return "";
}

export async function testMobilerun(apiKey: string, fetchImpl: FetchLike = fetch): Promise<ProviderTest> {
  await request(fetchImpl, `${MOBILERUN}/devices?pageSize=1`, { headers: { authorization: `Bearer ${apiKey}` } });
  return { ok: true, detail: "Mobilerun accepted the key. Each agent can get its own Android phone." };
}

export async function createMobilerunPhone(input: { apiKey: string; name: string; idempotencyKey: string }, fetchImpl: FetchLike = fetch) {
  const json = await request(fetchImpl, `${MOBILERUN}/devices?deviceType=android_cloud_phone&billing=minute`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      "content-type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({ name: input.name.slice(0, 80) }),
  });
  const id = deviceIdFrom(json);
  if (!id) throw new Error("Mobilerun did not return a phone id.");
  return { id, state: String(json.state || "creating"), streamUrl: String(json.streamUrl || "") };
}

export async function deleteMobilerunPhone(apiKey: string, deviceId: string, fetchImpl: FetchLike = fetch) {
  await request(fetchImpl, `${MOBILERUN}/devices/${encodeURIComponent(deviceId)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${apiKey}` },
  });
}

export async function mobilerunScreenshot(apiKey: string, deviceId: string, fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(`${MOBILERUN}/devices/${encodeURIComponent(deviceId)}/screenshots?hideOverlay=true`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error((await readBody(response)) || `Mobilerun returned ${response.status}.`);
  return Buffer.from(await response.arrayBuffer());
}

export async function mobilerunTap(apiKey: string, deviceId: string, x: number, y: number, fetchImpl: FetchLike = fetch) {
  await request(fetchImpl, `${MOBILERUN}/devices/${encodeURIComponent(deviceId)}/tap`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ x: Math.round(x), y: Math.round(y) }),
  });
}

export async function mobilerunType(apiKey: string, deviceId: string, text: string, fetchImpl: FetchLike = fetch) {
  await request(fetchImpl, `${MOBILERUN}/devices/${encodeURIComponent(deviceId)}/keyboard`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

export async function mobilerunOpenApp(apiKey: string, deviceId: string, packageName: string, fetchImpl: FetchLike = fetch) {
  await request(fetchImpl, `${MOBILERUN}/devices/${encodeURIComponent(deviceId)}/apps/${encodeURIComponent(packageName)}`, {
    method: "PUT",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: "{}",
  });
}

export async function mobilerunSwipe(
  apiKey: string,
  deviceId: string,
  swipe: { startX: number; startY: number; endX: number; endY: number; duration: number },
  fetchImpl: FetchLike = fetch,
) {
  await request(fetchImpl, `${MOBILERUN}/devices/${encodeURIComponent(deviceId)}/swipe`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      startX: Math.round(swipe.startX),
      startY: Math.round(swipe.startY),
      endX: Math.round(swipe.endX),
      endY: Math.round(swipe.endY),
      duration: Math.max(10, Math.round(swipe.duration)),
    }),
  });
}

export async function mobilerunGlobal(apiKey: string, deviceId: string, action: 1 | 2, fetchImpl: FetchLike = fetch) {
  await request(fetchImpl, `${MOBILERUN}/devices/${encodeURIComponent(deviceId)}/global`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ action }),
  });
}

export async function mobilerunUiState(apiKey: string, deviceId: string, fetchImpl: FetchLike = fetch) {
  return request(fetchImpl, `${MOBILERUN}/devices/${encodeURIComponent(deviceId)}/ui-state?filter=true`, {
    headers: { authorization: `Bearer ${apiKey}` },
  });
}

export async function mobilerunInstallApp(apiKey: string, deviceId: string, packageName: string, fetchImpl: FetchLike = fetch) {
  await request(fetchImpl, `${MOBILERUN}/devices/${encodeURIComponent(deviceId)}/apps`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ packageName, background: true }),
  });
}

export async function mobilerunEsim(apiKey: string, deviceId: string, fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(`${MOBILERUN}/devices/${encodeURIComponent(deviceId)}/esim`, {
    headers: { authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) return [] as { carrier?: string; displayName?: string; isEmbedded?: boolean }[];
  const json = (await response.json()) as { carrier?: string; displayName?: string; isEmbedded?: boolean }[] | null;
  return Array.isArray(json) ? json : [];
}

export async function mobilerunIncludedNumber(apiKey: string, label: string, fetchImpl: FetchLike = fetch) {
  const json = await request(fetchImpl, `${MOBILERUN}/numbers/phones`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "Idempotency-Key": `ao-num-${label}`.slice(0, 255),
    },
    body: JSON.stringify({ country: "us", billingPreference: "included_only", label }),
  });
  const data = (json.data as Json | undefined) || json;
  return {
    numberId: String(data.numberId || ""),
    state: String(data.state || ""),
    checkoutUrl: typeof data.checkoutUrl === "string" ? data.checkoutUrl : "",
  };
}

export async function testLimrun(apiKey: string, fetchImpl: FetchLike = fetch): Promise<ProviderTest> {
  await request(fetchImpl, "https://api.limrun.com/v1/android_instances", { headers: { authorization: `Bearer ${apiKey}` } });
  return { ok: true, detail: "Limrun accepted the key. Each agent can get its own Android phone." };
}

export async function createLimrunPhone(input: { apiKey: string; name: string }, fetchImpl: FetchLike = fetch) {
  const json = await request(fetchImpl, "https://api.limrun.com/v1/android_instances", {
    method: "POST",
    headers: { authorization: `Bearer ${input.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      wait: false,
      metadata: { labels: { name: input.name.slice(0, 40) } },
      spec: { clues: [{ kind: "OSVersion", osVersion: "15" }] },
    }),
  });
  const metadata = json.metadata as Json | undefined;
  const id = String(metadata?.id || json.id || "");
  if (!id) throw new Error("Limrun did not return a phone id.");
  const status = json.status as Json | undefined;
  return { id, state: String(status?.state || "creating") };
}

export async function deleteLimrunPhone(apiKey: string, id: string, fetchImpl: FetchLike = fetch) {
  await request(fetchImpl, `https://api.limrun.com/v1/android_instances/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${apiKey}` },
  });
}

export function configuredProviders() {
  return {
    agentmail: Boolean(secret("AGENTMAIL_API_KEY")),
    agentphone: Boolean(secret("AGENTPHONE_API_KEY")),
    twilio: Boolean(secret("TWILIO_ACCOUNT_SID") && secret("TWILIO_AUTH_TOKEN")),
    orgo: Boolean(secret("ORGO_API_KEY")),
    composio: Boolean(secret("COMPOSIO_API_KEY")),
    llm: Boolean(secret("ANTHROPIC_API_KEY") || secret("OPENAI_API_KEY")),
  };
}
