import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authed, bad } from "@/lib/http";

export async function POST(request: Request) {
  const { user, error } = await authed();
  if (!user) return error;
  const body = (await request.json().catch(() => null)) as { label?: string; username?: string } | null;
  const label = body?.label?.trim() ?? "";
  if (!label) return bad("Name the portal. Leave the password in your keychain.");
  await prisma.vaultEntry.create({
    data: {
      agencyId: user.agencyId,
      label,
      username: body?.username?.trim() ?? "",
      secretRef: "keychain",
    },
  });
  await prisma.auditLog.create({
    data: {
      agencyId: user.agencyId,
      actorType: "user",
      actorId: user.id,
      actorName: user.name,
      action: "vault.referenced",
      detail: `${label} reference added. No secret stored.`,
    },
  });
  return NextResponse.json({ ok: true });
}
