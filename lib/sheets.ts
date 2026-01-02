import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  credentials: {
    type: "service_account",
    project_id: process.env.GOOGLE_PROJECT_ID || "omkarmarketing",
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

export { sheets };

export interface SheetRow {
  [key: string]: string | number | null;
}

export interface SheetData {
  values: SheetRow[];
}

// Append a single row to a sheet
export async function appendRow(
  sheetId: string,
  sheetName: string,
  row: (string | number)[]
): Promise<void> {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `'${sheetName}'!A:Z`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });
  } catch (error) {
    console.error("Error appending row to Google Sheets:", error);
    throw new Error(
      `Failed to append row: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Get all values from a sheet
export async function getSheetValues(
  sheetId: string,
  sheetName: string
): Promise<SheetRow[]> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${sheetName}'!A:Z`,
    });

    const values = response.data.values || [];
    if (values.length === 0) return [];

    const headers = values[0];
    return values.slice(1).map((row, index) => {
      const obj: SheetRow = {};
      headers.forEach((header, headerIndex) => {
        obj[header] = row[headerIndex] || null;
      });
      // Add the original row index (1-based, including header row)
      (obj as any)._rowIndex = index + 2; // +2 because index is 0-based and we skip header row
      return obj;
    });
  } catch (error) {
    console.error("Error getting sheet values:", error);
    throw new Error(
      `Failed to get sheet values: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Get headers from a sheet
export async function getSheetHeaders(
  sheetId: string,
  sheetName: string
): Promise<string[]> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${sheetName}'!1:1`,
    });

    return response.data.values?.[0] || [];
  } catch (error) {
    console.error("Error getting sheet headers:", error);
    throw new Error(
      `Failed to get headers: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Update a single cell
export async function updateCell(
  sheetId: string,
  sheetName: string,
  cell: string,
  value: string | number
): Promise<void> {
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${sheetName}'!${cell}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[value]],
      },
    });
  } catch (error) {
    console.error("Error updating cell:", error);
    throw new Error(
      `Failed to update cell: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Clear a range
export async function clearRange(
  sheetId: string,
  sheetName: string,
  range: string
): Promise<void> {
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `'${sheetName}'!${range}`,
    });
  } catch (error) {
    console.error("Error clearing range:", error);
    throw new Error(
      `Failed to clear range: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Convert column index to Google Sheets column letter (A, B, ..., Z, AA, AB, ...)
function columnToLetter(columnIndex: number): string {
  if (columnIndex <= 0) return 'Z'; // fallback
  let result = '';
  while (columnIndex > 0) {
    columnIndex--;
    result = String.fromCharCode(65 + (columnIndex % 26)) + result;
    columnIndex = Math.floor(columnIndex / 26);
  }
  return result;
}

// Update a row in a sheet by row index
export async function updateRow(
  sheetId: string,
  sheetName: string,
  rowIndex: number, // 1-based index
  row: (string | number)[]
): Promise<void> {
  try {
    const lastColumn = columnToLetter(row.length);
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${sheetName}'!A${rowIndex}:${lastColumn}${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });
  } catch (error) {
    console.error("Error updating row in Google Sheets:", error);
    throw new Error(
      `Failed to update row: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Delete a row in a sheet by row index
export async function deleteRow(
  sheetId: string,
  sheetName: string,
  rowIndex: number // 1-based index
): Promise<void> {
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: await ensureSheet(sheetId, sheetName),
                dimension: "ROWS",
                startIndex: rowIndex - 1, // 0-based index
                endIndex: rowIndex, // exclusive end
              },
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error("Error deleting row from Google Sheets:", error);
    throw new Error(
      `Failed to delete row: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Create or get a sheet in a spreadsheet
export async function ensureSheet(
  sheetId: string,
  sheetName: string
): Promise<number> {
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    const sheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === sheetName
    );
    if (sheet) {
      return sheet.properties?.sheetId || 0;
    }

    // Create new sheet
    const addSheetResponse = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    });

    return (
      addSheetResponse.data.replies?.[0]?.addSheet?.properties?.sheetId || 0
    );
  } catch (error) {
    console.error("Error ensuring sheet:", error);
    throw new Error(
      `Failed to ensure sheet: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
