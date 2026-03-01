import { NextRequest, NextResponse } from "next/server";
import { getSheetValues, getNextInvoiceNumber } from "@/lib/sheets";
import { verifyUserAccess, getSheetIdForUser } from "@/lib/auth";
import { getCurrentFinancialYearSheetName } from "@/lib/sheets-helper";
import { z } from "zod";
import { parseDateFromSheet } from "@/lib/date-utils";

const requestSchema = z.object({
  companyName: z.string().min(1),
  companyCity: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  brokerageRate: z.coerce.number().min(0).optional(),
  isPreview: z.boolean().optional(),
  isManual: z.boolean().optional(),
  description: z.string().optional(),
  totalAmount: z.coerce.number().optional(),
  invoiceDate: z.string().optional(),
});

/* -------------------- HELPERS -------------------- */
/**
 * Normalizes a company name by removing hyphens, spaces and converting to lowercase.
 */
function normalizeString(str: string): string {
  if (!str) return "";
  return str.toLowerCase().trim().replace(/[\s-]/g, "");
}

export async function POST(req: NextRequest) {
  await verifyUserAccess();
  const sheetId = await getSheetIdForUser();
  const fySheet = getCurrentFinancialYearSheetName();

  const body = await req.json();
  const { 
    companyName, 
    companyCity, 
    startDate, 
    endDate, 
    brokerageRate = 0, 
    isPreview, 
    isManual, 
    description, 
    totalAmount,
    invoiceDate
  } = requestSchema.parse(body);

  // Get sequential invoice number for non-previews
  let invoiceNo = "PREVIEW";
  if (!isPreview) {
    const sequentialNumber = await getNextInvoiceNumber(sheetId);
    invoiceNo = `INV-${sequentialNumber}`;
  }

  /* -------------------- EXTERNAL / MANUAL MODE -------------------- */
  if (isManual) {
    // Format invoice date: if provided use it, else today
    const finalInvoiceDate = invoiceDate 
      ? new Date(invoiceDate).toLocaleDateString("en-GB")
      : new Date().toLocaleDateString("en-GB");

    return NextResponse.json({
      success: true,
      summary: {
        invoiceNo,
        companyName,
        companyCity,
        invoiceDate: finalInvoiceDate,
        dateRange: { start: "", end: "" }, // Not used in manual mode
        brokerageRate: 0,
        totalQty: 0,
        brokerageAmount: 0,
        otherSideBrokerage: 0,
        totalPayable: totalAmount || 0,
        isManual: true,
        description: description || "",
      },
      transactions: [],
    });
  }

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
  if (!startDate || !endDate) {
    return NextResponse.json({ success: false, error: "Missing dates for automated mode" }, { status: 400 });
  }

  const startDateObj = new Date(startDate);
  const startCompare = new Date(
    startDateObj.getFullYear(),
    startDateObj.getMonth(),
    startDateObj.getDate()
  );

  const endDateObj = new Date(endDate);
  const endDateTime = new Date(
    endDateObj.getFullYear(),
    endDateObj.getMonth(),
    endDateObj.getDate() + 1
  );
  const endCompare = new Date(endDateTime.getTime() - 1);

  // Pre-calculate normalized company name and city
  const targetNameNorm = normalizeString(companyName);
  const targetCityNorm = normalizeString(companyCity);

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

    // Normalize company names and cities for matching
    const sellerNameNorm = normalizeString(cleanedRows[i].sellerCompanyName);
    const sellerCityNorm = normalizeString(cleanedRows[i].sellerCompanyCity);
    const buyerNameNorm = normalizeString(cleanedRows[i].buyerCompanyName);
    const buyerCompanyCityNorm = normalizeString(cleanedRows[i].buyerCompanyCity);

    // Exact matching on both Name and City for better precision
    const sellerMatches = sellerNameNorm === targetNameNorm && sellerCityNorm === targetCityNorm;
    const buyerMatches = buyerNameNorm === targetNameNorm && buyerCompanyCityNorm === targetCityNorm;

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
        invoiceNo,
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
        invoiceNo,
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

  // Pre-calculate normalized target for other side brokerage check
  const targetNameLower = companyName.toLowerCase();
  const targetCityLower = companyCity.toLowerCase();

  const otherSideBrokerage = filtered.reduce((sum, r) => {
    // Only count remarks as brokerage if the company is the seller AND the city matches
    if (
      r.sellerCompanyName.toLowerCase() === targetNameLower &&
      r.sellerCompanyCity.toLowerCase() === targetCityLower
    ) {
      const val = parseFloat(r.remarks || "0");
      return sum + (isNaN(val) ? 0 : val);
    }
    return sum;
  }, 0);

  const totalPayable =
    otherSideBrokerage > 0
      ? brokerageAmount + otherSideBrokerage
      : brokerageAmount;

  /* -------------------- RESPONSE -------------------- */
  return NextResponse.json({
    success: true,
    summary: {
      invoiceNo,
      companyName,
      companyCity, // Use the city from the request directly
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
