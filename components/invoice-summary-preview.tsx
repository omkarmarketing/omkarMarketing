export function InvoiceSummaryPreview({ summary }: any) {
  const totalQty = Number(summary.totalQty || 0);
  const brokerageAmount = Number(summary.brokerageAmount || 0);
  const otherSideBrokerage = Number(summary.otherSideBrokerage || 0);

  const totalPayable =
    otherSideBrokerage > 0
      ? brokerageAmount + otherSideBrokerage
      : brokerageAmount;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>Total Quantity</span>
        <span>{totalQty}</span>
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

      <hr />

      <div className="flex justify-between font-semibold text-lg">
        <span>Total Amount</span>
        <span>₹{totalPayable.toFixed(2)}</span>
      </div>
    </div>
  );
}
