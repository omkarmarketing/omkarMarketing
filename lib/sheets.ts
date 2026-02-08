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
  row: (string | number)[],
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
      }`,
    );
  }
}

// Insert a row at the correct chronological position based on date
export async function insertRowChronologically(
  sheetId: string,
  sheetName: string,
  row: (string | number)[],
  dateIndex: number, // Index of the date column in the row
  newDate: Date, // The date of the new transaction
): Promise<void> {
  try {
    // First, get all existing data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${sheetName}'!A:Z`,
    });

    const values = response.data.values || [];
    if (values.length === 0) {
      // If sheet is empty, just append
      await appendRow(sheetId, sheetName, row);
      return;
    }

    const headers = values[0];
    const dataRows = values.slice(1);
    
    // Find the correct insertion position
    let insertPosition = dataRows.length; // Default to end
    
    for (let i = 0; i < dataRows.length; i++) {
      const rowData = dataRows[i];
      const existingDateStr = rowData[dateIndex];
      
      if (existingDateStr) {
        // Parse the existing date (assuming format dd-mm-yy)
        const [day, month, year] = existingDateStr.split("-").map(Number);
        const fullYear = year < 50 ? 2000 + year : 1900 + year; // Handle 2-digit years
        const existingDate = new Date(fullYear, month - 1, day);
        
        // If new date is earlier than existing date, insert here
        if (newDate < existingDate) {
          insertPosition = i;
          break;
        }
      }
    }
    
    // Insert at the correct position (1-based indexing, +1 for header row)
    const insertRowIndex = insertPosition + 2; // +2 because 1-based and we have header row
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${sheetName}'!A${insertRowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });
    
  } catch (error) {
    console.error("Error inserting row chronologically:", error);
    throw new Error(
      `Failed to insert row chronologically: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

// Get all values from a sheet
export async function getSheetValues(
  sheetId: string,
  sheetName: string,
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
      }`,
    );
  }
}

// Get headers from a sheet
export async function getSheetHeaders(
  sheetId: string,
  sheetName: string,
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
      }`,
    );
  }
}

// Update a single cell
export async function updateCell(
  sheetId: string,
  sheetName: string,
  cell: string,
  value: string | number,
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
      }`,
    );
  }
}

// Clear a range
export async function clearRange(
  sheetId: string,
  sheetName: string,
  range: string,
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
      }`,
    );
  }
}

// Convert column index to Google Sheets column letter (A, B, ..., Z, AA, AB, ...)
function columnToLetter(columnIndex: number): string {
  if (columnIndex <= 0) return "Z"; // fallback
  let result = "";
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
  row: (string | number)[],
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
      }`,
    );
  }
}

// Delete a row in a sheet by row index
export async function deleteRow(
  sheetId: string,
  sheetName: string,
  rowIndex: number, // 1-based index
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
      }`,
    );
  }
}

// Create or get a sheet in a spreadsheet
export async function ensureSheet(
  sheetId: string,
  sheetName: string,
): Promise<number> {
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    const sheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === sheetName,
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
      }`,
    );
  }
}

// Get next sequential invoice number
export async function getNextInvoiceNumber(sheetId: string): Promise<number> {
  const invoiceTrackerSheet = "InvoiceTracker";

  try {
    // Ensure tracker sheet exists
    await ensureSheet(sheetId, invoiceTrackerSheet);

    // Try to get existing counter
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${invoiceTrackerSheet}'!A2`,
    });

    const currentValue = response.data.values?.[0]?.[0];
    const currentNumber = parseInt(currentValue as string) || 1548; // Start from 1549 if empty
    const nextNumber = currentNumber + 1;

    // Update the counter
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${invoiceTrackerSheet}'!A2`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[nextNumber]],
      },
    });

    return nextNumber;
  } catch (error) {
    console.error("Error managing invoice number:", error);
    // Fallback to timestamp-based if sheet operations fail
    return Math.floor(Date.now() / 1000);
  }
}

// Helper function to format date as dd-mm-yy
export function formatDateToSheet(date: string): string {
  const dateObj = new Date(date);
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = String(dateObj.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}
