import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad } from "@/lib/http";
import { webhookAuthorized } from "@/lib/demo-mode";
import { ingestInbound, type InboundInput } from "@/lib/inbound";

export async function POST(request: Request) {
  if (!webhookAuthorized(request.headers.get("x-agencyops-secret"))) {
    return bad("Webhook secret rejected.", 401);
  }
  const body = (await request.json().catch(() => null)) as (InboundInput & { agencySlug?: string }) | null;
  if (!body?.agencySlug || !body.channel || !body.to || !body.from || !body.body) {
    return bad("agencySlug, channel, to, from, and body are required.");
  }
  if (!["sms", "email", "call"].includes(body.channel)) return bad("Channel must be sms, email, or call.");
  const agency = await prisma.agency.findUnique({ where: { slug: body.agencySlug } });
  if (!agency) return bad("Unknown agency.", 404);
  const result = await ingestInbound(agency.id, body);
  return NextResponse.json({ ok: true, ...result });
}
