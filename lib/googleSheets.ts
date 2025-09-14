// lib/googleSheets.ts
import { google, sheets_v4 } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export const getGoogleAuth = async (): Promise<sheets_v4.Sheets> => {
  try {
    // Use environment variables instead of JSON file
    const clientEmail = process.env.CLIENT_EMAIL;
    const privateKey = process.env.PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
      throw new Error("Google credentials not found in environment variables. Please set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY");
    }

    console.log("Using Google service account:", clientEmail);

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, '\n'), // Handle newlines in private key
      scopes: SCOPES,
    });

    await auth.authorize();
    
    return google.sheets({ 
      version: "v4", 
      auth 
    });
  } catch (error) {
    console.error("Error in Google auth setup:", error);
    throw error;
  }
};

// app/api/addData/route.ts
import { NextResponse } from "next/server";
import { getGoogleAuth } from "@/lib/googleSheets";

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

export async function POST(req: Request) {
  try {
    console.log("Environment check - SPREADSHEET_ID exists:", !!SPREADSHEET_ID);
    
    const body = await req.json();
    console.log("Received request body:", body);

    // Match the column names from your Google Sheet
    const { 
      Seller: seller, 
      Buyer: buyer, 
      Date: date, 
      Product: product, 
      Quantity: quantity, 
      Rate: rate, 
      City: city, 
      "Brokerage Rate": brokerageRate,
      Remarks: remarks 
    } = body;

    // Validate required fields
    if (!buyer || !seller || !date || !product || !quantity || !rate) {
      return NextResponse.json({ 
        message: "Missing required fields",
        received: body,
        required: ["Buyer", "Seller", "Date", "Product", "Quantity", "Rate"]
      }, { status: 400 });
    }

    if (!SPREADSHEET_ID) {
      console.error("GOOGLE_SPREADSHEET_ID environment variable is not set");
      return NextResponse.json({ 
        message: "Spreadsheet ID not configured in environment variables" 
      }, { status: 500 });
    }

    console.log("Attempting to authenticate with Google Sheets...");
    const sheets = await getGoogleAuth();
    console.log("Google Sheets authentication successful");

    // Calculate total value if needed
    const totalValue = (parseFloat(quantity) || 0) * (parseFloat(rate) || 0);
    const brokerageAmount = totalValue * (parseFloat(brokerageRate) || 0) / 100;

    // Match the order of columns in your Google Sheet
    const values = [
      seller || "", 
      buyer || "", 
      date || "", 
      product || "", 
      parseFloat(quantity) || 0, 
      parseFloat(rate) || 0, 
      city || "", 
      parseFloat(brokerageRate) || 0, 
      remarks || "",
      totalValue, // Add calculated total if your sheet has this column
      brokerageAmount // Add calculated brokerage amount if your sheet has this column
    ];

    console.log("Appending values to Google Sheet:", values);

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:K", // Adjust range based on your columns
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [values],
      },
    });

    console.log("Google Sheets response:", response.status, response.statusText);
    
    return NextResponse.json({ 
      message: "Data added successfully to Google Sheets!",
      details: {
        updatedRange: response.data.updates?.updatedRange,
        updatedRows: response.data.updates?.updatedRows,
        updatedColumns: response.data.updates?.updatedColumns,
        updatedCells: response.data.updates?.updatedCells
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error("API Error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    // Return more specific error messages
    let errorMessage = "Failed to save to Google Sheets";
    
    if (error.message?.includes("credentials")) {
      errorMessage = "Google authentication failed. Please check environment variables.";
    } else if (error.message?.includes("PERMISSION_DENIED")) {
      errorMessage = "Permission denied. Please check if the service account has access to the spreadsheet.";
    } else if (error.message?.includes("SPREADSHEET_NOT_FOUND")) {
      errorMessage = "Spreadsheet not found. Please check the GOOGLE_SPREADSHEET_ID.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({ 
      error: "Internal server error",
      message: errorMessage,
      code: error.code || "UNKNOWN_ERROR",
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}









// // lib/googleSheets.ts
// import { google, sheets_v4 } from "googleapis";
// import fs from "fs";
// import path from "path";

// const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

// export const getGoogleAuth = async (): Promise<sheets_v4.Sheets> => {
//   try {
//     // Try multiple possible paths for credentials
//     const possiblePaths = [
//       path.join(process.cwd(), "lib", "google-credentials.json"),
//       path.join(process.cwd(), "google-credentials.json"),
//       path.join(process.cwd(), "credentials.json"),
//     ];

//     let credentialsPath: string | null = null;
//     for (const p of possiblePaths) {
//       if (fs.existsSync(p)) {
//         credentialsPath = p;
//         break;
//       }
//     }

//     if (!credentialsPath) {
//       throw new Error("Google credentials file not found. Checked paths: " + possiblePaths.join(", "));
//     }

//     console.log("Using credentials at:", credentialsPath);
    
//     const raw = fs.readFileSync(credentialsPath, "utf8");
//     const credentials = JSON.parse(raw);

//     // Validate required fields
//     if (!credentials.client_email || !credentials.private_key) {
//       throw new Error("Invalid credentials: missing client_email or private_key");
//     }

//     const auth = new google.auth.JWT({
//       email: credentials.client_email,
//       key: credentials.private_key.replace(/\\n/g, '\n'), // Handle newlines in private key
//       scopes: SCOPES,
//     });

//     await auth.authorize();
    
//     return google.sheets({ 
//       version: "v4", 
//       auth 
//     });
//   } catch (error) {
//     console.error("Error in Google auth setup:", error);
//     throw error;
//   }
// };