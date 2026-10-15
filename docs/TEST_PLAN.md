# Test Plan

## Automated checks

Run from the repository root:

```sh
npx tsc --noEmit
npm run lint
npm test
npm run test:e2e
npm run build
```

Current unit coverage includes date-only/timezone-safe parsing, invalid calendar dates, existing day-first sheet dates, currency rounding, and deterministic invoice fingerprints. Playwright coverage checks manual invoice validation/UI and the generated manifest/offline fallback across Chromium, Firefox, and WebKit.

## Authenticated integration checklist

Use a dedicated test spreadsheet, never production business data:

- Create one transaction and a multi-entry queue; verify sheet rows and the refreshed list.
- Force a validation failure and an uncertain network response; confirm failed entries remain pending and no success is claimed.
- Verify source-sheet edit/delete for a row in a historical FY. Try changing its date across the FY boundary and confirm the API rejects it.
- Check Company/Product duplicate conflicts, reference-protected deletes, and identity-change restrictions.
- Compare standard invoice eligible rows, subtotals, and total with its generated PDF, including both regular and per-product-rate calculations.
- Verify no-transaction preview and a source change after preview; the latter must require a new preview and must not consume an invoice number.
- Verify manual preview/PDF date, description, displayed percentage, and final entered amount.
- Inspect output on desktop, tablet, and mobile widths; install over HTTPS where supported and test offline navigation/reconnection.

## Verification limitations

No Clerk/Google credentials are present in the local environment, so authenticated persistence, actual spreadsheet records, quota handling, PDF output with production data, and device PWA installation cannot be truthfully marked verified.
