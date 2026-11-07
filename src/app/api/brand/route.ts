import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authed, bad } from "@/lib/http";

export async function POST(request: Request) {
  const { user, error } = await authed();
  if (!user) return error;
  if (user.role !== "OWNER") return bad("Only the owner can change the brand.", 403);
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    productName?: string;
    mark?: string;
    accentColor?: string;
  } | null;
  const name = body?.name?.trim() ?? "";
  const productName = body?.productName?.trim() ?? "";
  const mark = (body?.mark?.trim() || "A").slice(0, 2);
  const accentColor = body?.accentColor?.trim() || "#E6F08A";
  if (!name || !productName) return bad("Agency name and product name are required.");
  if (!/^#[0-9a-fA-F]{6}$/.test(accentColor)) return bad("Accent color needs a hex value like #E6F08A.");
  await prisma.agency.update({
    where: { id: user.agencyId },
    data: { name, productName, mark, accentColor },
  });
  await prisma.auditLog.create({
    data: {
      agencyId: user.agencyId,
      actorType: "user",
      actorId: user.id,
      actorName: user.name,
      action: "brand.updated",
      detail: `${productName} for ${name}`,
    },
  });
  return NextResponse.json({ ok: true });
}
