import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mobilerunScreenshot } from "@/lib/providers";
import { secret } from "@/lib/runtime-secrets";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  if (!user) return new Response("Sign in required.", { status: 401 });
  const { slug } = await context.params;
  const bot = await prisma.bot.findFirst({ where: { agencyId: user.agencyId, slug } });
  const key = secret("MOBILERUN_CLOUD_API_KEY");
  if (!bot?.phoneDeviceId || bot.phoneProvider !== "mobilerun" || !key) {
    return new Response(null, { status: 204 });
  }
  const png = await mobilerunScreenshot(key, bot.phoneDeviceId);
  return new Response(png, { headers: { "content-type": "image/png", "cache-control": "no-store" } });
}
