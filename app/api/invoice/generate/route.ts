import { NextRequest, NextResponse } from "next/server";
import { getSheetValues, getNextInvoiceNumber } from "@/lib/sheets";
import { verifyUserAccess, getSheetIdForUser } from "@/lib/auth";
import { getCurrentFinancialYearSheetName } from "@/lib/sheets-helper";
import { z } from "zod";
import { parseDateFromSheet } from "@/lib/date-utils";

const requestSchema = z.object({
  companyName: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  brokerageRate: z.coerce.number().min(0),
  isPreview: z.boolean().optional(),
});

/* -------------------- HELPERS -------------------- */
/**
 * Normalizes a company name by removing hyphens, spaces and converting to lowercase.
 */
function normalizeCompanyName(name: string): string {
  return name.toLowerCase().replace(/[\s-]/g, "");
}

export async function POST(req: NextRequest) {
  await verifyUserAccess();
  const sheetId = await getSheetIdForUser();
  const fySheet = getCurrentFinancialYearSheetName();

  const body = await req.json();
  const { companyName, startDate, endDate, brokerageRate, isPreview } =
    requestSchema.parse(body);

  const rows = await getSheetValues(sheetId, fySheet);

  /* -------------------- NORMALIZE ROWS -------------------- */
  const cleanedRows = rows.map((r: any) => ({
    buyerCompanyName: r.buyerCompanyName || r.buyerCompanyN || "",
    buyerCompanyCity: r.buyerCompanyCity || "",
    sellerCompanyName: r.sellerCompanyName || r.sellerCompanyN || "",
    sellerCompanyCity: r.sellerCompanyCity || "",
    date: r.date,
    product: r.product,
    qty: Number(r.qty) || 0,
    price: Number(r.price) || 0,
    remarks: r.remarks || "",
  }));

  /* -------------------- OPTIMIZED FILTERING -------------------- */
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

  // Pre-calculate normalized company name
  const targetNormalized = normalizeCompanyName(companyName);

  // Pre-parse all dates to avoid repeated parsing
  const parsedDates = cleanedRows.map(row => {
    const parsedDate = parseDateFromSheet(row.date);
    return new Date(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate()
    );
  });

  // Filter transactions with optimized matching
  const filteredIndices = [];
  for (let i = 0; i < cleanedRows.length; i++) {
    const transactionDate = parsedDates[i];
    
    // Quick date check first
    if (transactionDate < startCompare || transactionDate > endCompare) {
      continue;
    }

    // Normalize company names for matching
    const sellerNormalized = normalizeCompanyName(cleanedRows[i].sellerCompanyName);
    const buyerNormalized = normalizeCompanyName(cleanedRows[i].buyerCompanyName);

    // Check if either the sanitized names match exactly or one is a substring of the other
    const sellerMatches =
      sellerNormalized === targetNormalized ||
      (sellerNormalized.length > 5 && targetNormalized.includes(sellerNormalized)) ||
      (targetNormalized.length > 5 && sellerNormalized.includes(targetNormalized));

    const buyerMatches =
      buyerNormalized === targetNormalized ||
      (buyerNormalized.length > 5 && targetNormalized.includes(buyerNormalized)) ||
      (targetNormalized.length > 5 && buyerNormalized.includes(targetNormalized));

    if (sellerMatches || buyerMatches) {
      filteredIndices.push(i);
    }
  }

  // Create filtered array using indices
  const filtered = filteredIndices.map(i => cleanedRows[i]);

  // Performance safeguard: if too many transactions, return early with warning
  if (filtered.length > 5000) {
    return NextResponse.json({
      success: false,
      error: `Too many transactions (${filtered.length}) for this date range. Please select a smaller date range.`,
      summary: {
        invoiceNo: isPreview ? "PREVIEW" : "INV-000",
        companyName,
        companyCity: "",
        invoiceDate: new Date().toLocaleDateString("en-GB"),
        dateRange: { start: startDate, end: endDate },
        brokerageRate,
        totalQty: 0,
        brokerageAmount: 0,
        otherSideBrokerage: 0,
        totalPayable: 0,
      },
      transactions: [],
    }, { status: 400 });
  }

  /* -------------------- CALCULATIONS (SOURCE OF TRUTH) -------------------- */
  if (filtered.length === 0) {
    return NextResponse.json({
      success: true,
      summary: {
        invoiceNo: isPreview ? "PREVIEW" : "INV-000",
        companyName,
        companyCity: "",
        invoiceDate: new Date().toLocaleDateString("en-GB"),
        dateRange: { start: startDate, end: endDate },
        brokerageRate,
        totalQty: 0,
        brokerageAmount: 0,
        otherSideBrokerage: 0,
        totalPayable: 0,
      },
      transactions: [],
    });
  }

  const totalQty = filtered.reduce((s, r) => s + r.qty, 0);
  const brokerageAmount = totalQty * brokerageRate;

  const otherSideBrokerage = filtered.reduce((sum, r) => {
    if (r.sellerCompanyName.toLowerCase() === companyName.toLowerCase()) {
      const val = parseFloat(r.remarks || "0");
      return sum + (isNaN(val) ? 0 : val);
    }
    return sum;
  }, 0);

  const totalPayable =
    otherSideBrokerage > 0
      ? brokerageAmount + otherSideBrokerage
      : brokerageAmount;

  // Get sequential invoice number only for actual invoices (not preview)
  let invoiceNo = "PREVIEW";
  if (!isPreview) {
    const sequentialNumber = await getNextInvoiceNumber(sheetId);
    invoiceNo = `INV-${sequentialNumber}`;
  }

  /* -------------------- RESPONSE -------------------- */
  return NextResponse.json({
    success: true,
    summary: {
      invoiceNo,
      companyName,
      companyCity:
        filtered[0].buyerCompanyName.toLowerCase() === companyName.toLowerCase()
          ? filtered[0].buyerCompanyCity
          : filtered[0].sellerCompanyCity,
      invoiceDate: new Date().toLocaleDateString("en-GB"),
      dateRange: { start: startDate, end: endDate },
      brokerageRate,
      totalQty,
      brokerageAmount,
      otherSideBrokerage,
      totalPayable,
    },
    transactions: filtered.map((t) => ({
      date: t.date || "",
      buyerCompanyName: t.buyerCompanyName || "",
      sellerCompanyName: t.sellerCompanyName || "",
      product: t.product || "",
      qty: t.qty || 0,
      price: t.price || 0,
      remarks: t.remarks || "",
      buyerCompanyCity: t.buyerCompanyCity || "",
      sellerCompanyCity: t.sellerCompanyCity || "",
      amount: (t.qty || 0) * brokerageRate,
    })),
  });
}
