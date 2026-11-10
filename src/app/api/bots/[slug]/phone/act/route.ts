import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bad, ok } from "@/lib/http";
import { runPhoneCommand, type PhoneCommand } from "@/lib/phone-actions";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  if (!user) return bad("Sign in required.", 401);
  const { slug } = await context.params;
  const bot = await prisma.bot.findFirst({ where: { agencyId: user.agencyId, slug } });
  if (!bot) return bad("That agent is not on this desk.", 404);
  const body = (await request.json().catch(() => null)) as PhoneCommand | null;
  if (!body?.op) return bad("Missing action.");
  if (body.op === "install_app") return bad("Installs wait for approval in chat.");
  const result = await runPhoneCommand({ provider: bot.phoneProvider || "mock", deviceId: bot.phoneDeviceId }, body);
  return ok({ detail: result.detail });
}
