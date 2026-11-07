import { NextResponse } from "next/server";
import { adapterFor } from "@/lib/connectors";
import { prisma } from "@/lib/db";
import { authed, bad } from "@/lib/http";

export async function POST(request: Request, context: { params: Promise<{ key: string }> }) {
  const { user, error } = await authed();
  if (!user) return error;
  const { key } = await context.params;
  const body = (await request.json().catch(() => null)) as { action?: "connect" | "disconnect" } | null;
  const connector = await prisma.connector.findFirst({ where: { agencyId: user.agencyId, key } });
  if (!connector) return bad("Unknown connector.", 404);
  if (body?.action === "disconnect") {
    await prisma.connector.update({
      where: { id: connector.id },
      data: { status: "disconnected", detail: "Not connected" },
    });
  } else {
    const adapter = adapterFor(key);
    const ping = adapter ? await adapter.ping() : { ok: true, sandbox: true, detail: "Connected" };
    await prisma.connector.update({
      where: { id: connector.id },
      data: { status: "connected", detail: ping.detail },
    });
  }
  await prisma.auditLog.create({
    data: {
      agencyId: user.agencyId,
      actorType: "user",
      actorId: user.id,
      actorName: user.name,
      action: body?.action === "disconnect" ? "connector.disconnected" : "connector.connected",
      target: key,
      detail: connector.name,
    },
  });
  return NextResponse.json({ ok: true });
}
