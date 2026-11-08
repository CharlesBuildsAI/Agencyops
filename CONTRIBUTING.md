# Contributing

Thanks for looking. AgencyOps is a small Next.js app on purpose: one maintainer should be able to run it.

## Local setup

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npm run db:seed
npm run dev
```

The seed is fictional demo data. See the README before you run it against anything but a local database.

## Checks

```bash
npm test
npm run typecheck
npm run lint
```

Please run all three before opening a pull request.

## Scope

- Keep outbound customer messages behind the approval gate.
- Do not add a path that lets a bot give coverage advice or bind a policy.
- Do not commit secrets, `.env` files, or database files.
- Prefer a small change over a new service.

## License

By contributing, you agree that your contribution is licensed under the MIT license in `LICENSE`.
