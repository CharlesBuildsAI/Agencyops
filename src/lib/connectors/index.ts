export type ConnectorPing = { ok: boolean; sandbox: boolean; detail: string };

export class HawkSoftAdapter {
  readonly id = "hawksoft";

  configured() {
    return Boolean(process.env.HAWKSOFT_API_KEY && process.env.HAWKSOFT_AGENCY_ID);
  }

  async ping(): Promise<ConnectorPing> {
    if (!this.configured()) {
      return { ok: true, sandbox: true, detail: "Sandbox connected. HawkSoft credentials are not set." };
    }
    return { ok: true, sandbox: false, detail: "API key on file. Live filing stays off in v1." };
  }
}

export class Ams360Adapter {
  readonly id = "ams360";

  configured() {
    return Boolean(process.env.AMS360_APP_KEY);
  }

  async ping(): Promise<ConnectorPing> {
    if (!this.configured()) {
      return { ok: true, sandbox: true, detail: "Sign-in simulated. AMS360 app key is not set." };
    }
    return { ok: true, sandbox: false, detail: "App key on file. Screen work stays on the bot computer." };
  }
}

export class ComposioAdapter {
  readonly id = "composio";

  configured() {
    return Boolean(process.env.COMPOSIO_API_KEY);
  }

  async ping(): Promise<ConnectorPing> {
    if (!this.configured()) {
      return { ok: true, sandbox: true, detail: "Sandbox. Composio API key is not set." };
    }
    return { ok: true, sandbox: false, detail: "API key on file · 1,400 apps. Actions still wait for approval." };
  }
}

export function adapterFor(key: string) {
  if (key === "hawksoft") return new HawkSoftAdapter();
  if (key === "ams360") return new Ams360Adapter();
  if (key === "composio") return new ComposioAdapter();
  return null;
}
