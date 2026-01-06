import { NextRequest, NextResponse } from "next/server";
import { getSheetValues } from "@/lib/sheets";
import { verifyUserAccess, getSheetIdForUser } from "@/lib/auth";
import {
  getCurrentFinancialYearSheetName,
  getProductSheetName,
} from "@/lib/sheets-helper";
import { z } from "zod";

const requestSchema = z.object({
  companyName: z.string(),
  companyCity: z.string().optional(),
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

  // Fetch product data to map product codes to names
  const productSheetName = getProductSheetName();
  const productRows = await getSheetValues(sheetId, productSheetName);
  const productMap = new Map();
  productRows.forEach((p: any) => {
    const productCode =
      p.productCode || p["productCode"] || p["Product Code"] || "";
    const productName =
      p.productName || p["productName"] || p["Product Name"] || "";
    if (productCode) {
      productMap.set(productCode, productName);
    }
  });

  // FIX DATA FIELD MAPPING - Handle both abbreviated and full column names
  const cleanedRows = rows.map((r: any) => {
    const buyerCol =
      r.buyerCompanyN || r.buyerCompanyName || r["Buyer Company"] || r["Buyer"];
    const sellerCol =
      r.sellerCompanyN ||
      r.sellerCompanyName ||
      r["Seller Company"] ||
      r["Seller"];

    // Map product code to product name
    let productCode = r.productCode || r["Product Code"] || "";
    let productName = r.product || r.Product || "";

    // If product field is empty but productCode exists, try to map it to product name
    if (!productName && productCode && productMap.has(productCode)) {
      productName = productMap.get(productCode);
    }

    // If product field is empty and productCode is empty, try to use product field as potential product code
    if (!productName && !productCode) {
      productCode = r.product || r.Product || "";
      if (productMap.has(productCode)) {
        productName = productMap.get(productCode);
      }
    }

    return {
      buyerCompanyName: buyerCol,
      buyerCompanyCity: r.buyerCompanyCity || r["Buyer City"] || "",
      sellerCompanyName: sellerCol,
      sellerCompanyCity: r.sellerCompanyCity || r["Seller City"] || "",
      date: r.date || r.Date,
      product: productName,
      productCode: productCode,
      qty: Number(r.qty || r.Qty || r.quantity || 0) || 0,
      price: Number(r.price || r.Price || 0) || 0,
      remarks: r.remarks || r.Remarks || "",
    };
  });

  console.log("Cleaned rows:", cleanedRows);
  console.log("Searching for company:", companyName);
  console.log("Date range:", startDate, "to", endDate);

  // AUTO INVOICE # - Use sequential numbering starting from 1
  const invoiceNumber = cleanedRows.length + 1;
  const paddedInvoice = `INV-${invoiceNumber.toString().padStart(3, "0")}`;

  // FILTERED TRANSACTIONS FOR MAIN INVOICE
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

  // FILTERED TRANSACTIONS FOR OTHER SIDE BROKERAGE
  const otherSideFiltered = cleanedRows.filter((tx) => {
    const d = new Date(tx.date);
    const isDateInRange = d >= new Date(startDate) && d <= new Date(endDate);

    // Check if this transaction involves the company but on the opposite role
    // If company was buyer in main invoice, find where it was seller in other side
    // If company was seller in main invoice, find where it was buyer in other side
    const companyWasBuyerInMain = filtered.some(
      (f) => f.buyerCompanyName.toLowerCase() === companyName.toLowerCase()
    );

    const companyWasSellerInMain = filtered.some(
      (f) => f.sellerCompanyName.toLowerCase() === companyName.toLowerCase()
    );

    const isOtherSideMatch =
      (companyWasBuyerInMain &&
        tx.sellerCompanyName &&
        tx.sellerCompanyName.toLowerCase() === companyName.toLowerCase()) ||
      (companyWasSellerInMain &&
        tx.buyerCompanyName &&
        tx.buyerCompanyName.toLowerCase() === companyName.toLowerCase());

    return isDateInRange && isOtherSideMatch;
  });

  console.log("Filtered transactions:", filtered);

  if (!filtered.length) {
    return NextResponse.json({
      success: false,
      error: "No matching transactions found.",
    });
  }

  // CALCULATE TOTAL QUANTITY = sum of qty from all transactions
  const totalQty = filtered.reduce((sum, r) => sum + r.qty, 0);

  // CALCULATE BROKERAGE AMOUNT = Total Quantity × Brokerage Rate
  const brokerageAmount = totalQty * brokerageRate;

  // CALCULATE OTHER SIDE BROKERAGE = sum of remarksAmount from transactions
  // Only include remarks when the company is the seller
  const otherSideBrokerage = filtered.reduce((sum, r) => {
    if (
      r.sellerCompanyName &&
      r.sellerCompanyName.toLowerCase() === companyName.toLowerCase()
    ) {
      const remarkValue = r.remarks ? parseFloat(r.remarks) || 0 : 0;
      return sum + remarkValue;
    }
    return sum;
  }, 0);

  // CALCULATE OTHER SIDE BROKERAGE TOTAL (for transactions where company was on opposite role)
  const otherSideTotalQty = otherSideFiltered.reduce(
    (sum, r) => sum + r.qty,
    0
  );
  const otherSideTotalPayable = otherSideTotalQty * brokerageRate;

  // CALCULATE TOTAL BROKERAGE AMOUNT = (Total Qty * Brokerage Rate) + Other Side Brokerage
  const totalBrokerageAmount = brokerageAmount + otherSideBrokerage;

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
    remarks:
      tx.sellerCompanyName &&
      tx.sellerCompanyName.toLowerCase() === companyName.toLowerCase()
        ? String(tx.remarks || "").trim()
        : "",
  }));

  // Format other side transactions
  const formattedOtherSideTransactions = otherSideFiltered.map((tx) => ({
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
    remarks:
      tx.sellerCompanyName &&
      tx.sellerCompanyName.toLowerCase() === companyName.toLowerCase()
        ? String(tx.remarks || "").trim()
        : "",
  }));

  // For preview requests, we don't want to generate a new invoice number
  const invoiceNumberForPreview = isPreview ? "PREVIEW" : paddedInvoice;
  const invoiceDateForPreview = isPreview
    ? "Preview Date"
    : new Date().toLocaleDateString("en-GB");

  // Get company details to include city
  const companyDetails = cleanedRows.find(
    (row) =>
      row.buyerCompanyName?.toLowerCase() === companyName.toLowerCase() ||
      row.sellerCompanyName?.toLowerCase() === companyName.toLowerCase()
  );

  const companyCity = companyDetails
    ? companyDetails.buyerCompanyName?.toLowerCase() ===
      companyName.toLowerCase()
      ? companyDetails.buyerCompanyCity
      : companyDetails.sellerCompanyCity
    : "";

  const response = {
    success: true,
    summary: {
      invoiceNo: invoiceNumberForPreview,
      companyName,
      companyCity,
      invoiceDate: invoiceDateForPreview,
      dateRange: {
        start: formatDate(startDate),
        end: formatDate(endDate),
      },
      brokerageRate,
      totalQty,
      brokerageAmount,
      otherSideBrokerage,
      otherSideTotalPayable,
      totalPayable: totalBrokerageAmount, // Total brokerage amount
    },
    transactions: formattedTransactions,
    otherSideTransactions: formattedOtherSideTransactions,
  };

  // For actual invoice generation (not preview), we can add additional processing here if needed
  if (!isPreview) {
    // This is where we could add actual invoice generation logic
    // For now, we're just returning the same response
  }

  return NextResponse.json(response);
}
