import { assertDispatchAllowed } from "@/lib/approvals";
import { buildSimplePdf } from "@/lib/certificate";
import { prisma } from "@/lib/db";
import { authed, bad } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await authed();
  if (!user) return error;
  const { id } = await context.params;
  const approval = await prisma.approval.findFirst({ where: { id, agencyId: user.agencyId } });
  if (!approval || approval.kind !== "file") return bad("No certificate here.", 404);
  try {
    assertDispatchAllowed(approval, user.agencyId);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Waiting for approval.";
    return bad(message, 409);
  }
  const payload = JSON.parse(approval.payloadJson) as Record<string, string>;
  const lines = [
    "Certificate of Insurance",
    user.agency.name,
    `Named insured: ${payload.namedInsured || ""}`,
    `Additional insured: ${payload.additionalInsured || ""}`,
    `Job site: ${payload.jobSite || ""}`,
    `Coverages: ${payload.coverages || ""}`,
    "Released after approval. This is not a binder.",
  ];
  const bytes = buildSimplePdf(lines);
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${payload.fileName || "certificate.pdf"}"`,
    },
  });
}
