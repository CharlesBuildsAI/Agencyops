import { setSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bad, ok } from "@/lib/http";
import { loadInsuranceSample } from "@/lib/onboarding";

export async function POST() {
  try {
    await loadInsuranceSample();
    const user = await prisma.user.findFirst({ where: { email: "rosa@rivera.insurance" } });
    if (!user) return bad("The sample desk did not create an owner.");
    await setSession({ userId: user.id, agencyId: user.agencyId, role: user.role });
    return ok({ href: "/app" });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "The sample could not be loaded.");
  }
}
