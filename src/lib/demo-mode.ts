/**
 * Published showcase credentials. They are fictional and documented in the README.
 * Production refuses them unless DEMO_MODE is explicitly enabled.
 */
export const DEMO_OWNER_EMAIL = "rosa@rivera.insurance";
export const DEMO_OWNER_PASSWORD = "rivera-demo";
export const DEMO_INVITE_TOKEN = "staff-demo-token";

type Env = Record<string, string | undefined>;

export function demoModeEnabled(env: Env = process.env) {
  return /^(1|true|yes)$/i.test(env.DEMO_MODE ?? "");
}

/** Local development may use the showcase login. Production may not, unless DEMO_MODE is set. */
export function allowDemoCredentials(env: Env = process.env) {
  if (env.NODE_ENV !== "production") return true;
  return demoModeEnabled(env);
}

export function isPublishedDemoLogin(email: string, password: string) {
  return email.trim().toLowerCase() === DEMO_OWNER_EMAIL && password === DEMO_OWNER_PASSWORD;
}

export function demoLoginBlocked(email: string, password: string, env: Env = process.env) {
  return isPublishedDemoLogin(email, password) && !allowDemoCredentials(env);
}

export function demoInviteBlocked(token: string, env: Env = process.env) {
  return token === DEMO_INVITE_TOKEN && !allowDemoCredentials(env);
}

export function webhookAuthorized(header: string | null, env: Env = process.env) {
  const expected = env.DEMO_WEBHOOK_SECRET;
  if (env.NODE_ENV === "production") {
    if (!expected) return false;
    if (expected === "demo" && !demoModeEnabled(env)) return false;
    return header === expected;
  }
  if (expected) return header === expected;
  return header === "demo";
}
