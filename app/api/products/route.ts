// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuth } from "@/lib/googleSheets";

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const PRODUCTS_SHEET = "Products";

async function ensureSheetAndHeaders(sheets: any) {
  const sheetInfo = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheetExists = sheetInfo.data.sheets?.some(
    (sheet: any) => sheet.properties?.title === PRODUCTS_SHEET
  );

  if (!sheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: PRODUCTS_SHEET,
              },
            },
          },
        ],
      },
    });
  }

  const headersResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${PRODUCTS_SHEET}!A1:B1`,
  });
  const headers = headersResponse.data.values?.[0];
  if (
    !headers ||
    headers.length < 2 ||
    headers[0] !== "Product Code" ||
    headers[1] !== "Product Name"
  ) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PRODUCTS_SHEET}!A1:B1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["Product Code", "Product Name"]] },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!SPREADSHEET_ID) {
      return NextResponse.json(
        { error: "GOOGLE_SPREADSHEET_ID environment variable not set" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { code, name } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: "Product code and name are required" },
        { status: 400 }
      );
    }

    const sheets = await getGoogleAuth();
    await ensureSheetAndHeaders(sheets);

    const values = [[code, name]];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PRODUCTS_SHEET}!A2:B`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    return NextResponse.json(
      { message: "Product added successfully", data: response.data },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error adding product:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add product" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    if (!SPREADSHEET_ID) {
      return NextResponse.json(
        { error: "GOOGLE_SPREADSHEET_ID environment variable not set" },
        { status: 500 }
      );
    }

    const sheets = await getGoogleAuth();
    await ensureSheetAndHeaders(sheets);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PRODUCTS_SHEET}!A2:B`,
    });

    const products = response.data.values?.map((row: any[]) => ({
      code: row[0] || "",
      name: row[1] || "",
    }));

    return NextResponse.json(products || []);
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!SPREADSHEET_ID) {
      return NextResponse.json(
        { error: "GOOGLE_SPREADSHEET_ID environment variable not set" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { code, name } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: "Product code and name are required" },
        { status: 400 }
      );
    }

    const sheets = await getGoogleAuth();
    await ensureSheetAndHeaders(sheets);

    // Get all products to find the row number
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PRODUCTS_SHEET}!A2:B`,
    });

    const products = response.data.values || [];
    const rowIndex = products.findIndex((row: any[]) => row[0] === code);

    if (rowIndex === -1) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Update the specific row (add 2 because header row and 0-based index)
    const updateRange = `${PRODUCTS_SHEET}!A${rowIndex + 2}:B${rowIndex + 2}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: updateRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[code, name]],
      },
    });

    return NextResponse.json(
      { message: "Product updated successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!SPREADSHEET_ID) {
      return NextResponse.json(
        { error: "GOOGLE_SPREADSHEET_ID environment variable not set" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Product code is required" },
        { status: 400 }
      );
    }

    const sheets = await getGoogleAuth();
    await ensureSheetAndHeaders(sheets);

    // Get all products to find the row number
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PRODUCTS_SHEET}!A2:B`,
    });

    const products = response.data.values || [];
    const rowIndex = products.findIndex((row: any[]) => row[0] === code);

    if (rowIndex === -1) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Delete the row
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetId = sheetInfo.data.sheets?.find(
      (sheet: any) => sheet.properties?.title === PRODUCTS_SHEET
    )?.properties?.sheetId;

    if (!sheetId) {
      return NextResponse.json(
        { error: "Products sheet not found" },
        { status: 404 }
      );
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowIndex + 1, // +1 for header row
                endIndex: rowIndex + 2,
              },
            },
          },
        ],
      },
    });

    return NextResponse.json(
      { message: "Product deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete product" },
      { status: 500 }
    );
  }
}
