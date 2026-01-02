import { type NextRequest, NextResponse } from "next/server";
import {
  appendRow,
  getSheetValues,
  getSheetHeaders,
  ensureSheet,
  sheets,
} from "@/lib/sheets";
import { verifyUserAccess, getSheetIdForUser } from "@/lib/auth";
import { getProductSheetName } from "@/lib/sheets-helper";
import { z } from "zod";

const productSchema = z.object({
  productCode: z.string().min(1, "Product code is required"),
  productName: z.string().min(1, "Product name is required"),
});

export async function GET() {
  try {
    await verifyUserAccess();
    const sheetId = await getSheetIdForUser();
    const sheetName = getProductSheetName();

    await ensureSheet(sheetId, sheetName);
    const products = await getSheetValues(sheetId, sheetName);
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    // Return empty array if sheet not found or other errors
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyUserAccess();
    const sheetId = await getSheetIdForUser();
    const sheetName = getProductSheetName();

    await ensureSheet(sheetId, sheetName);
    const body = await request.json();
    const { productCode, productName } = productSchema.parse(body);

    let headers = await getSheetHeaders(sheetId, sheetName);
    if (headers.length === 0) {
      headers = ["productCode", "productName"];
      // Set the headers in the sheet
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `'${sheetName}'!1:1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [headers],
        },
      });
    }
    const row = headers.map((header) => {
      if (header === "productCode") return productCode;
      if (header === "productName") return productName;
      return "";
    });

    await appendRow(sheetId, sheetName, row);
    return NextResponse.json({ success: true, productCode, productName });
  } catch (error) {
    console.error("Error adding product:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to add product",
      },
      { status: 500 }
    );
  }
}

// PUT request to update a product by looking up the existing product
export async function PUT(request: NextRequest) {
  try {
    await verifyUserAccess();
    const sheetId = await getSheetIdForUser();
    const sheetName = getProductSheetName();
    const body = await request.json();
    
    const { oldProductCode, data } = body; // Use oldProductCode to identify which product to update
    const { productCode, productName } = productSchema.parse(data);

    if (!oldProductCode) {
      return NextResponse.json({ error: 'Old product code is required to identify product to update' }, { status: 400 });
    }

    // Ensure the sheet exists
    await ensureSheet(sheetId, sheetName);

    // Get all products to find the specific one to update
    const products = await getSheetValues(sheetId, sheetName);
    
    // Find the product by its old product code
    const productIndex = products.findIndex(p => p.productCode === oldProductCode);
    
    if (productIndex === -1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get headers to map data correctly
    const headers = await getSheetHeaders(sheetId, sheetName);
    
    // Prepare the updated row data
    const updatedRow = headers.map((header) => {
      if (header === "productCode") return productCode;
      if (header === "productName") return productName;
      return products[productIndex][header] || ""; // Preserve other fields if any
    });

    // Update the specific row (productIndex + 2 because row 1 is headers)
    const range = `'${sheetName}'!${productIndex + 2}:${productIndex + 2}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [updatedRow],
      },
    });

    return NextResponse.json({ success: true, productCode, productName });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update product",
      },
      { status: 500 }
    );
  }
}

// DELETE request to delete a product by product code
export async function DELETE(request: NextRequest) {
  try {
    await verifyUserAccess();
    const sheetId = await getSheetIdForUser();
    const sheetName = getProductSheetName();
    const url = new URL(request.url);
    const productCode = url.searchParams.get('productCode');

    if (!productCode) {
      return NextResponse.json({ error: 'Product code is required to identify product to delete' }, { status: 400 });
    }

    // Ensure the sheet exists
    await ensureSheet(sheetId, sheetName);

    // Get all products to find the specific one to delete
    const products = await getSheetValues(sheetId, sheetName);
    
    // Find the product by product code
    const productIndex = products.findIndex(p => p.productCode === productCode);
    
    if (productIndex === -1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Delete the specific row (productIndex + 2 because row 1 is headers)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: await getSheetIdFromName(sheetId, sheetName),
                dimension: 'ROWS',
                startIndex: productIndex + 1, // 0-based index
                endIndex: productIndex + 2,   // exclusive end
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete product",
      },
      { status: 500 }
    );
  }
}

// Helper function to get sheet ID from sheet name
async function getSheetIdFromName(spreadsheetId: string, sheetName: string): Promise<number> {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });
    
    const sheet = response.data.sheets?.find(
      (s) => s.properties?.title === sheetName
    );
    
    return sheet?.properties?.sheetId || 0;
  } catch (error) {
    console.error('Error getting sheet ID:', error);
    throw new Error(
      `Failed to get sheet ID: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
