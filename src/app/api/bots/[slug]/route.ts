import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bad, ok } from "@/lib/http";
import { releaseBotResources } from "@/lib/provision";

export async function DELETE(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  if (!user) return bad("Sign in required.", 401);
  const { slug } = await context.params;
  const bot = await prisma.bot.findFirst({ where: { agencyId: user.agencyId, slug } });
  if (!bot) return bad("That agent is not on this desk.", 404);
  const errors = await releaseBotResources(bot);
  await prisma.bot.delete({ where: { id: bot.id } });
  return ok({ released: errors.length === 0, errors });
}
