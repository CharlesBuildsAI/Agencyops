import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bad, ok } from "@/lib/http";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  if (!user) return bad("Sign in required.", 401);
  const { slug } = await context.params;
  const bot = await prisma.bot.findFirst({ where: { agencyId: user.agencyId, slug } });
  if (!bot) return bad("That agent is not on this desk.", 404);
  const body = (await request.json().catch(() => null)) as { name?: string; packageName?: string; username?: string } | null;
  if (!body?.packageName || !body.username?.trim()) return bad("Name the account.");
  const current = JSON.parse(bot.accountsJson || "[]") as { packageName?: string; name?: string; username?: string; status?: string }[];
  const next = current.filter((item) => item.packageName !== body.packageName);
  next.push({ name: body.name || body.packageName, packageName: body.packageName, username: body.username.trim(), status: "saved" });
  await prisma.bot.update({ where: { id: bot.id }, data: { accountsJson: JSON.stringify(next) } });
  return ok({ status: "saved" });
}
