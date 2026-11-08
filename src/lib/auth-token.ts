import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ao_session";

export type SessionPayload = {
  userId: string;
  agencyId: string;
  role: string;
};

const DEV_FALLBACK = "dev-only-agencyops-secret-change-me";

const WEAK_SECRETS = new Set([
  DEV_FALLBACK,
  "local-dev-agencyops-secret-please-change",
  "replace-with-a-long-random-string",
  "change-me",
]);

type Env = Record<string, string | undefined>;

/** Production reads AUTH_SECRET from the environment only. The dev fallback never signs production cookies. */
export function resolveAuthSecret(env: Env = process.env) {
  const value = env.AUTH_SECRET?.trim() ?? "";
  if (env.NODE_ENV === "production") {
    if (!value || value.length < 24 || WEAK_SECRETS.has(value)) {
      throw new Error(
        "AUTH_SECRET must be set from the environment to a unique value of at least 24 characters in production.",
      );
    }
    return new TextEncoder().encode(value);
  }
  if (value) return new TextEncoder().encode(value);
  return new TextEncoder().encode(DEV_FALLBACK);
}

function secret() {
  return resolveAuthSecret();
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.userId || !payload.agencyId || !payload.role) return null;
    return {
      userId: String(payload.userId),
      agencyId: String(payload.agencyId),
      role: String(payload.role),
    };
  } catch {
    return null;
  }
}
