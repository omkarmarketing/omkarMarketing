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
  getProductSheetName,
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
    const mappedRows = rows.map((row: any) => {
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
    const sheetName = getCurrentFinancialYearSheetName();

    const body = await request.json();
    const data = transactionSchema.parse(body);

    await ensureSheet(sheetId, sheetName);

    const headers = await getSheetHeaders(sheetId, sheetName);

    const finalHeaders =
      headers.length > 0
        ? headers
        : [
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

    // Map product name to product code if product name exists in the map
    let productValue = data.product;
    for (const [code, name] of productMap.entries()) {
      if (name === data.product) {
        productValue = code; // Store product code instead of name
        break;
      }
    }

    const row = headers.map((h) => {
      switch (h) {
        case "sellerCompanyName":
          return data.sellerCompanyName;
        case "sellerCompanyCity":
          return sellerCity;
        case "date":
          return data.date;
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

    // Map product name to product code if product name exists in the map
    let productValue = data.product;
    for (const [code, name] of productMap.entries()) {
      if (name === data.product) {
        productValue = code; // Store product code instead of name
        break;
      }
    }

    const row = headers.map((h) => {
      switch (h) {
        case "sellerCompanyName":
          return data.sellerCompanyName;
        case "sellerCompanyCity":
          return sellerCity;
        case "date":
          return data.date;
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
