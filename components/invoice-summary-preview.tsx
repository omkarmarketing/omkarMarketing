type InvoicePreviewTransaction = {
  date?: string;
  buyerCompanyName?: string;
  buyerCompanyCity?: string;
  sellerCompanyName?: string;
  sellerCompanyCity?: string;
  product?: string;
  qty?: number;
  price?: number;
  remarks?: string;
  brokerageRate?: number;
};

type InvoicePreviewSummary = {
  invoiceNo?: string;
  companyName?: string;
  companyCity?: string;
  invoiceDate?: string;
  dateRange?: { start?: string; end?: string };
  totalQty?: number;
  brokerageRate?: number;
  brokerageAmount?: number;
  otherSideBrokerage?: number;
  totalPayable?: number;
  isManual?: boolean;
  isAmit?: boolean;
  description?: string;
};

export function InvoiceSummaryPreview({
  summary,
  transactions = [],
}: {
  summary: InvoicePreviewSummary;
  transactions?: InvoicePreviewTransaction[];
}) {
  const totalQty = Number(summary.totalQty || 0);
  const brokerageAmount = Number(summary.brokerageAmount || 0);
  const otherSideBrokerage = Number(summary.otherSideBrokerage || 0);
  const totalPayable = Number(summary.totalPayable || 0);

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <span className="font-medium">Invoice</span>
        <span>{summary.invoiceNo || "Preview"}</span>
      </div>
      <div className="flex flex-wrap justify-between gap-2">
        <span>Company</span>
        <span>{summary.companyName}{summary.companyCity ? `, ${summary.companyCity}` : ""}</span>
      </div>
      {summary.isManual ? (
        <>
          {summary.invoiceDate && (
            <div className="flex justify-between">
              <span>Invoice Date</span>
              <span>{summary.invoiceDate}</span>
            </div>
          )}
          <div className="rounded-md bg-muted/50 p-3">
            <p className="font-medium">Description</p>
            <p className="mt-1 whitespace-pre-wrap">{summary.description}</p>
          </div>
          <div className="flex justify-between">
            <span>Brokerage Percentage</span>
            <span>{Number(summary.brokerageRate || 0)}%</span>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap justify-between gap-2">
            <span>Date Range</span>
            <span>{summary.dateRange?.start} – {summary.dateRange?.end}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Quantity</span>
            <span>{totalQty}</span>
          </div>
          <div className="flex justify-between">
            <span>Brokerage Rate (per Qty)</span>
            <span>{Number(summary.brokerageRate || 0)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Brokerage Amount</span>
            <span>₹{brokerageAmount.toFixed(2)}</span>
          </div>
          {otherSideBrokerage > 0 && (
            <div className="flex justify-between">
              <span>Other Side Brokerage</span>
              <span>₹{otherSideBrokerage.toFixed(2)}</span>
            </div>
          )}
        </>
      )}
      {!summary.isManual && transactions.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[960px] text-left text-xs">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Seller</th>
                <th className="px-3 py-2 font-medium">Seller City</th>
                <th className="px-3 py-2 font-medium">Buyer</th>
                <th className="px-3 py-2 font-medium">Buyer City</th>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
                {summary.isAmit && <th className="px-3 py-2 text-right font-medium">Rate</th>}
                <th className="px-3 py-2 font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction, index) => (
                <tr key={`${transaction.date}-${transaction.product}-${index}`} className="border-t">
                  <td className="px-3 py-2">{transaction.date || "—"}</td>
                  <td className="px-3 py-2">{transaction.sellerCompanyName || "—"}</td>
                  <td className="px-3 py-2">{transaction.sellerCompanyCity || "—"}</td>
                  <td className="px-3 py-2">{transaction.buyerCompanyName || "—"}</td>
                  <td className="px-3 py-2">{transaction.buyerCompanyCity || "—"}</td>
                  <td className="px-3 py-2">{transaction.product || "—"}</td>
                  <td className="px-3 py-2 text-right">{Number(transaction.qty || 0)}</td>
                  <td className="px-3 py-2 text-right">{Number(transaction.price || 0).toFixed(2)}</td>
                  {summary.isAmit && (
                    <td className="px-3 py-2 text-right">{Number(transaction.brokerageRate || 0).toFixed(2)}</td>
                  )}
                  <td className="px-3 py-2">{transaction.remarks || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!summary.isManual && transactions.length === 0 && (
        <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-foreground">
          No transactions were found for this company and date range. Adjust the
          dates before downloading an invoice.
        </p>
      )}
      <hr />
      <div className="flex justify-between gap-2 text-lg font-semibold">
        <span>Total Amount</span>
        <span>₹{totalPayable.toFixed(2)}</span>
      </div>
    </div>
  );
}
