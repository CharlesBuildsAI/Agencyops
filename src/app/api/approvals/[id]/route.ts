import { NextResponse } from "next/server";
import { decideApproval } from "@/lib/decide";
import { authed, bad } from "@/lib/http";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await authed();
  if (!user) return error;
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    action?: "approve" | "reject" | "edit";
    edit?: Record<string, unknown>;
  } | null;
  const action = body?.action;
  if (action !== "approve" && action !== "reject" && action !== "edit") return bad("Unknown action.");
  try {
    const result = await decideApproval({
      agencyId: user.agencyId,
      userId: user.id,
      userName: user.name,
      role: user.role,
      approvalId: id,
      action,
      edit: body?.edit,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Could not update the approval.";
    const status = /blocked|another agency|pending|draft/i.test(message) ? 409 : 400;
    return bad(message, status);
  }
}
