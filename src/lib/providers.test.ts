import { describe, expect, it, vi } from "vitest";
import { createAgentMailInbox, testAgentMail, testAgentPhone } from "./providers";
import { provisionBot } from "./provision";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("provider calls", () => {
  it("accepts an AgentMail key when listing inboxes succeeds", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ count: 0, inboxes: [] }));
    const result = await testAgentMail("am_test", fetchImpl as unknown as typeof fetch);
    expect(result.ok).toBe(true);
    const call = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[0]).toBe("https://api.agentmail.to/v0/inboxes?limit=1");
    expect(call[1].headers).toMatchObject({ authorization: "Bearer am_test" });
  });

  it("creates an inbox with a client id and no pasted key in the error", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ message: "bad key am_secret" }, 401));
    await expect(createAgentMailInbox({ apiKey: "am_secret", name: "Ada", clientId: "ao-1" }, fetchImpl as unknown as typeof fetch)).rejects.toThrow(/bad key/);
  });

  it("reports a skipped phone service without calling the network", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    const result = await provisionBot({ id: "bot1", name: "Ada", slug: "ada", mailInboxId: "", phoneNumberId: "", orgoComputerId: "" });
    expect(result.provisionJson).toContain("demo phone");
    expect(result.phone).toBe("");
    expect(fetchImpl).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("surfaces an AgentPhone error from the usage check", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ message: "Invalid token" }, 401));
    await expect(testAgentPhone("bad", fetchImpl as unknown as typeof fetch)).rejects.toThrow("Invalid token");
  });
});
