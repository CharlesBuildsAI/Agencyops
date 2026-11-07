import type { ToolDef } from "./types";

export const AGENT_TOOLS: ToolDef[] = [
  {
    name: "draft_sms",
    description: "Queue an outbound SMS for a human to approve. This does not send the text.",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "E.164 phone number" },
        contactName: { type: "string" },
        body: { type: "string" },
      },
      required: ["to", "body"],
    },
  },
  {
    name: "draft_email",
    description: "Queue an outbound email. Set ready to false for a working draft that is not in the queue yet.",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
        attachment: { type: "string" },
        ready: { type: "boolean" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "draft_call",
    description: "Queue an outbound call script for approval. This does not dial.",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string" },
        contactName: { type: "string" },
        purpose: { type: "string" },
      },
      required: ["to", "purpose"],
    },
  },
  {
    name: "note_status",
    description: "Add a short status line to the chat, such as a call starting.",
    parameters: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
  },
  {
    name: "add_transcript",
    description: "Record what the customer said, as notes for the licensed agent. No advice.",
    parameters: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
  },
  {
    name: "log_activity",
    description: "Write a line to this bot's computer activity log.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string" },
        screen: { type: "string" },
      },
      required: ["text"],
    },
  },
  {
    name: "save_memory",
    description: "Append a durable note the owner can read and edit.",
    parameters: {
      type: "object",
      properties: { note: { type: "string" } },
      required: ["note"],
    },
  },
  {
    name: "handoff",
    description: "Hand the work to another bot on the team by slug.",
    parameters: {
      type: "object",
      properties: {
        botSlug: { type: "string" },
        summary: { type: "string" },
      },
      required: ["botSlug", "summary"],
    },
  },
  {
    name: "file_task",
    description: "File an internal task. Set needsYou when a human must act.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        detail: { type: "string" },
        needsYou: { type: "boolean" },
      },
      required: ["title"],
    },
  },
];
