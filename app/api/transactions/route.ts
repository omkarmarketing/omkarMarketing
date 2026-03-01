import { NextRequest, NextResponse } from "next/server";
import {
  appendRow,
  insertRowChronologically,
  getSheetValues,
  getSheetHeaders,
  ensureSheet,
  sheets,
  updateRow,
  deleteRow,
} from "@/lib/sheets";
import { verifyUserAccess, getSheetIdForUser, isAmit } from "@/lib/auth";
import {
  getCurrentFinancialYearSheetName,
  getFinancialYearSheetName,
  getCompanySheetName,
  getProductSheetName,
} from "@/lib/sheets-helper";
import { z } from "zod";
import { parseDateFromSheet } from "@/lib/date-utils";

/* -------------------- SCHEMA -------------------- */
// ❌ city removed – backend derives it
const transactionSchema = z.object({
  buyerCompanyName: z.string().min(1),
  buyerCity: z.string().min(1),
  sellerCompanyName: z.string().min(1),
  sellerCity: z.string().min(1),
  date: z.string().min(1),
  product: z.string().min(1),
  qty: z.coerce.number().positive(),
  price: z.coerce.number().positive(),
  remarks: z.string().nullable().optional(),
  brokerageRate: z.coerce.number().optional().default(0),
});

/* -------------------- HELPERS -------------------- */
async function resolveCity(sheetId: string, companyName: string) {
  try {
    const companies = await getSheetValues(sheetId, getCompanySheetName());
    return (
      companies
        .find((c: any) => c.companyName === companyName)
        ?.companyCity?.toString() || ""
    );
  } catch {
    return "";
  }
}

/* -------------------- GET -------------------- */
export async function GET() {
  try {
    await verifyUserAccess();
    const sheetId = await getSheetIdForUser();
    
    // Get all sheets that start with "FY" (financial year sheets)
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });
    
    const fySheets = spreadsheet.data.sheets?.filter(
      (s) => s.properties?.title?.startsWith("FY")
    ) || [];
    
    const allRows: any[] = [];
    
    // Fetch data from all FY sheets
    for (const sheet of fySheets) {
      const sheetName = sheet.properties?.title || "";
      if (sheetName) {
        await ensureSheet(sheetId, sheetName);
        const rows = await getSheetValues(sheetId, sheetName);
        
        // Add sheet name to each row for reference
        const rowsWithSheet = rows.map((row: any) => ({
          ...row,
          _sheetName: sheetName
        }));
        
        allRows.push(...rowsWithSheet);
      }
    }

    // Fetch product data to map product codes to names (once for all sheets)
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

    // Map product codes to product names in all transactions
    const mappedRows = allRows.map((row: any) => {
      let productCode = row.product || row.Product || "";
      let productName = productCode;

      // If productCode exists in the map, use the product name instead
      if (productMap.has(productCode)) {
        productName = productMap.get(productCode);
      }

      return {
        ...row,
        product: productName,
      };
    });

    return NextResponse.json(mappedRows);
  } catch (error) {
    console.error("GET transactions error:", error);
    return NextResponse.json([]);
  }
}

