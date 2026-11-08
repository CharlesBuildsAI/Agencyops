/**
 * DEMO DATA ONLY. Rivera Insurance, rosa@rivera.insurance / rivera-demo,
 * and the invite token staff-demo-token are fictional showcase credentials.
 * This script refuses to run when NODE_ENV=production unless DEMO_MODE=true.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { runDanaDemo } from "../src/lib/demo";
import { allowDemoCredentials } from "../src/lib/demo-mode";
import { dayKey, monthKey } from "../src/lib/time";

if (!allowDemoCredentials()) {
  console.error(
    "Refusing to seed the Rivera demo in production. Set DEMO_MODE=true only for a public showcase, then change the owner password and turn DEMO_MODE off.",
  );
  process.exit(1);
}

const prisma = new PrismaClient();
const TZ = "America/Denver";

const screens = [
  { id: "ams360", label: "AMS360", tint: "blue" },
  { id: "gmail", label: "Gmail", tint: "cream" },
  { id: "quote", label: "Quote", tint: "green" },
  { id: "carrier", label: "Carrier", tint: "pink" },
];

function todayAt(time: string) {
  const day = dayKey(new Date(), TZ);
  const [hour, minute] = time.split(":");
  return new Date(`${day}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:00-07:00`);
}

async function main() {
  await prisma.agency.deleteMany();
  const now = new Date();
  const month = monthKey(now, TZ);
  const today = dayKey(now, TZ);
  const year = today.slice(0, 4);
  // Published demo password. Login with this pair is rejected in production unless DEMO_MODE=true.
  const passwordHash = await bcrypt.hash("rivera-demo", 10);

  const agency = await prisma.agency.create({
    data: {
      name: "Rivera Insurance",
      slug: "rivera",
      productName: "AgencyOps",
      accentColor: "#E6F08A",
      mark: "A",
      timezone: TZ,
      monthlyCapCents: 50000,
      callBase: 134,
      approvalBase: 33,
      answeredRate: 92,
    },
  });

  await prisma.user.create({
    data: {
      agencyId: agency.id,
      email: "rosa@rivera.insurance",
      name: "Rosa Castillo",
      role: "OWNER",
      passwordHash,
    },
  });
  await prisma.invite.create({
    data: {
      agencyId: agency.id,
      email: "leo@rivera.insurance",
      role: "STAFF",
      token: "staff-demo-token",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });

  const sharedRules =
    "Never give coverage advice, recommend limits, state a final premium, or bind a policy. Collect facts and hand them to a licensed person. Disclose that you are an AI assistant. Outbound SMS, email, and calls are drafts until a human approves them.";

  const bots = [
    {
      slug: "penny",
      name: "Penny",
      roleTitle: "Front Desk",
      blurb: "Answers every call and text.",
      color: "#FF6FB5",
      phone: "+13035550142",
      email: "penny@rivera.agencyops",
      sortOrder: 1,
      statusLine: "Ready",
      statusAt: now,
      instructions: `You are the front desk. Answer calls and texts, triage quote / claim / billing / certificate / policy change, and book a callback with a licensed agent. ${sharedRules}`,
      computer: { active: "call", url: "agentphone · live call", screens },
    },
    {
      slug: "ivy",
      name: "Ivy",
      roleTitle: "Inbox",
      blurb: "Files mail and drafts replies.",
      color: "#2EC4B6",
      phone: "+13035550143",
      email: "ivy@rivera.agencyops",
      sortOrder: 2,
      statusLine: "4 carrier notices filed",
      statusAt: todayAt("9:31"),
      instructions: `You triage the shared service inbox, draft replies, and file carrier notices. ${sharedRules}`,
      computer: { active: "gmail", url: "mail.google.com", screens },
    },
    {
      slug: "quinn",
      name: "Quinn",
      roleTitle: "Quotes",
      blurb: "Collects intake and follows up.",
      color: "#FF9F43",
      phone: "+13035550144",
      email: "quinn@rivera.agencyops",
      sortOrder: 3,
      statusLine: "Sam P. day-3 follow-up sent",
      statusAt: todayAt("8:58"),
      instructions: `You collect ACORD-style intake and follow up on open quotes on day 1, 3, 7, and 14. ${sharedRules}`,
      computer: { active: "quote", url: "quote · intake", screens },
    },
    {
      slug: "reed",
      name: "Reed",
      roleTitle: "Renewals",
      blurb: "Reaches clients before renewal.",
      color: "#47C46B",
      phone: "+13035550145",
      email: "reed@rivera.agencyops",
      sortOrder: 4,
      statusLine: "Hill Bakery renewal needs you",
      statusAt: todayAt("9:15"),
      instructions: `You prepare renewal outreach 60, 30, and 15 days out and flag remarketing. ${sharedRules}`,
      computer: { active: "gmail", url: "mail.google.com", screens },
    },
    {
      slug: "sage",
      name: "Sage",
      roleTitle: "Service Desk",
      blurb: "Issues COIs in the AMS.",
      color: "#5B8CFF",
      phone: "+13035550146",
      email: "sage@rivera.agencyops",
      sortOrder: 5,
      statusLine: "Ridge Roofing COI ready",
      statusAt: todayAt("8:40"),
      instructions: `You prepare certificates of insurance and simple service documents for human approval before anything is released. ${sharedRules}`,
      computer: { active: "ams360", url: "ams360.applied.com/certificates", screens },
    },
    {
      slug: "gale",
      name: "Gale",
      roleTitle: "Growth",
      blurb: "Posts and answers reviews.",
      color: "#A78BFA",
      phone: "+13035550147",
      email: "gale@rivera.agencyops",
      sortOrder: 6,
      statusLine: "Paused since Nov 2",
      statusAt: new Date(`${year}-11-02T15:00:00-07:00`),
      paused: true,
      pausedReason: "Paused since Nov 2",
      instructions: `You draft Google Business posts and review replies. Nothing posts without approval. ${sharedRules}`,
      computer: { active: "gmail", url: "business.google.com", screens },
    },
  ];

  const created = new Map<string, { id: string }>();
  for (const bot of bots) {
    const row = await prisma.bot.create({
      data: {
        agencyId: agency.id,
        slug: bot.slug,
        name: bot.name,
        roleTitle: bot.roleTitle,
        blurb: bot.blurb,
        color: bot.color,
        phone: bot.phone,
        email: bot.email,
        sortOrder: bot.sortOrder,
        statusLine: bot.statusLine,
        statusAt: bot.statusAt,
        paused: bot.paused ?? false,
        pausedReason: bot.pausedReason ?? "",
        instructions: bot.instructions,
        monthlyCapCents: 12000,
        spentCents: 0,
        spentMonth: month,
        channelsJson: JSON.stringify({ phone: true, sms: true, email: true }),
        computerJson: JSON.stringify(bot.computer),
      },
    });
    created.set(bot.slug, row);
  }

  const spend: Record<string, number> = { ivy: 6200, quinn: 4100, reed: 5500, sage: 3800, gale: 1900 };
  for (const [slug, cents] of Object.entries(spend)) {
    const bot = created.get(slug)!;
    await prisma.usageEvent.create({
      data: {
        agencyId: agency.id,
        botId: bot.id,
        provider: "seed",
        model: "workspace",
        costCents: cents,
        kind: "seed",
        monthKey: month,
        dayKey: `${today.slice(0, 8)}03`,
        createdAt: todayAt("8:00"),
      },
    });
    await prisma.bot.update({ where: { id: bot.id }, data: { spentCents: cents } });
  }

  await prisma.connector.createMany({
    data: [
      { agencyId: agency.id, key: "gmail", name: "Gmail", status: "connected", detail: "Connected · service@riverainsure.com" },
      { agencyId: agency.id, key: "calendar", name: "Calendar", status: "connected", detail: "Connected · 3 calendars" },
      { agencyId: agency.id, key: "slack", name: "Slack", status: "connected", detail: "Connected · #ops" },
      { agencyId: agency.id, key: "ams360", name: "AMS360", status: "sign_in", detail: "Sign in required" },
      { agencyId: agency.id, key: "hawksoft", name: "HawkSoft", status: "disconnected", detail: "Not connected" },
      { agencyId: agency.id, key: "composio", name: "Composio", status: "connected", detail: "API key on file · 1,400 apps" },
    ],
  });

  await prisma.vaultEntry.create({
    data: { agencyId: agency.id, label: "Progressive agent portal", username: "rivera.service", secretRef: "keychain" },
  });
  await prisma.contact.createMany({
    data: [
      { agencyId: agency.id, name: "Hill Bakery", phone: "+13035550110", email: "office@hillbakery.example" },
      { agencyId: agency.id, name: "Ridge Roofing LLC", phone: "+13035550111", email: "jobs@ridgeroofing.example", notes: "COI for Meridian Property Group." },
    ],
  });

  const ivy = created.get("ivy")!;
  const quinn = created.get("quinn")!;
  const reed = created.get("reed")!;
  const sage = created.get("sage")!;
  const penny = created.get("penny")!;

  await prisma.task.create({
    data: {
      agencyId: agency.id,
      botId: ivy.id,
      title: "2 unread in Inbox",
      detail: "Carrier notices ready to file",
      queue: true,
      status: "open",
    },
  });

  const ivyThread = await prisma.thread.create({
    data: { agencyId: agency.id, botId: ivy.id, title: "Carrier notices", channel: "email", contactName: "Carriers" },
  });
  await prisma.message.create({
    data: {
      agencyId: agency.id,
      botId: ivy.id,
      threadId: ivyThread.id,
      role: "assistant",
      content: "Four carrier notices are filed. Two still need a look before I draft replies.",
      metaJson: "{}",
    },
  });

  const quinnThread = await prisma.thread.create({
    data: { agencyId: agency.id, botId: quinn.id, title: "Sam Patel", channel: "sms", contactName: "Sam Patel" },
  });
  await prisma.message.create({
    data: {
      agencyId: agency.id,
      botId: quinn.id,
      threadId: quinnThread.id,
      role: "assistant",
      content: "Day-3 follow-up to Sam P. went out this morning after you approved it.",
      metaJson: "{}",
    },
  });

  const reedThread = await prisma.thread.create({
    data: { agencyId: agency.id, botId: reed.id, title: "Hill Bakery", channel: "sms", contactName: "Hill Bakery" },
  });
  await prisma.message.createMany({
    data: [
      {
        agencyId: agency.id,
        botId: reed.id,
        threadId: reedThread.id,
        role: "assistant",
        content: "Hill Bakery renews in 12 days. I drafted the text and a remarketing note. Nothing sends until you approve.",
        metaJson: "{}",
      },
    ],
  });
  await prisma.approval.create({
    data: {
      agencyId: agency.id,
      botId: reed.id,
      threadId: reedThread.id,
      kind: "sms",
      status: "pending",
      title: "SMS to Hill Bakery",
      payloadJson: JSON.stringify({
        to: "+13035550110",
        contactName: "Hill Bakery",
        body: "Hi, it's Reed at Rivera Insurance. Your policy renews in 12 days. I can send the remarketing note whenever you say the word.",
      }),
    },
  });

  const sageThread = await prisma.thread.create({
    data: { agencyId: agency.id, botId: sage.id, title: "Ridge Roofing COI", channel: "chat", contactName: "Ridge Roofing LLC" },
  });
  await prisma.message.createMany({
    data: [
      {
        agencyId: agency.id,
        botId: sage.id,
        threadId: sageThread.id,
        role: "user",
        content: "Need a COI for Ridge Roofing — additional insured Meridian Property Group, job site 1400 Wynkoop.",
        metaJson: "{}",
      },
      {
        agencyId: agency.id,
        botId: sage.id,
        threadId: sageThread.id,
        role: "assistant",
        content: "Opening AMS360 on screen 1 and the carrier portal on screen 2. I'll draft the cert and ping you before download.",
        metaJson: "{}",
      },
      {
        agencyId: agency.id,
        botId: sage.id,
        threadId: sageThread.id,
        role: "system",
        content: "1m 12s · Browser on screen 2",
        metaJson: JSON.stringify({ kind: "status" }),
      },
    ],
  });
  await prisma.approval.create({
    data: {
      agencyId: agency.id,
      botId: sage.id,
      threadId: sageThread.id,
      kind: "file",
      status: "pending",
      title: "COI · Ridge Roofing LLC",
      payloadJson: JSON.stringify({
        namedInsured: "Ridge Roofing LLC",
        additionalInsured: "Meridian Property Group",
        jobSite: "1400 Wynkoop St, Denver",
        coverages: "GL $1M/$2M · WC",
        fileName: "COI-Ridge-Roofing.pdf",
      }),
    },
  });
  await prisma.activity.createMany({
    data: [
      { agencyId: agency.id, botId: sage.id, text: "Opened AMS360 certificates on screen 1.", screen: "ams360" },
      { agencyId: agency.id, botId: sage.id, text: "Carrier portal on screen 2. Waiting for approval before download.", screen: "carrier" },
    ],
  });

  const callers = ["Sam Patel", "Northside Dental", "Lina Ortiz", "Westwind HOA", "Jonah Ellis", "Mesa Glass", "Priya Shah", "Oak & Pine", "Chris Nguyen", "Bluebird Cafe", "Helena Brooks", "Park Hill Auto", "Ivy Lane Apartments"];
  for (let index = 0; index < callers.length; index += 1) {
    const started = new Date(Date.now() - (index + 2) * 25 * 60 * 1000);
    await prisma.callSession.create({
      data: {
        agencyId: agency.id,
        botId: penny.id,
        contactName: callers[index],
        phone: "+13035551000",
        direction: "inbound",
        status: "ended",
        summary: "Intake taken",
        startedAt: started,
        endedAt: new Date(started.getTime() + 90_000),
      },
    });
  }

  await prisma.auditLog.createMany({
    data: [
      { agencyId: agency.id, actorType: "user", actorName: "Rosa Castillo", action: "approval.sent", detail: "Quinn day-3 text to Sam Patel approved and released in sandbox." },
      { agencyId: agency.id, actorType: "bot", actorName: "Ivy", action: "inbox.filed", detail: "4 carrier notices filed from service@riverainsure.com." },
      { agencyId: agency.id, actorType: "bot", actorName: "Sage", action: "approval.created", detail: "COI for Ridge Roofing is waiting." },
    ],
  });

  await runDanaDemo(agency.id);

  await prisma.usageEvent.deleteMany({ where: { botId: penny.id, kind: "llm" } });
  await prisma.usageEvent.create({
    data: {
      agencyId: agency.id,
      botId: penny.id,
      provider: "seed",
      costCents: 4800,
      kind: "seed",
      monthKey: month,
      dayKey: today,
    },
  });
  await prisma.bot.update({
    where: { id: penny.id },
    data: {
      spentCents: 4800,
      spentMonth: month,
      tokensIn: 42000,
      tokensOut: 9000,
      paused: false,
      pausedReason: "",
      statusLine: "On a call with Dana · quote intake",
      statusAt: now,
    },
  });

  const approvals = await prisma.approval.count({ where: { agencyId: agency.id } });
  await prisma.agency.update({
    where: { id: agency.id },
    data: { approvalBase: Math.max(0, 37 - approvals) },
  });
  console.log(`Seeded Rivera Insurance. Approvals in database: ${approvals}. Login rosa@rivera.insurance / rivera-demo`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
