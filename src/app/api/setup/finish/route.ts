import { setSession } from "@/lib/auth";
import { bad, ok } from "@/lib/http";
import { createDesk, type SetupSecrets } from "@/lib/onboarding";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    businessName?: string;
    industry?: string;
    accentColor?: string;
    ownerName?: string;
    email?: string;
    password?: string;
    agentIds?: string[];
    secrets?: SetupSecrets;
  } | null;
  if (!body?.businessName?.trim() || !body.industry?.trim() || !body.ownerName?.trim() || !body.email?.trim() || !body.password) {
    return bad("Name the business, the industry, and the owner account.");
  }
  if (body.password.length < 8) return bad("Use a password of at least 8 characters.");
  if (!/^#[0-9a-fA-F]{6}$/.test(body.accentColor || "")) return bad("Brand color needs a hex value like #2F62E6.");
  try {
    const created = await createDesk({
      businessName: body.businessName,
      industry: body.industry,
      accentColor: body.accentColor || "#2F62E6",
      ownerName: body.ownerName,
      email: body.email,
      password: body.password,
      agentIds: body.agentIds || [],
      secrets: body.secrets || {},
    });
    await setSession({ userId: created.user.id, agencyId: created.agency.id, role: created.user.role });
    return ok({
      slug: created.agency.slug,
      bots: created.bots.map((bot) => ({ slug: bot.slug, name: bot.name, statusLine: bot.statusLine })),
    });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "The desk could not be created.");
  }
}