/* -------------------- POST -------------------- */
export async function POST(request: NextRequest) {
  try {
    await verifyUserAccess();
    const sheetId = await getSheetIdForUser();
    const body = await request.json();
    const data = transactionSchema.parse(body);
    
    // Use transaction date to determine which sheet to use
    const transactionDate = new Date(data.date);
    const sheetName = getFinancialYearSheetName(transactionDate);

    await ensureSheet(sheetId, sheetName);

    const headers = await getSheetHeaders(sheetId, sheetName);
    const amit = await isAmit();

    const baseHeaders = [
      "sellerCompanyName",
      "sellerCompanyCity",
      "date",
      "buyerCompanyName",
      "buyerCompanyCity",
      "product",
      "qty",
      "price",
      "remarks",
    ];

    const finalHeaders =
      headers.length > 0
        ? headers
        : amit
        ? [...baseHeaders, "brokerageRate"]
        : baseHeaders;

    if (headers.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `'${sheetName}'!1:1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [finalHeaders] },
      });
    } else if (amit && !headers.includes("brokerageRate")) {
      // Append brokerageRate column to existing headers ONLY for Amit
      const nextColumnLetter = String.fromCharCode(65 + headers.length);
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `'${sheetName}'!${nextColumnLetter}1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [["brokerageRate"]] },
      });
      finalHeaders.push("brokerageRate");
    }

    const buyerCity = data.buyerCity;
    const sellerCity = data.sellerCity;

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

    // Map product code to product name if product code exists in the map
    let productValue = data.product;
    if (productMap.has(data.product)) {
      productValue = productMap.get(data.product); // Store product name instead of code
    }

    // Format date as dd-mm-yy for storage in Google Sheets
    const formattedDate = (() => {
      const dateObj = new Date(data.date);
      const day = String(dateObj.getDate()).padStart(2, "0");
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const year = String(dateObj.getFullYear()).slice(-2);
      return `${day}-${month}-${year}`;
    })();

    const row = finalHeaders.map((h) => {
      switch (h) {
        case "sellerCompanyName":
          return data.sellerCompanyName;
        case "sellerCompanyCity":
          return sellerCity;
        case "date":
          return formattedDate;
        case "buyerCompanyName":
          return data.buyerCompanyName;
        case "buyerCompanyCity":
          return buyerCity;
        case "product":
          return productValue;
        case "qty":
          return data.qty;
        case "price":
          return data.price;
        case "remarks":
          return data.remarks ?? "";
        case "brokerageRate":
          return data.brokerageRate ?? 0;
        default:
          return "";
      }
    });

    // Find the date column index
    const dateIndex = finalHeaders.indexOf("date");
    
    // Insert chronologically based on date
    await insertRowChronologically(sheetId, sheetName, row, dateIndex, transactionDate);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST transaction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create failed" },
      { status: 500 }
    );
  }
}

/* -------------------- PUT -------------------- */
export async function PUT(request: NextRequest) {
  try {
    await verifyUserAccess();
    const sheetId = await getSheetIdForUser();
    const { rowIndex, date, ...rawData } = await request.json();
    
    // Use transaction date to determine which sheet to use
    const transactionDate = new Date(date);
    const sheetName = getFinancialYearSheetName(transactionDate);
    
    const data = transactionSchema.parse({ date, ...rawData });

    if (!rowIndex || rowIndex < 2) {
      throw new Error("Invalid row index");
    }

    await ensureSheet(sheetId, sheetName);
    const headers = await getSheetHeaders(sheetId, sheetName);

    if (headers.length === 0) {
      throw new Error("Sheet headers not found");
    }

    const buyerCity = data.buyerCity;
    const sellerCity = data.sellerCity;

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

    // Map product code to product name if product code exists in the map
    let productValue = data.product;
    if (productMap.has(data.product)) {
      productValue = productMap.get(data.product); // Store product name instead of code
    }

    // Format date as dd-mm-yy for storage in Google Sheets
    const formattedDate = (() => {
      const dateObj = new Date(data.date);
      const day = String(dateObj.getDate()).padStart(2, "0");
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const year = String(dateObj.getFullYear()).slice(-2);
      return `${day}-${month}-${year}`;
    })();

    const row = headers.map((h) => {
      switch (h) {
        case "sellerCompanyName":
          return data.sellerCompanyName;
        case "sellerCompanyCity":
          return sellerCity;
        case "date":
          return formattedDate;
        case "buyerCompanyName":
          return data.buyerCompanyName;
        case "buyerCompanyCity":
          return buyerCity;
        case "product":
          return productValue;
        case "qty":
          return data.qty;
        case "price":
          return data.price;
        case "remarks":
          return data.remarks || "";
        case "brokerageRate":
          return data.brokerageRate ?? 0;
        default:
          return "";
      }
    });

    await updateRow(sheetId, sheetName, rowIndex, row);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT transaction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    );
  }
}

