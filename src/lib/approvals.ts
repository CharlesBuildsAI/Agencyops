export type ApprovalStatus = "pending" | "approved" | "rejected" | "draft";

export class ApprovalRequiredError extends Error {
  readonly status: string;

  constructor(status: string) {
    super(`Outbound send blocked: approval is "${status}". Nothing sends without a yes.`);
    this.name = "ApprovalRequiredError";
    this.status = status;
  }
}

export class CrossAgencyError extends Error {
  constructor() {
    super("That approval belongs to another agency.");
    this.name = "CrossAgencyError";
  }
}

export function assertDispatchAllowed(
  approval: { status: string; agencyId: string },
  actorAgencyId: string,
) {
  if (approval.agencyId !== actorAgencyId) throw new CrossAgencyError();
  if (approval.status !== "approved") throw new ApprovalRequiredError(approval.status);
}

export type ApprovalDecision = "approve" | "reject" | "edit";

export function nextApprovalState<T extends { status: string; payload: Record<string, unknown> }>(
  approval: T,
  decision: ApprovalDecision,
  edit?: Record<string, unknown>,
): T {
  if (approval.status === "approved" || approval.status === "rejected") {
    return approval;
  }
  if (decision === "edit") {
    return {
      ...approval,
      status: approval.status === "draft" ? "draft" : "pending",
      payload: { ...approval.payload, ...edit },
    };
  }
  if (decision === "approve") return { ...approval, status: "approved" };
  return { ...approval, status: "rejected" };
}

export type SendReceipt = {
  provider: string;
  id: string;
  sandbox: boolean;
  detail: string;
};

export async function dispatchApproved<T extends { status: string; agencyId: string; kind: string }>(
  approval: T,
  actorAgencyId: string,
  send: (approval: T) => Promise<SendReceipt>,
) {
  assertDispatchAllowed(approval, actorAgencyId);
  return send(approval);
}
