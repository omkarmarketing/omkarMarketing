// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuth } from '@/lib/googleSheets';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const PRODUCTS_SHEET = "Products";

async function ensureSheetAndHeaders(sheets: any) {
  // Check if Products sheet exists, if not create it
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

  // Ensure headers in row 1
  const headersResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${PRODUCTS_SHEET}!A1:D1`,
  });
  const headers = headersResponse.data.values?.[0];
  if (!headers || headers.length < 4 || 
      headers[0] !== "Product Code" || headers[1] !== "Product Name" || 
      headers[2] !== "Rate" || headers[3] !== "Company Name") {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PRODUCTS_SHEET}!A1:D1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["Product Code", "Product Name", "Rate", "Company Name"]] },
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
    const { code, name, rate, companyName } = body;

    // Validate required fields
    if (!code || !name) {
      return NextResponse.json(
        { error: 'Product code and name are required' },
        { status: 400 }
      );
    }

    const sheets = await getGoogleAuth();
    await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    await ensureSheetAndHeaders(sheets);

    // Prepare the data for Google Sheets
    const values = [[code, name, rate, companyName]];

    // Append data to the Products sheet
    const response = await sheets.spreadsheets.values.append({
      auth: (sheets as any).auth,
      spreadsheetId: SPREADSHEET_ID,
      range: `${PRODUCTS_SHEET}!A2:D`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: values,
      },
    });

    return NextResponse.json(
      { message: 'Product added successfully', data: response.data },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error adding product:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add product' },
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
    await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    await ensureSheetAndHeaders(sheets);

    // Read data from Products sheet
    const response = await sheets.spreadsheets.values.get({
      auth: (sheets as any).auth,
      spreadsheetId: SPREADSHEET_ID,
      range: `${PRODUCTS_SHEET}!A2:D`,
    });

    const products = response.data.values?.map((row: any[]) => ({
      code: row[0] || "",
      name: row[1] || "",
      rate: row[2] ? Number(row[2]) : 0,
      companyName: row[3] || "",
    }));

    return NextResponse.json(products || []);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}