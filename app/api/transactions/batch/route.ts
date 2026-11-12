import { NextRequest, NextResponse } from "next/server";
import {
  appendRows,
  insertRowChronologically,
  getSheetHeaders,
  getSheetValues,
  ensureSheet,
  sheets,
} from "@/lib/sheets";
import { verifyUserAccess, getSheetIdForUser, isAmit, isClerkConfigured } from "@/lib/auth";
import {
  getFinancialYearSheetName,
  getCompanySheetName,
  getProductSheetName,
} from "@/lib/sheets-helper";
import { z } from "zod";
import { globalCache } from "@/lib/cache";
import { parseDateFromSheet } from "@/lib/date-utils";

const transactionSchema = z.object({
  buyerCompanyName: z.string().trim().min(1),
  buyerCity: z.string().trim().optional(),
  sellerCompanyName: z.string().trim().min(1),
  sellerCity: z.string().trim().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  product: z.string().trim().min(1),
  qty: z.coerce.number().positive(),
  price: z.coerce.number().positive(),
  remarks: z.string().nullable().optional(),
  brokerageRate: z.coerce.number().optional().default(0),
});

const batchSchema = z.object({
  transactions: z.array(transactionSchema).min(1, "At least one transaction is required"),
});

function isValidDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

async function getCompanyMap(sheetId: string, email: string) {
  const cacheKey = `companies_${email}`;
  const cachedCompanies = globalCache.get<any[]>(cacheKey);
  const companies =
    cachedCompanies ?? (await getSheetValues(sheetId, getCompanySheetName()));
  if (!cachedCompanies) globalCache.set(cacheKey, companies, 10 * 60 * 1000);
  return new Map(
    companies.map((company) => [
      String(company.companyName || "").trim().toLowerCase(),
      String(company.companyCity || "").trim(),
    ]),
  );
}

async function getProductMap(sheetId: string, email: string) {
  const cacheKey = `products_${email}`;
  const cachedProducts = globalCache.get<any[]>(cacheKey);
  const products =
    cachedProducts ?? (await getSheetValues(sheetId, getProductSheetName()));
  if (!cachedProducts) globalCache.set(cacheKey, products, 10 * 60 * 1000);
  const map = new Map<string, string>();
  for (const product of products) {
    const code = String(product.productCode || product["Product Code"] || "").trim();
    const name = String(product.productName || product["Product Name"] || "").trim();
    if (code) map.set(code.toLowerCase(), name || code);
    if (name) map.set(name.toLowerCase(), name);
  }
  return map;
}

export async function POST(request: NextRequest) {
  if (!isClerkConfigured()) {
    const body = await request.json();
    return NextResponse.json({
      success: true,
      count: body.transactions?.length || 0,
    });
  }

  try {
    const email = await verifyUserAccess();
    const sheetId = await getSheetIdForUser();
    const body = await request.json();
    const parsedBody = batchSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message || "Invalid transaction details." },
        { status: 400 },
      );
    }

    const { transactions } = parsedBody.data;
    const companyMap = await getCompanyMap(sheetId, email);
    const productMap = await getProductMap(sheetId, email);
    const amit = await isAmit();

    // Group transactions by target financial year sheet
    const groups = new Map<string, typeof transactions>();

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      if (!isValidDateOnly(tx.date)) {
        return NextResponse.json(
          { error: `Row ${i + 1}: Invalid date ${tx.date}` },
          { status: 400 },
        );
      }

      const sellerKey = tx.sellerCompanyName.trim().toLowerCase();
      const buyerKey = tx.buyerCompanyName.trim().toLowerCase();
      const productKey = tx.product.trim().toLowerCase();

      // Ensure companies exist in master
      if (!companyMap.has(sellerKey) || !companyMap.has(buyerKey)) {
        return NextResponse.json(
          {
            error: `Row ${i + 1}: Both '${tx.sellerCompanyName}' and '${tx.buyerCompanyName}' must exist in Company Master.`,
          },
          { status: 400 },
        );
      }

      // Ensure product exists in master
      if (!productMap.has(productKey)) {
        return NextResponse.json(
          {
            error: `Row ${i + 1}: Product '${tx.product}' was not found in Product Master.`,
          },
          { status: 400 },
        );
      }

      const [year, month, day] = tx.date.split("-").map(Number);
      const txDate = new Date(year, month - 1, day);
      const sheetName = getFinancialYearSheetName(txDate);

      const group = groups.get(sheetName) || [];
      group.push(tx);
      groups.set(sheetName, group);
    }

    let savedCount = 0;

    for (const [sheetName, txList] of groups.entries()) {
      await ensureSheet(sheetId, sheetName);
      const headers = await getSheetHeaders(sheetId, sheetName);

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
        const nextColumnLetter = String.fromCharCode(65 + headers.length);
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `'${sheetName}'!${nextColumnLetter}1`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [["brokerageRate"]] },
        });
        finalHeaders.push("brokerageRate");
      }

      const dateIndex = finalHeaders.indexOf("date");

      // Check existing rows to decide whether to append in bulk or insert chronologically
      const existingValues = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `'${sheetName}'!A:Z`,
      });

      const values = existingValues.data.values || [];
      const dataRows = values.slice(1);

      // Convert all transactions into row arrays
      const preparedRows = txList.map((tx) => {
        const [year, month, day] = tx.date.split("-").map(Number);
        const txDate = new Date(year, month - 1, day);
        const formattedDate = `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${String(year).slice(-2)}`;
        const sellerCity = companyMap.get(tx.sellerCompanyName.trim().toLowerCase()) || "";
        const buyerCity = companyMap.get(tx.buyerCompanyName.trim().toLowerCase()) || "";
        const canonicalProduct = productMap.get(tx.product.trim().toLowerCase()) || tx.product;

        const row = finalHeaders.map((h) => {
          switch (h) {
            case "sellerCompanyName":
              return tx.sellerCompanyName;
            case "sellerCompanyCity":
              return sellerCity;
            case "date":
              return formattedDate;
            case "buyerCompanyName":
              return tx.buyerCompanyName;
            case "buyerCompanyCity":
              return buyerCity;
            case "product":
              return canonicalProduct;
            case "qty":
              return tx.qty;
            case "price":
              return tx.price;
            case "remarks":
              return tx.remarks || "";
            case "brokerageRate":
              return tx.brokerageRate || 0;
            default:
              return "";
          }
        });

        return { row, date: txDate };
      });

      // Find the latest existing date in the sheet
      let latestExistingDate = new Date(0);
      for (const row of dataRows) {
        const d = parseDateFromSheet(row[dateIndex]);
        if (!isNaN(d.getTime()) && d > latestExistingDate) {
          latestExistingDate = d;
        }
      }

      // Check if all new rows are chronological (after or equal to latest existing)
      const allAfterLatest = preparedRows.every((item) => item.date >= latestExistingDate);

      if (allAfterLatest || dataRows.length === 0) {
        // Fast path: sort newly prepared rows by date and append in one single API call
        preparedRows.sort((a, b) => a.date.getTime() - b.date.getTime());
        await appendRows(sheetId, sheetName, preparedRows.map((item) => item.row));
        savedCount += preparedRows.length;
      } else {
        // Interleaved backdated path: insert each chronologically
        for (const item of preparedRows) {
          await insertRowChronologically(sheetId, sheetName, item.row, dateIndex, item.date);
          savedCount += 1;
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: savedCount,
    });
  } catch (error) {
    console.error("Batch transaction save error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Batch transaction save failed." },
      { status: 500 },
    );
  }
}
