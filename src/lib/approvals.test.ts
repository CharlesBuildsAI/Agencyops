import { describe, expect, it, vi } from "vitest";
import {
  ApprovalRequiredError,
  CrossAgencyError,
  assertDispatchAllowed,
  dispatchApproved,
  nextApprovalState,
} from "./approvals";

const pending = {
  status: "pending",
  agencyId: "agency_rivera",
  kind: "sms",
  payload: { to: "+17205550198", body: "Hi Dana" },
};

describe("approval gate", () => {
  it("refuses to send while an approval is pending, drafted, or rejected", async () => {
    const send = vi.fn(async () => ({ provider: "mock", id: "1", sandbox: true, detail: "sent" }));
    await expect(dispatchApproved(pending, pending.agencyId, send)).rejects.toBeInstanceOf(ApprovalRequiredError);
    await expect(
      dispatchApproved({ ...pending, status: "draft" }, pending.agencyId, send),
    ).rejects.toBeInstanceOf(ApprovalRequiredError);
    await expect(
      dispatchApproved({ ...pending, status: "rejected" }, pending.agencyId, send),
    ).rejects.toBeInstanceOf(ApprovalRequiredError);
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses an approval from another agency", () => {
    expect(() => assertDispatchAllowed({ ...pending, status: "approved" }, "other")).toThrow(CrossAgencyError);
  });

  it("sends only after the approval is approved", async () => {
    const send = vi.fn(async () => ({ provider: "twilio", id: "SM1", sandbox: true, detail: "sandbox" }));
    const receipt = await dispatchApproved({ ...pending, status: "approved" }, pending.agencyId, send);
    expect(send).toHaveBeenCalledOnce();
    expect(receipt.sandbox).toBe(true);
    expect(receipt.provider).toBe("twilio");
  });

  it("keeps an edit in the queue instead of sending it", () => {
    const edited = nextApprovalState(pending, "edit", { body: "Updated text" });
    expect(edited.status).toBe("pending");
    expect(edited.payload.body).toBe("Updated text");
    expect(() => assertDispatchAllowed(edited, pending.agencyId)).toThrow(ApprovalRequiredError);
  });
});
