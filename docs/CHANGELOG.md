# Changelog

## Application workflow hardening

- Transactions now retain source worksheet/row metadata for edits and deletes, reject cross-financial-year edits, derive city/product values from master data, and read FY tabs concurrently.
- Added repeat-entry pending queue, confirmed save handling, partial failure reporting, date-range filters, mobile transaction cards, and error/empty states.
- Added Company/Product search, duplicate prevention, safe deletion restrictions, and historical identity guards.
- Invoice preview now shows invoice inputs and eligible transaction detail; final generation checks a preview fingerprint to prevent stale-preview downloads.
- Manual invoice percentage is visible; the existing final-payable Total Amount semantics remain unchanged.
- Added invoice currency rounding and date utility/fingerprint regression tests.
- Added PWA manifest, generated Omkar Marketing icons, service worker, and offline message page without caching private/API data.
- Enabled normal Next.js build type checking.
- Added nine system, flow, business, testing, deployment, and PWA documents.
