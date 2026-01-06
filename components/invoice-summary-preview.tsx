import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function formatDate(date?: string) {
  if (!date) return "—";

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    return date;
  }

  const d = new Date(date);
  return isNaN(d.getTime()) ? date : d.toLocaleDateString("en-GB");
}

export function InvoiceSummaryPreview({ summary, transactions }: any) {
  // ✅ SAFE NUMBERS
  const totalQty = Number(summary.totalQty || 0);
  const brokerageRate = Number(summary.brokerageRate || 0);
  const brokerageAmount = Number(summary.brokerageAmount || 0);
  const otherSideBrokerage = Number(summary.otherSideBrokerage || 0);
  const otherSideTotalPayable = Number(summary.otherSideTotalPayable || 0);

  // ✅ CALCULATIONS (MATCH PDF)
  // Total Brokerage Amount = (Total Qty * Brokerage Rate) + Other Side Brokerage
  const totalBrokerage = brokerageAmount + otherSideBrokerage;

  return (
    <Card className="border">
      <CardHeader>
        <CardTitle className="text-lg">Invoice Summary Preview</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-muted-foreground">Company</p>
            <p className="font-medium">{summary.companyName}</p>
            {summary.companyCity && (
              <p className="font-medium text-sm text-muted-foreground mt-1">
                {summary.companyCity}
              </p>
            )}
          </div>

          <div>
            <p className="text-muted-foreground">Date Range</p>
            <p className="font-medium">
              {formatDate(summary.dateRange.start)} –{" "}
              {formatDate(summary.dateRange.end)}
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Total Quantity</span>
            <span className="font-medium">{totalQty}</span>
          </div>

          <div className="flex justify-between">
            <span>Brokerage Rate</span>
            <span className="font-medium">{brokerageRate}</span>
          </div>

          <div className="flex justify-between">
            <span>Brokerage Amount</span>
            <span className="font-medium">₹{brokerageAmount.toFixed(2)}</span>
          </div>

          {(otherSideBrokerage > 0 || otherSideTotalPayable > 0) && (
            <div className="flex justify-between">
              <span>Other Side Brokerage</span>
              <span className="font-medium">
                ₹{(otherSideBrokerage + otherSideTotalPayable).toFixed(2)}
              </span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between text-lg font-semibold">
            <span>Total Brokerage Amount</span>
            <span>₹{totalBrokerage.toFixed(2)}</span>
          </div>
        </div>

        {transactions.length === 0 && (
          <p className="text-center italic text-muted-foreground pt-2">
            No transactions found for this period
          </p>
        )}
      </CardContent>
    </Card>
  );
}
