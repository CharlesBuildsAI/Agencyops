import { describe, expect, it } from "vitest";
import {
  DEMO_INVITE_TOKEN,
  DEMO_OWNER_EMAIL,
  DEMO_OWNER_PASSWORD,
  allowDemoCredentials,
  demoInviteBlocked,
  demoLoginBlocked,
  webhookAuthorized,
} from "./demo-mode";
import { resolveAuthSecret } from "./auth-token";

const production = { NODE_ENV: "production" };

describe("demo credentials", () => {
  it("allows the published login in development", () => {
    expect(allowDemoCredentials({ NODE_ENV: "development" })).toBe(true);
    expect(demoLoginBlocked(DEMO_OWNER_EMAIL, DEMO_OWNER_PASSWORD, { NODE_ENV: "test" })).toBe(false);
  });

  it("refuses the published login and invite in production unless DEMO_MODE is set", () => {
    expect(demoLoginBlocked(DEMO_OWNER_EMAIL, DEMO_OWNER_PASSWORD, production)).toBe(true);
    expect(demoInviteBlocked(DEMO_INVITE_TOKEN, production)).toBe(true);
    expect(demoLoginBlocked(DEMO_OWNER_EMAIL, "a-different-password", production)).toBe(false);
    const showcase = { ...production, DEMO_MODE: "true" };
    expect(allowDemoCredentials(showcase)).toBe(true);
    expect(demoLoginBlocked(DEMO_OWNER_EMAIL, DEMO_OWNER_PASSWORD, showcase)).toBe(false);
    expect(demoInviteBlocked(DEMO_INVITE_TOKEN, showcase)).toBe(false);
  });

  it("does not accept the demo webhook secret in production without DEMO_MODE", () => {
    expect(webhookAuthorized("demo", production)).toBe(false);
    expect(webhookAuthorized("demo", { ...production, DEMO_WEBHOOK_SECRET: "demo" })).toBe(false);
    expect(webhookAuthorized("s3cret-value", { ...production, DEMO_WEBHOOK_SECRET: "s3cret-value" })).toBe(true);
    expect(webhookAuthorized("demo", { NODE_ENV: "development" })).toBe(true);
  });
});

describe("auth secret", () => {
  it("requires a unique environment secret in production", () => {
    expect(() => resolveAuthSecret(production)).toThrow(/AUTH_SECRET/);
    expect(() => resolveAuthSecret({ ...production, AUTH_SECRET: "replace-with-a-long-random-string" })).toThrow(
      /AUTH_SECRET/,
    );
    expect(() => resolveAuthSecret({ ...production, AUTH_SECRET: "dev-only-agencyops-secret-change-me" })).toThrow(
      /AUTH_SECRET/,
    );
    const secret = resolveAuthSecret({
      ...production,
      AUTH_SECRET: "a-unique-production-secret-value",
    });
    expect(secret.byteLength).toBeGreaterThan(20);
  });

  it("falls back only outside production when AUTH_SECRET is unset", () => {
    expect(resolveAuthSecret({ NODE_ENV: "development" }).byteLength).toBeGreaterThan(10);
    expect(resolveAuthSecret({ NODE_ENV: "test", AUTH_SECRET: "local-test-secret" })).toEqual(
      new TextEncoder().encode("local-test-secret"),
    );
  });
});
