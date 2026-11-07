import { dispatchApproved, nextApprovalState, type SendReceipt } from "./approvals";
import { sendOutbound } from "./channels";
import { prisma } from "./db";

export async function decideApproval(input: {
  agencyId: string;
  userId: string;
  userName: string;
  role: string;
  approvalId: string;
  action: "approve" | "reject" | "edit";
  edit?: Record<string, unknown>;
}) {
  if (input.role !== "OWNER" && input.role !== "STAFF") {
    throw new Error("You don't have access to this workspace.");
  }
  const row = await prisma.approval.findFirst({
    where: { id: input.approvalId, agencyId: input.agencyId },
  });
  if (!row) throw new Error("Approval not found.");
  if (row.status === "approved" || row.status === "rejected") {
    throw new Error(`Already ${row.status}.`);
  }
  const payload = JSON.parse(row.payloadJson) as Record<string, unknown>;
  const next = nextApprovalState({ status: row.status, payload, agencyId: row.agencyId }, input.action, input.edit);
  if (input.action === "edit") {
    await prisma.approval.update({
      where: { id: row.id },
      data: { payloadJson: JSON.stringify(next.payload), status: next.status },
    });
    await prisma.auditLog.create({
      data: {
        agencyId: input.agencyId,
        actorType: "user",
        actorId: input.userId,
        actorName: input.userName,
        action: "approval.edited",
        target: row.id,
        detail: row.title,
      },
    });
    return { status: next.status, receipt: null as SendReceipt | null };
  }
  if (input.action === "reject") {
    await prisma.approval.update({
      where: { id: row.id },
      data: { status: "rejected", decidedAt: new Date(), decidedById: input.userId },
    });
    await prisma.auditLog.create({
      data: {
        agencyId: input.agencyId,
        actorType: "user",
        actorId: input.userId,
        actorName: input.userName,
        action: "approval.rejected",
        target: row.id,
        detail: row.title,
      },
    });
    return { status: "rejected", receipt: null as SendReceipt | null };
  }

  await prisma.approval.update({
    where: { id: row.id },
    data: { status: "approved", decidedAt: new Date(), decidedById: input.userId, payloadJson: JSON.stringify(next.payload) },
  });
  let receipt;
  try {
    receipt = await dispatchApproved(
      { ...row, status: "approved", payloadJson: JSON.stringify(next.payload) },
      input.agencyId,
      (approval) => sendOutbound(approval.kind, JSON.parse(approval.payloadJson) as Record<string, unknown>),
    );
  } catch (error) {
    await prisma.approval.update({
      where: { id: row.id },
      data: { status: row.status, decidedAt: null, decidedById: null },
    });
    throw error;
  }
  await prisma.approval.update({
    where: { id: row.id },
    data: { dispatchJson: JSON.stringify(receipt) },
  });
  await prisma.auditLog.create({
    data: {
      agencyId: input.agencyId,
      actorType: "user",
      actorId: input.userId,
      actorName: input.userName,
      action: `${row.kind}.sent`,
      target: row.id,
      detail: receipt.detail,
    },
  });
  return { status: "approved", receipt };
}
