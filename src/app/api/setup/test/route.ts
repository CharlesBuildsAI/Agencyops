import { bad, ok } from "@/lib/http";
import { testAgentMail, testAgentPhone, testComposio, testLimrun, testLlm, testMobilerun, testOrgo, testTwilio } from "@/lib/providers";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    provider?: string;
    value?: string;
    sid?: string;
    token?: string;
  } | null;
  const provider = body?.provider || "";
  try {
    if (provider === "agentmail") return ok(await testAgentMail(body?.value || ""));
    if (provider === "mobilerun") return ok(await testMobilerun(body?.value || ""));
    if (provider === "limrun") return ok(await testLimrun(body?.value || ""));
    if (provider === "agentphone") return ok(await testAgentPhone(body?.value || ""));
    if (provider === "twilio") return ok(await testTwilio(body?.sid || "", body?.token || ""));
    if (provider === "orgo") return ok(await testOrgo(body?.value || ""));
    if (provider === "composio") return ok(await testComposio(body?.value || ""));
    if (provider === "llm") return ok(await testLlm(body?.value || ""));
    return bad("Unknown provider.");
  } catch (error) {
    const detail = error instanceof Error ? error.message : "The key was rejected.";
    return ok({ ok: false, detail });
  }
}
