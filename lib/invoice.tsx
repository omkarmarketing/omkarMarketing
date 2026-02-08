import { NextRequest, NextResponse } from "next/server";
import { getSheetValues } from "@/lib/sheets";
import { verifyUserAccess, getSheetIdForUser } from "@/lib/auth";
import { getCurrentFinancialYearSheetName } from "@/lib/sheets-helper";
import { z } from "zod";
import { parseDateFromSheet } from "@/lib/date-utils";

// VALIDATION
const invoiceRequestSchema = z.object({
  companyName: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  brokerageRate: z.coerce.number().min(0).max(1000),
});

export async function POST(request: NextRequest) {
  try {
    await verifyUserAccess();
    const sheetId = await getSheetIdForUser();
    const fySheetName = getCurrentFinancialYearSheetName();

    const body = await request.json();
    const { companyName, startDate, endDate, brokerageRate } =
      invoiceRequestSchema.parse(body);

    // 🔄 Fetch rows from Google sheet
    const rows = await getSheetValues(sheetId, fySheetName);

    // 🛠️ Map fields according to your sheet columns
    const cleanedRows = rows.map((r: any) => ({
      buyerCompanyName: r.buyerCompanyN || "",
      sellerCompanyName: r.sellerCompanyN || "",
      date: r.date,
      qty: Number(r.qty) || 0,
    }));

    // 📌 Auto Invoice Number
    const invoiceNumber = cleanedRows.length + 1;
    const paddedInvoice = `INV-${invoiceNumber.toString().padStart(3, "0")}`;

    // 🎯 Filter by date range + company name
    // Convert start and end dates to Date objects for comparison
    // Create date objects without time components for consistent comparison
    const startDateObj = new Date(startDate);
    const startCompare = new Date(
      startDateObj.getFullYear(),
      startDateObj.getMonth(),
      startDateObj.getDate()
    );

    const endDateObj = new Date(endDate);
    // For end date comparison, include the entire day by adding 1 day and subtracting 1 ms
    const endDateTime = new Date(
      endDateObj.getFullYear(),
      endDateObj.getMonth(),
      endDateObj.getDate() + 1
    );
    const endCompare = new Date(endDateTime.getTime() - 1);

    const filtered = cleanedRows.filter((tx) => {
      // Parse the transaction date from dd-mm-yy format using utility function
      const d = parseDateFromSheet(tx.date);
      // Create date object without time components for comparison
      const transactionDate = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate()
      );

      return (
        transactionDate >= startCompare &&
        transactionDate <= endCompare &&
        (tx.buyerCompanyName === companyName ||
          tx.sellerCompanyName === companyName)
      );
    });

    if (!filtered.length) {
      return NextResponse.json(
        { error: "No transactions found for this selection" },
        { status: 404 }
      );
    }

    // 💰 Brokerage Calculation (FINAL)
    const totalQty = filtered.reduce((sum, tx) => sum + tx.qty, 0);
    const totalPayable = totalQty * brokerageRate; // ✔ ONLY brokerage, price ignored

    // 📤 FINAL RESPONSE to PDF
    return NextResponse.json({
      success: true,
      summary: {
        invoiceNo: paddedInvoice,
        companyName,
        dateRange: { start: startDate, end: endDate },
        brokerageRate,
        totalQty,
        totalPayable, // FINAL BILL AMOUNT
      },
      transactions: filtered.map((tx) => ({
        date: tx.date || "",
        buyerCompanyName: tx.buyerCompanyName || "",
        sellerCompanyName: tx.sellerCompanyName || "",
        qty: tx.qty || 0,
        price: 0, // Using 0 as default for this endpoint
        remarks: "",
        buyerCompanyCity: "",
        sellerCompanyCity: "",
        rate: brokerageRate,
        amount: (tx.qty || 0) * brokerageRate, // PER LINE BROKERAGE
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error occurred",
      },
      { status: 500 }
    );
  }
}
