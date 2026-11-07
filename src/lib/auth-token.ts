import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ao_session";

export type SessionPayload = {
  userId: string;
  agencyId: string;
  role: string;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (value) return new TextEncoder().encode(value);
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production");
  }
  return new TextEncoder().encode("dev-only-agencyops-secret-change-me");
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
