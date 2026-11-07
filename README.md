# AgencyOps

AI staff for an independent insurance agency. Each bot has a chat, a phone and email identity, a budget, and a computer pane. Outbound texts, emails, calls, and certificate files stay drafts until a person approves them. Bots never give coverage advice or bind a policy.

The demo workspace is **Rivera Insurance**: Penny (front desk), Ivy (inbox), Quinn (quotes), Reed (renewals), Sage (service desk), and Gale (growth).

This is an original app. It does not include code from Orgo, BOPS, or other agent platforms.

## Run locally (no keys)

Mock mode is the default. No Twilio, AgentMail, Anthropic, or OpenAI key is required.

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

- Marketing site: `/`
- Sign in: `rosa@rivera.insurance` / `rivera-demo`
- Staff invite (already seeded): `/invite/staff-demo-token`

The home desk opens on Reed's Hill Bakery renewal. Penny is on a live intake with Dana Chen and has an SMS waiting. Approve it from her chat. Nothing is delivered outside the app while `CHANNEL_MODE=mock`.

Replay the call from the **RC** menu: **Replay Dana's call**. That runs Penny's agent loop again (mock model, or a real model if a key is set), drafts a new SMS, and waits.

### Simulate another inbound

```bash
curl -s -X POST http://127.0.0.1:43123/api/webhooks/inbound \
  -H "content-type: application/json" \
  -H "x-agencyops-secret: demo" \
  -d '{"agencySlug":"rivera","channel":"call","to":"+13035550142","from":"+17205550198","contactName":"Dana Chen","body":"Hi, I need a quote on a 2024 RAV4, zip 80205."}'
```

`channel` can be `call`, `sms`, or `email`. The `to` number or address picks the bot.

## Real model

Set one key and leave `LLM_PROVIDER=auto`.

```bash
ANTHROPIC_API_KEY=sk-ant-...
# or
OPENAI_API_KEY=sk-...
LLM_PROVIDER=auto
```

`auto` prefers Anthropic, then OpenAI, then the built-in mock. Force a provider with `LLM_PROVIDER=anthropic`, `openai`, or `mock`.

The agent still has no send tool. Draft tools create approvals. A guardrail replaces coverage advice and binding language before it is stored.

## Real channels

Keep `CHANNEL_MODE=mock` until you mean to send.

```bash
CHANNEL_MODE=live
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
AGENTMAIL_API_KEY=
AGENTMAIL_INBOX_ID=
```

Approved SMS goes to Twilio. Approved email goes to AgentMail (`POST /v0/inboxes/{inbox_id}/messages/send`). AgentPhone is optional: set `AGENTPHONE_API_KEY` and `AGENTPHONE_BASE_URL` when you want that adapter instead. With the mode on `mock`, those keys are ignored and the audit log records a sandbox receipt.

## Checks

```bash
npm test
npm run typecheck
npm run lint
```

Tests cover the approval gate (pending, draft, and rejected never send; approved does) and the budget hard stop (a bot or the workspace at its cap does not call the model).

## Data model

One SQLite file in local dev (`prisma/dev.db`). Agency → users, bots, threads, messages, approvals, tasks, calls, usage, audit, connectors, vault labels. Vault rows store a label and `secretRef: keychain`. Passwords are not saved.

Caps are monthly, in cents. Penny's demo cap is $120. The workspace cap is $500. Crossing a cap pauses the bot with a hard stop. The usage page shows the month.

## Deploy

The filesystem on a host has to keep the SQLite file. Vercel serverless will not. Use Fly or Render with a persistent disk, or point `DATABASE_URL` at Postgres by changing the Prisma datasource provider to `postgresql`, running `prisma migrate dev`, and deploying that migration.

### Fly

`fly.toml` and `Dockerfile` are in the repo. Create a volume mounted at `/data` and set:

```bash
fly secrets set AUTH_SECRET=... DATABASE_URL=file:/data/agencyops.db APP_URL=https://your-app.fly.dev
fly deploy
fly ssh console -C "npx tsx --env-file=.env prisma/seed.ts"
```

Seed once. It wipes and rebuilds the demo agency.

### Render

Web service, Node, persistent disk mounted at `/data`.

- Build: `npm install && npx prisma generate && npm run build`
- Start: `npx prisma migrate deploy && npm run start`
- `DATABASE_URL=file:/data/agencyops.db`
- `PORT` is provided by Render. The start script listens on `$PORT`.

Then run `npm run db:seed` from the shell once.

## Environment

Every key is listed in `.env.example`. Blank keys stay in sandbox. `COMPUTER_PROVIDER=stub` renders the activity desktop in the app. `orgo` selects the same adapter interface for a later virtual desktop and does not call out.
