import { type NextRequest, NextResponse } from "next/server";
import {
  appendRow,
  getSheetValues,
  getSheetHeaders,
  ensureSheet,
  sheets,
} from "@/lib/sheets";
import { verifyUserAccess, getSheetIdForUser } from "@/lib/auth";
import { getCompanySheetName } from "@/lib/sheets-helper";
import { z } from "zod";

const companySchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyCity: z.string().min(1, "City is required"),
});

export async function GET() {
  try {
    await verifyUserAccess();
    const sheetId = await getSheetIdForUser();
    const sheetName = getCompanySheetName();

    await ensureSheet(sheetId, sheetName);
    const companies = await getSheetValues(sheetId, sheetName);
    return NextResponse.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    // Return empty array if sheet not found or other errors
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyUserAccess();
    const sheetId = await getSheetIdForUser();
    const sheetName = getCompanySheetName();

    await ensureSheet(sheetId, sheetName);
    const body = await request.json();
    const { companyName, companyCity } = companySchema.parse(body);

    // Get headers to ensure consistent ordering
    let headers = await getSheetHeaders(sheetId, sheetName);
    if (headers.length === 0) {
      headers = ["companyName", "companyCity"];
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
      if (header === "companyName") return companyName;
      if (header === "companyCity") return companyCity;
      return "";
    });

    await appendRow(sheetId, sheetName, row);
    return NextResponse.json({ success: true, companyName, companyCity });
  } catch (error) {
    console.error("Error adding company:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to add company",
      },
      { status: 500 }
    );
  }
}

// PUT request to update a company by looking up the existing company
export async function PUT(request: NextRequest) {
  try {
    await verifyUserAccess();
    const sheetId = await getSheetIdForUser();
    const sheetName = getCompanySheetName();
    const body = await request.json();
    
    const { oldCompanyName, data } = body; // Use oldCompanyName to identify which company to update
    const { companyName, companyCity } = companySchema.parse(data);

    if (!oldCompanyName) {
      return NextResponse.json({ error: 'Old company name is required to identify company to update' }, { status: 400 });
    }

    // Ensure the sheet exists
    await ensureSheet(sheetId, sheetName);

    // Get all companies to find the specific one to update
    const companies = await getSheetValues(sheetId, sheetName);
    
    // Find the company by its old company name
    const companyIndex = companies.findIndex(c => c.companyName === oldCompanyName);
    
    if (companyIndex === -1) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Get headers to map data correctly
    const headers = await getSheetHeaders(sheetId, sheetName);
    
    // Prepare the updated row data
    const updatedRow = headers.map((header) => {
      if (header === "companyName") return companyName;
      if (header === "companyCity") return companyCity;
      return companies[companyIndex][header] || ""; // Preserve other fields if any
    });

    // Update the specific row (companyIndex + 2 because row 1 is headers)
    const range = `'${sheetName}'!${companyIndex + 2}:${companyIndex + 2}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [updatedRow],
      },
    });

    return NextResponse.json({ success: true, companyName, companyCity });
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update company",
      },
      { status: 500 }
    );
  }
}

// DELETE request to delete a company by company name
export async function DELETE(request: NextRequest) {
  try {
    await verifyUserAccess();
    const sheetId = await getSheetIdForUser();
    const sheetName = getCompanySheetName();
    const url = new URL(request.url);
    const companyName = url.searchParams.get('companyName');

    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required to identify company to delete' }, { status: 400 });
    }

    // Ensure the sheet exists
    await ensureSheet(sheetId, sheetName);

    // Get all companies to find the specific one to delete
    const companies = await getSheetValues(sheetId, sheetName);
    
    // Find the company by company name
    const companyIndex = companies.findIndex(c => c.companyName === companyName);
    
    if (companyIndex === -1) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Delete the specific row (companyIndex + 2 because row 1 is headers)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: await getSheetIdFromName(sheetId, sheetName),
                dimension: 'ROWS',
                startIndex: companyIndex + 1, // 0-based index
                endIndex: companyIndex + 2,   // exclusive end
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete company",
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
