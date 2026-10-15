# Data Flow

## Transactions

### Create

`TransactionForm` validates Company Master selections, Product Master selection, date, quantity, and price. Add Another stores an entry only in the in-memory pending queue; Record Transaction writes one entry, while Record Pending Transactions submits queued entries sequentially. The API validates again, derives both cities from Company Master, resolves the product through Product Master, selects the financial-year sheet from the transaction date, and inserts the row chronologically. Only confirmed successes are removed from the queue. The table then reloads persisted rows.

### Read, search, and export

The server page and `/api/transactions` read available `FYYYYY-YY` worksheets concurrently, attach source-sheet/row metadata, and map product codes to names. Search, date filtering, sorting, and pagination run in the browser over those returned rows. The existing export endpoint continues to provide CSV export. Google Sheets does not provide server-side pagination through this implementation, so the initial read still covers whole worksheet ranges.

### Edit and delete

Rows include `_sheetName` and `_rowIndex`; both are sent to the API. Updates validate Company and Product Master values and derive cities again. Edits that would move a row to another financial year are rejected; users must delete and re-record it in the correct year. Deletes target the source worksheet and exact row.

## Company and Product Master

Forms call the corresponding API route. The API validates and rejects duplicate company names/product codes. Deletion checks all financial-year sheets and returns a conflict when historical transactions reference the master record. Company name/city changes and product-code changes are rejected when they would make existing transactions unmatchable. Successful writes invalidate the process-local master cache and the UI reloads the list.

## Brokerage invoice

The browser requests a preview from `/api/invoice/generate`. Standard invoices gather financial-year tabs covering the selected date range and filter rows by company, city, and inclusive date range. The response contains eligible transaction details, calculations, and a fingerprint. Manual preview uses the entered description, date, percentage, and total amount; it does not write an invoice number.

Download submits the same values plus the preview fingerprint. The API recalculates current data and refuses generation if the fingerprint differs. Only then does it increment InvoiceTracker and return data for PDF rendering. Standard and manual preview/PDF totals therefore use the same server calculation and inputs.

## Offline behavior

The service worker precaches only `offline.html` and app icons. A failed navigation shows the offline page. It does not cache authenticated HTML, API responses, transactions, invoices, or master data. All Sheets-backed workflows require a network connection.
