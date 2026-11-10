import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bad, ok } from "@/lib/http";
import { provisionBot } from "@/lib/provision";
import { slugify } from "@/lib/onboarding";

const COLORS = ["#2F62E6", "#3A6AE8", "#345EDC", "#4872EA", "#2A56D4", "#4E78EC"];

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return bad("Sign in required.", 401);
  const body = (await request.json().catch(() => null)) as { name?: string; roleTitle?: string } | null;
  const name = body?.name?.trim() || "";
  const roleTitle = body?.roleTitle?.trim() || "Teammate";
  if (!name) return bad("Name the agent.");
  const count = await prisma.bot.count({ where: { agencyId: user.agencyId } });
  let slug = slugify(name);
  const taken = await prisma.bot.findFirst({ where: { agencyId: user.agencyId, slug } });
  if (taken) slug = `${slug}-${count + 1}`;
  const bot = await prisma.bot.create({
    data: {
      agencyId: user.agencyId,
      slug,
      name,
      roleTitle,
      blurb: `${roleTitle} for ${user.agency.name}.`,
      color: COLORS[count % COLORS.length],
      instructions: `You handle ${roleTitle.toLowerCase()} for ${user.agency.name}. Draft anything a customer would receive and wait for approval.`,
      monthlyCapCents: 10000,
      sortOrder: count,
      statusLine: "Setting up",
    },
  });
  const resources = await provisionBot(bot);
  const updated = await prisma.bot.update({
    where: { id: bot.id },
    data: {
      email: resources.email || bot.email,
      phone: resources.phone || bot.phone,
      mailInboxId: resources.mailInboxId,
      phoneNumberId: resources.phoneNumberId,
      phoneDeviceId: resources.phoneDeviceId,
      phoneProvider: resources.phoneProvider,
      orgoComputerId: resources.orgoComputerId,
      orgoStatus: resources.orgoStatus,
      composioSummary: resources.composioSummary,
      provisionJson: resources.provisionJson,
      statusLine: resources.statusLine,
    },
  });
  return ok({ slug: updated.slug, statusLine: updated.statusLine, provision: resources.provisionJson });
}
