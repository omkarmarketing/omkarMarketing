# Deployment Guide

## Requirements

- Node.js 20 (matches the CI workflow).
- pnpm 10 in CI; use the repository's `pnpm-lock.yaml` to install reproducibly.
- Clerk application keys and Google service-account access to each configured spreadsheet.
- HTTPS in production for PWA installation and service workers.

## Environment variables

Set these in the deployment provider's server environment. Do not commit values:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_EMAIL_USER1`
- `NEXT_PUBLIC_CLERK_EMAIL_USER2`
- `NEXT_PUBLIC_SPREADSHEET_USER1`
- `NEXT_PUBLIC_SPREADSHEET_USER2`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY` (preserve the key's newline content; the Sheets client converts escaped `\\n`)
- `GOOGLE_PROJECT_ID` (optional in code; defaults to the current project identifier)

The Clerk email variables are the allow-listed user emails; each spreadsheet variable is the corresponding spreadsheet ID. Grant the service-account email access to the spreadsheets. Never expose the private key to browser code or logs.

## Local setup

```sh
pnpm install
pnpm run dev
```

Set local variables in an ignored `.env.local` file. Without Clerk and Sheets credentials, public pages and static PWA resources can be exercised, but authenticated business operations cannot be verified.

## Validation and production

```sh
npx tsc --noEmit
pnpm run lint
pnpm run test
pnpm run test:e2e
pnpm run build
pnpm run start
```

Deploy the existing Next.js application without changing the Google Sheets data store. After deployment, verify an authenticated read and a write against a designated test spreadsheet before permitting normal business use. Confirm `/manifest.webmanifest`, `/sw.js`, and the PWA icons are served over HTTPS.

The GitHub Actions workflow runs lint, unit tests, security audit (currently configured as non-blocking), and browser tests. Keep its required secret names synchronized with the deployment configuration.
