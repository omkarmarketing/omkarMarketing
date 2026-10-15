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
import { globalCache } from "@/lib/cache";

const productSchema = z.object({
  productCode: z.string().trim().min(1, "Product code is required"),
  productName: z.string().trim().min(1, "Product name is required"),
  brokerageRate: z.coerce.number().optional().default(0),
});

const CACHE_KEY_PREFIX = "products_";

export async function GET() {
  try {
    const userId = await verifyUserAccess();
    const sheetId = await getSheetIdForUser();
    const sheetName = getProductSheetName();

    // Try cache first
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    const cachedProducts = globalCache.get<any[]>(cacheKey);
    if (cachedProducts) {
      console.log(`Serving products from cache for user ${userId}`);
      return NextResponse.json(cachedProducts);
    }

    await ensureSheet(sheetId, sheetName);
    const products = await getSheetValues(sheetId, sheetName);

    // Store in cache for 10 minutes
    globalCache.set(cacheKey, products, 10 * 60 * 1000);

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Unable to load products. Please try again." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyUserAccess();
    const sheetId = await getSheetIdForUser();
    const sheetName = getProductSheetName();

    await ensureSheet(sheetId, sheetName);
    const body = await request.json();
    const parsedBody = productSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message || "Enter valid product details." },
        { status: 400 },
      );
    }
    const { productCode, productName, brokerageRate } = parsedBody.data;
    const products = await getSheetValues(sheetId, sheetName);
    const normalizedCode = productCode.trim().toLowerCase();
    if (
      products.some(
        (product) =>
          String(product.productCode || "").trim().toLowerCase() === normalizedCode,
      )
    ) {
      return NextResponse.json({ error: "A product with this code already exists." }, { status: 409 });
    }

    // Clear cache
    globalCache.clear(`${CACHE_KEY_PREFIX}${userId}`);

    let headers = await getSheetHeaders(sheetId, sheetName);
    if (headers.length === 0) {
      headers = ["productCode", "productName", "brokerageRate"];
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
      if (header === "brokerageRate") return brokerageRate || 0;
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
    const userId = await verifyUserAccess();
    const sheetId = await getSheetIdForUser();
    const sheetName = getProductSheetName();
    const body = await request.json();
    
    const { oldProductCode, data } = body;
    const parsedData = productSchema.safeParse(data);
    if (!parsedData.success) {
      return NextResponse.json(
        { error: parsedData.error.issues[0]?.message || "Enter valid product details." },
        { status: 400 },
      );
    }
    const { productCode, productName, brokerageRate } = parsedData.data;

    if (!oldProductCode) {
      return NextResponse.json({ error: 'Old product code is required to identify product to update' }, { status: 400 });
    }

    // Clear cache
    globalCache.clear(`${CACHE_KEY_PREFIX}${userId}`);

    // Ensure the sheet exists
    await ensureSheet(sheetId, sheetName);

    // Get all products to find the specific one to update
    const products = await getSheetValues(sheetId, sheetName);
    
    // Find the product by its old product code
    const productIndex = products.findIndex(p => p.productCode === oldProductCode);
    
    if (productIndex === -1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    if (
      productCode.trim().toLowerCase() !== String(oldProductCode).trim().toLowerCase()
    ) {
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
      const financialYearSheets = (spreadsheet.data.sheets || [])
        .map((sheet) => sheet.properties?.title || "")
        .filter((title) => /^FY\d{4}-\d{2}$/.test(title));
      const rowsByYear = await Promise.all(
        financialYearSheets.map((financialYear) =>
          getSheetValues(sheetId, financialYear),
        ),
      );
      const codeInUse = rowsByYear.flat().some(
        (transaction) =>
          String(transaction.product || "").trim().toLowerCase() ===
          String(oldProductCode).trim().toLowerCase(),
      );
      if (codeInUse) {
        return NextResponse.json(
          {
            error:
              "This product code is used by existing transactions and cannot be changed without rewriting historical records.",
          },
          { status: 409 },
        );
      }
    }
    const normalizedCode = productCode.trim().toLowerCase();
    if (
      products.some(
        (product, index) =>
          index !== productIndex &&
          String(product.productCode || "").trim().toLowerCase() === normalizedCode,
      )
    ) {
      return NextResponse.json({ error: "A product with this code already exists." }, { status: 409 });
    }

    // Get headers to map data correctly
    const headers = await getSheetHeaders(sheetId, sheetName);
    
    // Prepare the updated row data
    const updatedRow = headers.map((header) => {
      if (header === "productCode") return productCode;
      if (header === "productName") return productName;
      if (header === "brokerageRate") return brokerageRate || 0;
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
    const userId = await verifyUserAccess();
    const sheetId = await getSheetIdForUser();
    const sheetName = getProductSheetName();
    const url = new URL(request.url);
    const productCode = url.searchParams.get('productCode');

    if (!productCode) {
      return NextResponse.json({ error: 'Product code is required to identify product to delete' }, { status: 400 });
    }

    // Clear cache
    globalCache.clear(`${CACHE_KEY_PREFIX}${userId}`);

    // Ensure the sheet exists
    await ensureSheet(sheetId, sheetName);

    // Get all products to find the specific one to delete
    const products = await getSheetValues(sheetId, sheetName);
    
    // Find the product by product code
    const productIndex = products.findIndex(p => p.productCode === productCode);
    
    if (productIndex === -1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const financialYearSheets = (spreadsheet.data.sheets || [])
      .map((sheet) => sheet.properties?.title || "")
      .filter((title) => /^FY\d{4}-\d{2}$/.test(title));
    const transactionsByYear = await Promise.all(
      financialYearSheets.map((financialYear) =>
        getSheetValues(sheetId, financialYear),
      ),
    );
    const productNames = new Set(
      [productCode, products[productIndex].productName]
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean),
    );
    const isReferenced = transactionsByYear.flat().some((transaction) =>
      productNames.has(String(transaction.product || "").trim().toLowerCase()),
    );
    if (isReferenced) {
      return NextResponse.json(
        { error: "This product is referenced by existing transactions and cannot be deleted." },
        { status: 409 },
      );
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
