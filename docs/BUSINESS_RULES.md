# Business Rules

## Transactions

- A transaction is stored in the financial-year worksheet determined by its transaction date. The financial year begins in April.
- Seller and buyer names/cities must resolve to Company Master; the server stores the master city, not an arbitrary city submitted by the browser.
- Products must resolve to Product Master. Existing transaction rows and sheet columns are not rewritten during master edits.
- Quantity is a positive integer and price is positive, matching the existing transaction form/API validation.
- Remarks are optional.
- Edits must remain in the original financial-year sheet. Moving an existing row between years is intentionally not automated because it could overwrite or duplicate business records.

## Standard invoices

- Eligible rows fall inside the selected date range (inclusive) and match the company by normalized name and exact city on either the buyer or seller side.
- The current regular-user calculation is `sum(quantity) × selected brokerage rate`. The application labels this rate per quantity, consistent with the existing PDF calculation table.
- For the configured Amit user, the existing calculation is `sum(quantity × transaction brokerage rate)`, using rates stored on the product/transaction rows.
- Remarks may contribute other-side brokerage when the invoiced party is the seller and its city matches. Numeric text is parsed as a number; non-numeric remarks contribute zero.
- Other-side brokerage is added to brokerage only when its sum is positive.
- Calculated currency subtotals and totals are rounded to two decimal places. Preview and final generation use the same API logic.
- No eligible transactions yields a visible empty preview and does not allocate an invoice number.

## Manual invoices

- Existing implementation treats `Total Amount` as the final payable amount (`totalPayable`); it is not recomputed from brokerage percentage.
- Manual brokerage percentage is retained and now displayed in preview/PDF, but it does not change Total Amount.
- Manual invoice date is independent of transaction dates.
- Preview does not allocate a number. Final generation increments the existing InvoiceTracker only after the preview fingerprint matches.
- Confirm with the client whether the displayed manual percentage is informational or should participate in a future calculation. Do not change the current final-total semantics without approval.

## Master data and history

- Duplicate company names and product codes are rejected.
- A company referenced by transactions cannot be deleted or have its name/city changed. Add a new company record for a changed identity to preserve historical invoice matching.
- A product referenced by transactions cannot be deleted; its code cannot be changed if a transaction stores that code.
- Product names/codes and company identities are not rewritten in historical transaction rows.

## Known reliability limitation

Google Sheets does not provide a transaction ID/idempotency mechanism in the current sheet structure. A write that succeeds while its response is lost can be duplicated if blindly retried. Check the persisted transaction list before retrying uncertain writes.
