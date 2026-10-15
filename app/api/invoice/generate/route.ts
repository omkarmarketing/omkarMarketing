import { NextRequest, NextResponse } from "next/server";
import {
  getSheetValues,
  getNextInvoiceNumber,
  ensureSheet,
  sheets,
  type SheetRow,
} from "@/lib/sheets";
import { verifyUserAccess, getSheetIdForUser, isAmit } from "@/lib/auth";
import { getCompanySheetName, getFinancialYearSheetName } from "@/lib/sheets-helper";
import { globalCache } from "@/lib/cache";
import { z } from "zod";
import { parseDateFromSheet, formatDateToDots } from "@/lib/date-utils";
import {
  createInvoiceFingerprint,
  roundCurrency,
} from "@/lib/invoice-utils";

const requestSchema = z.object({
  companyName: z.string().trim().min(1),
  companyCity: z.string().trim().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  brokerageRate: z.coerce.number().min(0).max(100).optional(),
  isPreview: z.boolean().optional(),
  isManual: z.boolean().optional(),
  description: z.string().optional(),
  totalAmount: z.coerce.number().min(0)
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, {
      message: "Use no more than two decimal places for the total amount.",
    })
    .optional(),
  invoiceDate: z.string().optional(),
  expectedFingerprint: z.string().optional(),
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
  const email = await verifyUserAccess();
  const sheetId = await getSheetIdForUser();

  const body = await req.json();
  const parsedBody = requestSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { success: false, error: parsedBody.error.issues[0]?.message || "Enter valid invoice details." },
      { status: 400 },
    );
  }
  const { 
    companyName: requestedCompanyName,
    companyCity: requestedCompanyCity,
    startDate, 
    endDate,
    brokerageRate: requestedBrokerageRate,
    isPreview, 
    isManual, 
    description, 
    totalAmount,
    invoiceDate,
    expectedFingerprint,
  } = parsedBody.data;
  const companySheetName = getCompanySheetName();
  const companyCacheKey = `companies_${email}`;
  let companies = globalCache.get<SheetRow[]>(companyCacheKey);
  if (!companies) {
    await ensureSheet(sheetId, companySheetName);
    companies = await getSheetValues(sheetId, companySheetName);
    globalCache.set(companyCacheKey, companies, 10 * 60 * 1000);
  }
  const selectedCompany = companies.find(
    (company) =>
      String(company.companyName || "").trim().toLowerCase() ===
        requestedCompanyName.trim().toLowerCase() &&
      String(company.companyCity || "").trim().toLowerCase() ===
        requestedCompanyCity.trim().toLowerCase(),
  );
  if (!selectedCompany) {
    return NextResponse.json(
      { success: false, error: "Select the company and city from Company Master." },
      { status: 400 },
    );
  }
  const companyName = String(selectedCompany.companyName || "");
  const companyCity = String(selectedCompany.companyCity || "");
  const brokerageRate = requestedBrokerageRate ?? 0;
  const generatedInvoiceDate = formatDateToDots(new Date());

  let invoiceNo = "PREVIEW";

  /* -------------------- EXTERNAL / MANUAL MODE -------------------- */
  if (isManual) {
    if (!description?.trim()) {
      return NextResponse.json({ success: false, error: "Description is required for a manual invoice." }, { status: 400 });
    }
    if (totalAmount === undefined || !Number.isFinite(totalAmount) || totalAmount < 0) {
      return NextResponse.json({ success: false, error: "Enter a valid manual invoice total." }, { status: 400 });
    }
    if (requestedBrokerageRate === undefined) {
      return NextResponse.json({ success: false, error: "Enter the manual brokerage percentage." }, { status: 400 });
    }
    if (!invoiceDate) {
      return NextResponse.json({ success: false, error: "Enter a manual invoice date." }, { status: 400 });
    }
    const parsedInvoiceDate = parseDateFromSheet(invoiceDate || new Date());
    if (Number.isNaN(parsedInvoiceDate.getTime())) {
      return NextResponse.json({ success: false, error: "Enter a valid invoice date." }, { status: 400 });
    }
    // Format invoice date: if provided use it, else today
    const finalInvoiceDate = formatDateToDots(parsedInvoiceDate);
    const fingerprint = createInvoiceFingerprint({
      mode: "manual",
      companyName,
      companyCity,
      invoiceDate: finalInvoiceDate,
      description: description.trim(),
      brokerageRate,
      totalAmount,
    });
    if (!isPreview && expectedFingerprint !== fingerprint) {
      return NextResponse.json(
        { success: false, error: "Invoice details changed after preview. Review the preview and try again." },
        { status: 409 },
      );
    }
    if (!isPreview) {
      const sequentialNumber = await getNextInvoiceNumber(sheetId);
      invoiceNo = `INV-${sequentialNumber}`;
    }

    return NextResponse.json({
      success: true,
      fingerprint,
      summary: {
        invoiceNo,
        companyName,
        companyCity,
        invoiceDate: finalInvoiceDate,
        dateRange: { start: "", end: "" }, // Not used in manual mode
        brokerageRate,
        totalQty: 0,
        brokerageAmount: 0,
        otherSideBrokerage: 0,
        totalPayable: totalAmount,
        isManual: true,
        description: description.trim(),
      },
      transactions: [],
    });
  }

  if (!startDate || !endDate) {
    return NextResponse.json({ success: false, error: "Select both invoice start and end dates." }, { status: 400 });
  }

  const startDateObj = parseDateFromSheet(startDate);
  const endDateObj = parseDateFromSheet(endDate);
  if (
    Number.isNaN(startDateObj.getTime()) ||
    Number.isNaN(endDateObj.getTime()) ||
    startDateObj > endDateObj
  ) {
    return NextResponse.json({ success: false, error: "Enter a valid date range with the start date on or before the end date." }, { status: 400 });
  }

  const firstFinancialYear = Number(getFinancialYearSheetName(startDateObj).slice(2, 6));
  const lastFinancialYear = Number(getFinancialYearSheetName(endDateObj).slice(2, 6));
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const eligibleSheetNames = (spreadsheet.data.sheets || [])
    .map((sheet) => sheet.properties?.title || "")
    .filter((name) => {
      const match = name.match(/^FY(\d{4})-\d{2}$/);
      if (!match) return false;
      const year = Number(match[1]);
      return year >= firstFinancialYear && year <= lastFinancialYear;
    });
  const rowsByFinancialYear = await Promise.all(
    eligibleSheetNames.map((sheetName) => getSheetValues(sheetId, sheetName)),
  );
  const rows = rowsByFinancialYear.flat();

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
    brokerageRate: Number(r.brokerageRate || r["brokerageRate"] || 0),
    remarks: r.remarks || "",
  }));

  /* -------------------- OPTIMIZED FILTERING -------------------- */
  const startCompare = new Date(
    startDateObj.getFullYear(),
    startDateObj.getMonth(),
    startDateObj.getDate()
  );

  const endExclusive = new Date(
    endDateObj.getFullYear(),
    endDateObj.getMonth(),
    endDateObj.getDate() + 1,
  );

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
    if (
      Number.isNaN(transactionDate.getTime()) ||
      transactionDate < startCompare ||
      transactionDate >= endExclusive
    ) {
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
        invoiceDate: formatDateToDots(new Date()),
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
        invoiceDate: formatDateToDots(new Date()),
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
  const amit = await isAmit();
  const brokerageAmount = roundCurrency(
    amit
      ? filtered.reduce((sum, r) => sum + r.qty * r.brokerageRate, 0)
      : totalQty * brokerageRate,
  );

  // Pre-calculate normalized target for other side brokerage check
  const targetNameLower = companyName.toLowerCase();
  const targetCityLower = companyCity.toLowerCase();

  const otherSideBrokerage = roundCurrency(filtered.reduce((sum, r) => {
    // Only count remarks as brokerage if the company is the seller AND the city matches
    if (
      r.sellerCompanyName.toLowerCase() === targetNameLower &&
      r.sellerCompanyCity.toLowerCase() === targetCityLower
    ) {
      const val = parseFloat(r.remarks || "0");
      return sum + (isNaN(val) ? 0 : val);
    }
    return sum;
  }, 0));

  const totalPayable = roundCurrency(
    otherSideBrokerage > 0
      ? brokerageAmount + otherSideBrokerage
      : brokerageAmount,
  );

  const fingerprint = createInvoiceFingerprint({
    mode: "standard",
    companyName,
    companyCity,
    startDate,
    endDate,
    invoiceDate: generatedInvoiceDate,
    brokerageRate,
    isAmit: amit,
    transactions: filtered.map((row) => [
      row.date,
      row.buyerCompanyName,
      row.buyerCompanyCity,
      row.sellerCompanyName,
      row.sellerCompanyCity,
      row.product,
      row.qty,
      row.price,
      row.brokerageRate,
      row.remarks,
    ]),
    totalQty,
    brokerageAmount,
    otherSideBrokerage,
    totalPayable,
  });
  if (!isPreview && expectedFingerprint !== fingerprint) {
    return NextResponse.json(
      { success: false, error: "Transaction data changed after preview. Review the preview and try again." },
      { status: 409 },
    );
  }

  if (!isPreview) {
    const sequentialNumber = await getNextInvoiceNumber(sheetId);
    invoiceNo = `INV-${sequentialNumber}`;
  }

  /* -------------------- RESPONSE -------------------- */
  return NextResponse.json({
    success: true,
    fingerprint,
    summary: {
      invoiceNo,
      companyName,
      companyCity, // Use the city from the request directly
      invoiceDate: generatedInvoiceDate,
      dateRange: { start: startDate, end: endDate },
      brokerageRate,
      totalQty,
      brokerageAmount,
      otherSideBrokerage,
      totalPayable,
      isAmit: amit,
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
      brokerageRate: amit ? t.brokerageRate : brokerageRate,
      amount: amit ? (t.qty || 0) * (t.brokerageRate || 0) : (t.qty || 0) * brokerageRate,
    })),
  });
}
