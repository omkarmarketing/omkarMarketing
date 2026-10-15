# System Audit

## Scope and architecture

The application is a Next.js App Router project. React client components render the Transactions, Brokerage Invoice, Product Master, and Company Master modules. Clerk authenticates users; API route handlers authorize access and use the Google Sheets API through `lib/sheets.ts`. The Sheets worksheets remain the persistent store. Brokerage invoices are rendered to PDF with `@react-pdf/renderer`.

## Verified findings and changes

| Finding | Severity | Root cause and change | Remaining risk / verification |
| --- | --- | --- | --- |
| Historical transaction edits/deletes could target the current financial-year worksheet rather than the row's source worksheet. | High | Transaction reads now retain `_sheetName`; edit/delete requests identify that worksheet, and edits that cross financial years are rejected rather than silently moved. | Exercise edit/delete against authenticated test spreadsheets; this environment has no Clerk or Google credentials. |
| The transaction UI could show a successful empty list after an API error and did not identify its source worksheet. | High | API errors now return non-success responses; the table validates response shape and displays an actionable load-error state. | Requires authenticated Sheets integration testing. |
| New transactions could use arbitrary company/product values or client-supplied city values. | High | API writes validate Company and Product Master selections and derive cities from Company Master. | The process-local cache is per server process; multi-instance freshness is not guaranteed. |
| Master records could be duplicated or deleted while referenced by historical rows. | High | Duplicate names/codes are rejected; delete is blocked when referenced. Company identity changes and referenced product-code changes are also blocked where they would break historical matching. | Reference checks scan existing FY tabs, so a large history can make these infrequent operations slow. |
| Transaction reads were sequential, and master data could be read repeatedly. | Medium | FY reads are parallelized; transaction reads reuse cached Product Master data. The transactions page also loads FY tabs concurrently and reuses its master reads. | Google Sheets still requires reading whole worksheet ranges; pagination is in the UI, not server-side. |
| Invoice date selection could be affected by UTC conversion, and invoice preview could differ from the later PDF request if source rows changed. | High | Date-only values are parsed in local time. Preview/PDF requests now share a calculation path and a server-generated fingerprint; final generation is rejected if source data or inputs changed after preview. | Requires integration tests against a test spreadsheet. Invoice numbering may still have gaps if a confirmed generation response is lost after the counter write. |
| Manual invoice brokerage percentage was not shown, and the existing manual total semantics were easy to misinterpret. | Medium | The manual form/preview/PDF now display the rate. Existing behavior is preserved: entered Total Amount is the final payable amount, not a value multiplied by the displayed percentage. | Confirm the business meaning of the manual percentage and total with the client. |
| No PWA manifest, service worker, or offline guidance existed. | Medium | Added an installable manifest, brand icons, a service worker, and a network-required offline page. Only the offline page/icons are precached; private routes and API data are not cached. | Device installation and offline behavior still need a real HTTPS-device check. |
| Production builds ignored TypeScript errors. | High | Removed `typescript.ignoreBuildErrors`; the build must now pass its normal type validation. | Run the production build in the final verification. |

## Unresolved / not verifiable here

- Google Sheets writes, permissions, quota handling, and actual production data were not tested because credentials are not available in this workspace.
- Google Sheets operations are not transactionally idempotent. If a transaction write succeeds but its HTTP response is lost, a retry can duplicate the row. The UI warns users to inspect the transaction list before retrying an uncertain batch.
- The in-memory cache is not shared between server instances and is not durable.
- The authenticated custom Clerk sign-in flow and its session activation were not changed as part of this workflow work.
- Company identity changes for referenced records are intentionally restricted. Confirm whether the business wants historical-company aliases or a separate identity model before allowing them.

## Key source areas

- `app/api/transactions/route.ts`
- `app/api/company/route.ts`
- `app/api/product/route.ts`
- `app/api/invoice/generate/route.ts`
- `lib/sheets.ts`
- `lib/date-utils.ts`
- `components/transaction-form.tsx`
- `components/transaction-table.tsx`
- `components/invoice-form.tsx`
