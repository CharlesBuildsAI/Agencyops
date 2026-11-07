"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "./ui/button";
import { phonePretty } from "@/lib/format";

export type ApprovalCardData = {
  id: string;
  kind: string;
  status: string;
  title: string;
  payload: Record<string, string>;
  dispatch: { detail?: string; sandbox?: boolean };
};

export function ApprovalCard({ approval, slug }: { approval: ApprovalCardData; slug: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(approval.payload.body || approval.payload.purpose || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const closed = approval.status === "approved" || approval.status === "rejected";

  async function act(action: "approve" | "reject" | "edit") {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/approvals/${approval.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action,
        edit: action === "edit" ? { body, purpose: body } : undefined,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "That didn't go through.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  const tag =
    approval.kind === "email"
      ? "Email · draft"
      : approval.kind === "file"
        ? "Needs you · file"
        : approval.kind === "call"
          ? "Needs you · call"
          : "Needs you · SMS";

  return (
    <article className="card">
      <div className="tag mono">{tag.toUpperCase()}</div>
      {approval.kind === "sms" && (
        <>
          <h3>To {approval.payload.contactName || "customer"} · {phonePretty(approval.payload.to || "")}</h3>
          {!editing && <p>{approval.payload.body}</p>}
        </>
      )}
      {approval.kind === "email" && (
        <>
          <h3>Subject: {approval.payload.subject}</h3>
          {approval.payload.attachment && <p className="faint">Attached: {approval.payload.attachment}</p>}
          {editing && <p>{approval.payload.body}</p>}
        </>
      )}
      {approval.kind === "file" && (
        <>
          <h3>{approval.payload.namedInsured || approval.title}</h3>
          <p>
            {approval.payload.additionalInsured ? `Additional insured: ${approval.payload.additionalInsured}` : approval.title}
            {approval.payload.coverages ? ` · ${approval.payload.coverages}` : ""}
          </p>
        </>
      )}
      {approval.kind === "call" && (
        <>
          <h3>{approval.payload.contactName || approval.payload.to}</h3>
          {!editing && <p>{approval.payload.purpose}</p>}
        </>
      )}
      {editing && (
        <textarea className="editor" value={body} onChange={(event) => setBody(event.target.value)} aria-label="Edit draft" />
      )}
      {closed ? (
        <p className="faint" style={{ margin: 0 }}>
          {approval.status === "approved" ? approval.dispatch.detail || "Approved." : "Declined. Nothing was sent."}
        </p>
      ) : (
        <div className="row">
          {approval.kind === "email" && !editing ? (
            <Button size="sm" variant="quiet" onClick={() => setEditing(true)}>Review email</Button>
          ) : approval.kind === "file" ? (
            <Button size="sm" onClick={() => act("approve")} disabled={busy}>Approve & send</Button>
          ) : (
            <Button size="sm" onClick={() => act("approve")} disabled={busy}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 5 5L20 7" /></svg>
              Approve
            </Button>
          )}
          {approval.kind !== "file" && approval.kind !== "email" && (
            <Button size="sm" variant="ghost" onClick={() => (editing ? act("edit") : setEditing(true))} disabled={busy}>
              {editing ? "Save edit" : "Edit"}
            </Button>
          )}
          {editing && approval.kind === "email" && (
            <Button size="sm" variant="ghost" onClick={() => act("edit")} disabled={busy}>Save edit</Button>
          )}
          {approval.kind !== "email" || editing ? (
            <Button size="sm" variant="ghost" onClick={() => act("reject")} disabled={busy}>Decline</Button>
          ) : null}
          <ButtonLink size="sm" variant="ghost" href={`/app/bots/${slug}?screen=1`}>Show screen</ButtonLink>
        </div>
      )}
      {error && <p className="err">{error}</p>}
    </article>
  );
}
