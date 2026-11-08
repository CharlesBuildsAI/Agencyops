# Security

AgencyOps is a showcase. Do not point it at a real book of business until you have reviewed hosting, logging, and who can approve outbound messages.

## Reporting

TODO: replace this line with a private contact (email or security form) before announcing the repo. Until then, open a GitHub security advisory if the host supports it, and do not file a public issue for a vulnerability.

## What the app already refuses

- Bots have no tool that sends mail, text, or a call. Those actions become drafts.
- A draft is delivered only after a person in the agency approves it.
- Model text that gives coverage advice or says a policy is bound is replaced before it is stored.
- In production, `AUTH_SECRET` must come from the environment, be at least 24 characters, and must not be one of the documented placeholders. There is no production fallback.
- The published demo login (`rosa@rivera.insurance` / `rivera-demo`) and the invite token `staff-demo-token` are rejected when `NODE_ENV=production` unless `DEMO_MODE=true`.
- The webhook shared secret `demo` is rejected in production unless `DEMO_MODE=true`. Set `DEMO_WEBHOOK_SECRET` to a long random value for any real deploy.
- The seed script loads fictional Rivera Insurance data and exits in production unless `DEMO_MODE=true`.

## Operating notes

- Leave `CHANNEL_MODE=mock` until you intend to deliver messages through Twilio or AgentMail.
- Do not commit `.env` files, database files, or carrier passwords. The vault stores labels only.
- After a showcase deploy, change the owner password and unset `DEMO_MODE` if that password should stop working.
