import { NextResponse } from "next/server";
import { getSheetValues } from "@/lib/sheets";
import { verifyUserAccess, getSheetIdForUser } from "@/lib/auth";
import {
  getCurrentFinancialYearSheetName,
  getProductSheetName,
} from "@/lib/sheets-helper";

export async function GET() {
  try {
    await verifyUserAccess();
    const sheetId = await getSheetIdForUser();
    const sheetName = getCurrentFinancialYearSheetName();

    const transactions = await getSheetValues(sheetId, sheetName);

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
    const mappedTransactions = transactions.map((row: any) => {
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

    // Convert to CSV format
    if (mappedTransactions.length === 0) {
      return NextResponse.json(
        { error: "No transactions to export" },
        { status: 400 }
      );
    }

    // Define the desired column order
    const desiredHeaders = [
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

    const csvContent = [
      desiredHeaders.join(","),
      ...mappedTransactions.map((row: any) =>
        desiredHeaders.map((h) => `"${row[h] || ""}"`).join(",")
      ),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="transactions.csv"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to export transactions",
      },
      { status: 500 }
    );
  }
}
