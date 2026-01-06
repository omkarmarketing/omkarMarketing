import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function formatDate(date?: string) {
  if (!date) return "—";
  const d = new Date(date);
  return isNaN(d.getTime()) ? date : d.toLocaleDateString("en-GB");
}

export function InvoiceSummaryPreview({ summary, transactions }: any) {
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
            <span className="font-medium">{summary.totalQty}</span>
          </div>
          <div className="flex justify-between">
            <span>Transactions</span>
            <span className="font-medium">{transactions.length}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold">
            <span>Total Brokerage</span>
            <span>₹{summary.totalPayable.toFixed(2)}</span>
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
