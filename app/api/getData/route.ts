import { NextResponse } from "next/server";
import { getGoogleAuth } from "@/lib/googleSheets";

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

export async function GET() {
  try {
    if (!SPREADSHEET_ID) {
      return NextResponse.json({ message: "Spreadsheet ID not configured" }, { status: 500 });
    }

    const sheets = await getGoogleAuth();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A1:I",
    });

    return NextResponse.json(response.data.values || []);
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}