// app/api/transactions/route.ts
import { NextResponse } from "next/server";
import { getGoogleAuth } from "@/lib/googleSheets";

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

export async function GET() {
  try {
    console.log("Fetching transactions from Google Sheets...");

    if (!SPREADSHEET_ID) {
      console.error("GOOGLE_SPREADSHEET_ID environment variable is not set");
      return NextResponse.json({ 
        message: "Spreadsheet ID not configured in environment variables" 
      }, { status: 500 });
    }

    const sheets = await getGoogleAuth();
    console.log("Google Sheets authentication successful");

    // Read data from Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:H", // 8 columns as per your data
    });

    const rows = response.data.values || [];
    console.log(`Found ${rows.length} rows in Google Sheets`);

    // Skip header row and map to transactions, filter out empty rows
    const transactions = rows.slice(1)
      .map((row, index) => {
        const [
          seller, 
          buyer, 
          date, 
          product, 
          quantity, 
          rate, 
          city, 
          remarks 
        ] = row;

        // Check if row has at least some data (not completely empty)
        const hasData = seller || buyer || date || product || quantity || rate || city || remarks;
        
        if (!hasData) {
          return null; // Skip empty rows
        }

        return {
          id: `sheet-${index + 2}`, // Start from row 2 (after header)
          seller: seller || "",
          buyer: buyer || "",
          date: date || "",
          productCode: product || "",
          quantity: Number(quantity) || 0,
          rate: Number(rate) || 0,
          city: city || "",
          state: "",
          remarks: remarks || ""
        };
      })
      .filter(transaction => transaction !== null); // Remove null entries

    console.log("Mapped transactions:", transactions.length);
    return NextResponse.json(transactions);

  } catch (error: any) {
    console.error("API Error details:", error);
    
    return NextResponse.json({ 
      error: "Internal server error",
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Add PUT and DELETE methods for updating and deleting transactions
export async function PUT(request: Request) {
  try {
    const updatedTransaction = await request.json();
    
    if (!SPREADSHEET_ID) {
      return NextResponse.json({ 
        message: "Spreadsheet ID not configured" 
      }, { status: 500 });
    }

    const sheets = await getGoogleAuth();
    
    // Calculate the row index (id is like "sheet-2", so we get the number part)
    const rowIndex = parseInt(updatedTransaction.id.split('-')[1]);
    
    if (isNaN(rowIndex) || rowIndex < 2) {
      return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 });
    }

    // Update the row data - only 8 columns as per your sheet structure
    const updatedRow = [
      updatedTransaction.seller,
      updatedTransaction.buyer,
      updatedTransaction.date,
      updatedTransaction.productCode,
      updatedTransaction.quantity.toString(),
      updatedTransaction.rate.toString(),
      updatedTransaction.city,
      updatedTransaction.remarks || ""
    ];

    console.log(`Updating row ${rowIndex} with data:`, updatedRow);

    // Update the specific row in Google Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Sheet1!A${rowIndex}:H${rowIndex}`, // Only 8 columns
      valueInputOption: "RAW",
      requestBody: {
        values: [updatedRow],
      },
    });

    return NextResponse.json({ message: "Transaction updated successfully" });
    
  } catch (error: any) {
    console.error("Error updating transaction:", error);
    return NextResponse.json({ 
      error: "Failed to update transaction",
      message: error.message,
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
    }

    if (!SPREADSHEET_ID) {
      return NextResponse.json({ 
        message: "Spreadsheet ID not configured" 
      }, { status: 500 });
    }

    const sheets = await getGoogleAuth();
    
    // Calculate the row index
    const rowIndex = parseInt(id.split('-')[1]);
    
    if (isNaN(rowIndex) || rowIndex < 2) {
      return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 });
    }

    console.log(`Deleting row ${rowIndex}`);

    // Delete the entire row instead of just clearing it
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0, // 0 for the first sheet
                dimension: "ROWS",
                startIndex: rowIndex - 1, // Convert to 0-based index
                endIndex: rowIndex, // End index is exclusive
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({ message: "Transaction deleted successfully" });

  } catch (error: any) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json({ 
      error: "Failed to delete transaction",
      message: error.message,
    }, { status: 500 });
  }
}