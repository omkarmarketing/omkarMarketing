# System Architecture

## Runtime components

- **Web application:** Next.js App Router with React, TypeScript, and Tailwind/shadcn UI components.
- **Authentication:** Clerk. Protected server/API operations call `verifyUserAccess()` and resolve a user-specific spreadsheet through `getSheetIdForUser()`.
- **API:** Route handlers under `app/api/` validate requests and perform server-side Sheets operations. Credentials remain on the server.
- **Persistence:** Google Sheets worksheets are the database. Existing Company Master, Product Master, financial-year transaction sheets, and InvoiceTracker are retained.
- **PDF:** `components/invoice.tsx` produces invoice PDFs from the API response; calculations are performed by `app/api/invoice/generate/route.ts`.
- **Cache:** `lib/cache.ts` is an in-process cache for master data. Cache invalidation occurs on master writes; it is not a distributed cache.
- **PWA:** `app/manifest.ts`, `public/sw.js`, `public/offline.html`, and `components/service-worker-registration.tsx`.

## Request and trust boundaries

1. Browser form validation improves usability but is not trusted as the security boundary.
2. API routes authenticate and validate inputs again.
3. Server-side routes read/write Sheets with service-account credentials.
4. A success response is returned only after the relevant Sheets operation resolves.
5. The UI refreshes the persisted list after confirmed transaction writes; pending entries are not represented as saved records.

## Data compatibility

Transaction rows continue to use the established worksheet columns. No transaction ID column or database migration is introduced. Responses add UI-only `_rowIndex` and `_sheetName` metadata so edits/deletes can address the actual source row.

## Deployment notes

The project is configured for the existing Next.js deployment setup (including Vercel Analytics). Deployment must supply the Clerk and Google service-account environment variables documented in `DEPLOYMENT_GUIDE.md`. A PWA requires HTTPS in production; localhost is suitable for development.
