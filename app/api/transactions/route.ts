import { NextRequest, NextResponse } from "next/server";
import {
  appendRow,
  getSheetValues,
  getSheetHeaders,
  ensureSheet,
  sheets,
  updateRow,
  deleteRow,
} from "@/lib/sheets";
import { verifyUserAccess, getSheetIdForUser } from "@/lib/auth";
import {
  getCurrentFinancialYearSheetName,
  getCompanySheetName,
} from "@/lib/sheets-helper";
import { z } from "zod";

/* -------------------- SCHEMA -------------------- */
// ❌ city removed – backend derives it
const transactionSchema = z.object({
  buyerCompanyName: z.string().min(1),
  sellerCompanyName: z.string().min(1),
  date: z.string().min(1),
  product: z.string().min(1),
  qty: z.coerce.number().positive(),
  price: z.coerce.number().positive(),
  remarks: z.string().nullable().optional(), // ✅ FIX
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
    const sheetName = getCurrentFinancialYearSheetName();

    await ensureSheet(sheetId, sheetName);
    const rows = await getSheetValues(sheetId, sheetName);

    return NextResponse.json(rows);
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
    const sheetName = getCurrentFinancialYearSheetName();

    const body = await request.json();
    const data = transactionSchema.parse(body);

    await ensureSheet(sheetId, sheetName);

    const headers = await getSheetHeaders(sheetId, sheetName);

    const finalHeaders =
      headers.length > 0
        ? headers
        : [
            "buyerCompanyName",
            "buyerCompanyCity",
            "sellerCompanyName",
            "sellerCompanyCity",
            "date",
            "product",
            "qty",
            "price",
            "remarks",
          ];

    if (headers.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `'${sheetName}'!1:1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [finalHeaders] },
      });
    }

    const buyerCity = await resolveCity(sheetId, data.buyerCompanyName);
    const sellerCity = await resolveCity(sheetId, data.sellerCompanyName);

    const row = finalHeaders.map((h) => {
      switch (h) {
        case "buyerCompanyName":
          return data.buyerCompanyName;
        case "buyerCompanyCity":
          return buyerCity;
        case "sellerCompanyName":
          return data.sellerCompanyName;
        case "sellerCompanyCity":
          return sellerCity;
        case "date":
          return data.date;
        case "product":
          return data.product;
        case "qty":
          return data.qty;
        case "price":
          return data.price;
        case "remarks":
          return data.remarks ?? "";
        default:
          return "";
      }
    });

    await appendRow(sheetId, sheetName, row);

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
    const sheetName = getCurrentFinancialYearSheetName();

    const { rowIndex, ...rawData } = await request.json();

    if (!rowIndex || rowIndex < 2) {
      throw new Error("Invalid row index");
    }

    const data = transactionSchema.parse(rawData);

    await ensureSheet(sheetId, sheetName);
    const headers = await getSheetHeaders(sheetId, sheetName);

    if (headers.length === 0) {
      throw new Error("Sheet headers not found");
    }

    const buyerCity = await resolveCity(sheetId, data.buyerCompanyName);
    const sellerCity = await resolveCity(sheetId, data.sellerCompanyName);

    const row = headers.map((h) => {
      switch (h) {
        case "buyerCompanyName":
          return data.buyerCompanyName;
        case "buyerCompanyCity":
          return buyerCity;
        case "sellerCompanyName":
          return data.sellerCompanyName;
        case "sellerCompanyCity":
          return sellerCity;
        case "date":
          return data.date;
        case "product":
          return data.product;
        case "qty":
          return data.qty;
        case "price":
          return data.price;
        case "remarks":
          return data.remarks || "";
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
