# Pollinator

Pollinator is a Danish live workshop and audience-polling app. A facilitator
creates sessions and questions; participants join with a short session code;
the screen view shows live results.

## Access model

- Participants can view and answer only open questions for a session code.
- Host pages and all host APIs require a Neon Auth session **and** an e-mail in
  `POLLINATOR_FACILITATOR_EMAILS`. A session code is not host access.
- Reports and uploads are facilitator-only because they can contain submitted
  free text and media.

## Local setup

Use Node 24 and create `.env.local` from `.env.example`. The required values
are `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `NEON_AUTH_BASE_URL`,
`NEON_AUTH_COOKIE_SECRET`, `POLLINATOR_FACILITATOR_EMAILS`, and the mail
settings used by the shared mail package.

`NPM_TOKEN` is needed only while installing the two private GitHub packages.
Never commit any of these values.

```bash
npm ci
npm test
npx tsc --noEmit
npm run build
```

For local development, run `npm run dev`.

## Database changes

The current schema is `db/schema.sql`. Apply it deliberately with a production
`DATABASE_URL` only after testing on a Neon branch:

```bash
node scripts/migrate.mjs
```

The script has no automatic rollback. Take or verify a Neon branch/backup
before any schema change.

## Deployment and recovery

Production runs on Coolify/Hetzner and deploys the `master` branch with the
repository `Dockerfile`.

1. Push a verified commit to `master`.
2. In Coolify, deploy Pollinator production and wait for `/api/healthz` to be
   healthy.
3. Verify `https://pollinator.hansendjurhuus.dk/api/healthz` returns
   `{"ok":true}`.
4. If the release fails, use Coolify's Rollback view to restore the previous
   successful deployment.

GitHub Actions runs type checking, tests, and a production build for pushes and
pull requests. The local pre-push check intentionally runs only type checking
and tests to keep normal commits quick.

## Operations

- Production health endpoint: `/api/healthz`.
- Browser/API protections are set in `middleware.ts`; same-origin access is
  intentional, and no API uses open CORS.
- The app uses Neon Postgres, Neon Auth, Vercel Blob, and Resend through the
  shared `@andershauch/mail` package.
- The shared `@andershauch/auth` package must be updated and republished when
  Neon Auth publishes a compatible security update; do not force internal
  Better Auth versions from this app.
