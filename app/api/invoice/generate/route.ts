import { NextRequest, NextResponse } from "next/server";
import { getSheetValues } from "@/lib/sheets";
import { verifyUserAccess, getSheetIdForUser } from "@/lib/auth";
import { getCurrentFinancialYearSheetName } from "@/lib/sheets-helper";
import { z } from "zod";

const requestSchema = z.object({
  companyName: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  brokerageRate: z.coerce.number(),
});

export async function POST(req: NextRequest) {
  await verifyUserAccess();
  const sheetId = await getSheetIdForUser();
  const fySheet = getCurrentFinancialYearSheetName();

  const body = await req.json();
  const { companyName, startDate, endDate, brokerageRate, isPreview } =
    requestSchema.extend({ isPreview: z.boolean().optional() }).parse(body);

  // Fetch rows from sheet
  const rows = await getSheetValues(sheetId, fySheet);
  console.log("Fetched rows from sheet:", rows);
  console.log("Number of rows:", rows.length);
  if (rows.length > 0) {
    console.log("First row keys:", Object.keys(rows[0]));
    console.log("First row data:", rows[0]);
  }

  // FIX DATA FIELD MAPPING - Handle both abbreviated and full column names
  const cleanedRows = rows.map((r: any) => {
    const buyerCol =
      r.buyerCompanyN || r.buyerCompanyName || r["Buyer Company"] || r["Buyer"];
    const sellerCol =
      r.sellerCompanyN ||
      r.sellerCompanyName ||
      r["Seller Company"] ||
      r["Seller"];

    return {
      buyerCompanyName: buyerCol,
      buyerCompanyCity: r.buyerCompanyCity || r["Buyer City"] || "",
      sellerCompanyName: sellerCol,
      sellerCompanyCity: r.sellerCompanyCity || r["Seller City"] || "",
      date: r.date || r.Date,
      product: r.product || r.Product || "",
      productCode: r.productCode || r["Product Code"] || "",
      qty: Number(r.qty || r.Qty || r.quantity || 0) || 0,
      price: Number(r.price || r.Price || 0) || 0,
      remarks: r.remarks || r.Remarks || "",
    };
  });

  console.log("Cleaned rows:", cleanedRows);
  console.log("Searching for company:", companyName);
  console.log("Date range:", startDate, "to", endDate);

  // AUTO INVOICE #
  const invoiceNumber = cleanedRows.length + 1;
  const paddedInvoice = `INV-${Date.now().toString().slice(-5)}`;

  // FILTERED TRANSACTIONS
  const filtered = cleanedRows.filter((tx) => {
    const d = new Date(tx.date);
    const isDateInRange = d >= new Date(startDate) && d <= new Date(endDate);
    const isCompanyMatch =
      (tx.buyerCompanyName &&
        tx.buyerCompanyName.toLowerCase() === companyName.toLowerCase()) ||
      (tx.sellerCompanyName &&
        tx.sellerCompanyName.toLowerCase() === companyName.toLowerCase());

    console.log(
      `Row: ${tx.buyerCompanyName} | ${tx.sellerCompanyName} | ${tx.date} | Match: ${isCompanyMatch}, InRange: ${isDateInRange}`
    );

    return isDateInRange && isCompanyMatch;
  });

  console.log("Filtered transactions:", filtered);

  if (!filtered.length) {
    return NextResponse.json({
      success: false,
      error: "No matching transactions found.",
    });
  }

  // BROKERAGE (FLAT RATE METHOD)
  const totalQty = filtered.reduce((sum, r) => sum + r.qty, 0);
  const totalPayable = totalQty * brokerageRate;

  // Format date as dd/mm/yyyy
  function formatDate(dateString: string): string {
    if (!dateString) return "";

    // If already in dd/mm/yyyy format, return as is
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      return dateString;
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return original if not a valid date
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  // Format transactions with all details
  const formattedTransactions = filtered.map((tx) => ({
    date: formatDate(tx.date || ""),
    buyerCompanyName: String(tx.buyerCompanyName || "").trim(),
    buyerCompanyCity: String(tx.buyerCompanyCity || "").trim(),
    sellerCompanyName: String(tx.sellerCompanyName || "").trim(),
    sellerCompanyCity: String(tx.sellerCompanyCity || "").trim(),
    product: String(tx.product || "").trim(),
    productCode: String(tx.productCode || "").trim(),
    qty: Number(tx.qty) || 0,
    price: Number(tx.price) || 0,
    rate: Number(brokerageRate) || 0,
    amount: (Number(tx.qty) || 0) * (Number(brokerageRate) || 0),
    remarks: String(tx.remarks || "").trim(),
  }));

  // For preview requests, we don't want to generate a new invoice number
  const invoiceNumberForPreview = isPreview ? "PREVIEW" : paddedInvoice;
  const invoiceDateForPreview = isPreview
    ? "Preview Date"
    : new Date().toLocaleDateString("en-GB");

  const response = {
    success: true,
    summary: {
      invoiceNo: invoiceNumberForPreview,
      companyName,
      invoiceDate: invoiceDateForPreview,
      dateRange: {
        start: formatDate(startDate),
        end: formatDate(endDate),
      },
      brokerageRate,
      totalQty,
      totalPayable,
    },
    transactions: formattedTransactions,
  };

  // For actual invoice generation (not preview), we can add additional processing here if needed
  if (!isPreview) {
    // This is where we could add actual invoice generation logic
    // For now, we're just returning the same response
  }

  return NextResponse.json(response);
}
