// app/api/companies/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuth } from "@/lib/googleSheets";

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const COMPANIES_SHEET = "Companies";

async function ensureSheetAndHeaders(sheets: any) {
  // ensure spreadsheetId valid etc. similar to your POST
  // Check sheet exists, if not create, and ensure headers exist
  const sheetInfo = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheetExists = sheetInfo.data.sheets?.some(
    (sheet: any) => sheet.properties?.title === COMPANIES_SHEET
  );

  if (!sheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: COMPANIES_SHEET,
              },
            },
          },
        ],
      },
    });
  }

  // Ensure headers in row 1
  const headersResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${COMPANIES_SHEET}!A1:B1`,
  });
  const headers = headersResponse.data.values?.[0];
  if (!headers || headers.length < 2 || headers[0] !== "Name" || headers[1] !== "City") {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${COMPANIES_SHEET}!A1:B1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["Name", "City"]] },
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!SPREADSHEET_ID) {
      return NextResponse.json(
        { error: "GOOGLE_SPREADSHEET_ID environment variable not set" },
        { status: 500 }
      );
    }
    const sheets = await getGoogleAuth();

    await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    await ensureSheetAndHeaders(sheets);

    const valuesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${COMPANIES_SHEET}!A2:B`, // skip header row
    });

    const rows = valuesResponse.data.values || [];
    // Map rows to objects, adding a row index to identify for edit/delete
    const data = rows.map((row: any[], idx: number) => ({
      id: idx + 2, // because A2 is first data row, so row 2 is first record
      name: row[0] || "",
      city: row[1] || "",
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Error fetching companies:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!SPREADSHEET_ID) {
      return NextResponse.json(
        { error: "GOOGLE_SPREADSHEET_ID not set" },
        { status: 500 }
      );
    }
    const body = await request.json();
    const { name, city } = body;
    if (!name || !city) {
      return NextResponse.json(
        { error: "Missing required fields: name and city" },
        { status: 400 }
      );
    }
    const sheets = await getGoogleAuth();

    await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    await ensureSheetAndHeaders(sheets);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${COMPANIES_SHEET}!A:B`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[name, city]],
      },
    });

    return NextResponse.json({
      success: true,
      message: "Company added successfully",
      data: { name, city },
    });
  } catch (err: any) {
    console.error("Error adding company:", err);
    return NextResponse.json(
      { error: err.message || "Failed to add company" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!SPREADSHEET_ID) {
      return NextResponse.json(
        { error: "GOOGLE_SPREADSHEET_ID not set" },
        { status: 500 }
      );
    }
    const body = await request.json();
    const { id, name, city } = body;
    if (!id || !name || !city) {
      return NextResponse.json(
        { error: "Missing required fields: id, name, city" },
        { status: 400 }
      );
    }

    const sheets = await getGoogleAuth();
    await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    await ensureSheetAndHeaders(sheets);

    // Write the new values at the specific row
    // id corresponds to row number in sheet
    const range = `${COMPANIES_SHEET}!A${id}:B${id}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[name, city]],
      },
    });

    return NextResponse.json({
      success: true,
      message: "Company updated successfully",
      data: { id, name, city },
    });
  } catch (err: any) {
    console.error("Error updating company:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update company" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!SPREADSHEET_ID) {
      return NextResponse.json(
        { error: "GOOGLE_SPREADSHEET_ID not set" },
        { status: 500 }
      );
    }
    const body = await request.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 }
      );
    }
    const sheets = await getGoogleAuth();
    await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    await ensureSheetAndHeaders(sheets);

    // Note: Google Sheets doesn't support deleting specific rows as straightforwardly.
    // But we can use batchUpdate to delete rows.
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: (await sheets.spreadsheets.get({
                  spreadsheetId: SPREADSHEET_ID,
                })).data.sheets?.find((s: any) => s.properties.title === COMPANIES_SHEET)
                  ?.properties?.sheetId,
                dimension: "ROWS",
                startIndex: id - 1, // zero‑based, inclusive
                endIndex: id,       // exclusive
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      message: `Company in row ${id} deleted successfully`,
      data: { id },
    });
  } catch (err: any) {
    console.error("Error deleting company:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete company" },
      { status: 500 }
    );
  }
}
