import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bad, ok } from "@/lib/http";
import { provisionBot } from "@/lib/provision";

export async function POST(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  if (!user) return bad("Sign in required.", 401);
  const { slug } = await context.params;
  const bot = await prisma.bot.findFirst({ where: { agencyId: user.agencyId, slug } });
  if (!bot) return bad("That agent is not on this desk.", 404);
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
  return ok({ statusLine: updated.statusLine, provision: resources.provisionJson });
}