/* -------------------- DELETE -------------------- */
export async function DELETE(request: NextRequest) {
  try {
    await verifyUserAccess();
    const sheetId = await getSheetIdForUser();
    const sheetName = getCurrentFinancialYearSheetName();

    const { rowIndex } = await request.json();

    if (!rowIndex || rowIndex < 2) {
      throw new Error("Invalid row index");
    }

    await ensureSheet(sheetId, sheetName);
    await deleteRow(sheetId, sheetName, rowIndex);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE transaction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}

/* -------------------- INVOICE GENERATION -------------------- */
export async function generateInvoice(companyName: string) {
  try {
    const sheetId = await getSheetIdForUser();
    const sheetName = getCurrentFinancialYearSheetName();

    await ensureSheet(sheetId, sheetName);
    const rows = await getSheetValues(sheetId, sheetName);

    // Filter transactions for the given company
    const filteredTransactions = rows.filter((row: any) => {
      return (
        row.buyerCompanyName === companyName ||
        row.sellerCompanyName === companyName
      );
    });

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

    // Map product codes to product names in the transactions
    const mappedTransactions = filteredTransactions.map((row: any) => {
      let productCode = row.product || row.Product || "";
      let productName = productCode;

      // If productCode exists in the map, use the product name instead
      if (productMap.has(productCode)) {
        productName = productMap.get(productCode);
      }

      return {
        ...row,
        product: productName,
      };
    });

    // Calculate totals
    const totalQuantity = mappedTransactions.reduce(
      (sum: number, row: any) => sum + (row.qty || 0),
      0
    );
    const brokerageRate = 2.5;
    const brokerageAmount = totalQuantity * brokerageRate;

    const otherSideBrokerage = mappedTransactions.reduce(
      (sum: number, row: any) => {
        if (row.sellerCompanyName === companyName) {
          return sum + (parseFloat(row.remarks) || 0);
        }
        return sum;
      },
      0
    );

    const totalPayable = brokerageAmount + otherSideBrokerage;

    // Generate invoice details
    const invoiceNumber = `INV-${String(Date.now()).slice(-6)}`;

    if (mappedTransactions.length === 0) {
      return {
        invoiceNumber: "INV-000000",
        dateRange: "N/A",
        totalQuantity: 0,
        brokerageAmount: 0,
        otherSideBrokerage: 0,
        totalPayable: 0,
        transactions: [],
      };
    }

    const transactionDates = mappedTransactions.map((row: any) => {
      const date =
        typeof row.date === "string" ? parseDateFromSheet(row.date) : row.date;
      // Use date without time components for consistent comparison
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      ).getTime();
    });
    const earliestDate = new Date(Math.min(...transactionDates));
    const latestDate = new Date(Math.max(...transactionDates));

    // Format dates for display without time components
    const formatDateForDisplay = (date: Date) => {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const earliestFormatted = formatDateForDisplay(earliestDate);
    const latestFormatted = formatDateForDisplay(latestDate);

    const invoice = {
      invoiceNumber,
      dateRange: `${earliestFormatted} - ${latestFormatted}`,
      totalQuantity,
      brokerageAmount,
      otherSideBrokerage,
      totalPayable,
      transactions: mappedTransactions.map((row: any) => ({
        date: row.date || "",
        buyerCompanyName: row.buyerCompanyName || "",
        sellerCompanyName: row.sellerCompanyName || "",
        product: row.product || "",
        qty: row.qty || 0,
        price: row.price || 0,
        remarks: row.remarks || "",
        buyerCompanyCity: row.buyerCompanyCity || "",
        sellerCompanyCity: row.sellerCompanyCity || "",
        amount: (row.qty || 0) * (row.price || 0),
      })),
    };

    return invoice;
  } catch (error) {
    console.error("Invoice generation error:", error);
    throw new Error("Failed to generate invoice");
  }
}
