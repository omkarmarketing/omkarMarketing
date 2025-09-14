// app/api/addData/route.ts
import { NextResponse } from "next/server";
import { getGoogleAuth } from "@/lib/googleSheets";

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

export async function POST(req: Request) {
  try {
    console.log("Environment SPREADSHEET_ID:", SPREADSHEET_ID);
    
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

    if (!buyer || !seller || !date || !product || !quantity || !rate) {
      return NextResponse.json({ 
        message: "Missing required fields",
        received: body 
      }, { status: 400 });
    }

    if (!SPREADSHEET_ID) {
      return NextResponse.json({ 
        message: "Spreadsheet ID not configured in environment variables" 
      }, { status: 500 });
    }

    console.log("Attempting to authenticate with Google Sheets...");
    const sheets = await getGoogleAuth();
    console.log("Google Sheets authentication successful");

    // Match the order of columns in your Google Sheet
    const values = [
      seller, 
      buyer, 
      date, 
      product, 
      quantity, 
      rate, 
      city || "", 
      brokerageRate || "", 
      remarks || "" 
    ];

    console.log("Appending values:", values);

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:I", // Adjust if your sheet has a different name
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [values],
      },
    });

    console.log("Google Sheets response:", response.status, response.statusText);
    
    return NextResponse.json({ 
      message: "Data added successfully!",
      details: response.data
    }, { status: 201 });

  } catch (error: any) {
    console.error("API Error details:", error);
    
    return NextResponse.json({ 
      error: "Internal server error",
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}






// import { NextResponse } from "next/server";
// import { getGoogleAuth } from "@/lib/googleSheets";

// const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

// export async function POST(req: Request) {
//   try {
//     console.log("Environment SPREADSHEET_ID:", SPREADSHEET_ID);
    
//     const body = await req.json();
//     console.log("Received request body:", body);

//     const { buyer, seller, date, product, quantity, rate, city, state, brokerageRate } = body;

//     if (!buyer || !seller || !date || !product || !quantity || !rate) {
//       return NextResponse.json({ 
//         message: "Missing required fields",
//         received: body 
//       }, { status: 400 });
//     }

//     if (!SPREADSHEET_ID) {
//       return NextResponse.json({ 
//         message: "Spreadsheet ID not configured in environment variables" 
//       }, { status: 500 });
//     }

//     console.log("Attempting to authenticate with Google Sheets...");
//     const sheets = await getGoogleAuth();
//     console.log("Google Sheets authentication successful");

//     const values = [
//       buyer, 
//       seller, 
//       date, 
//       product, 
//       quantity, 
//       rate, 
//       city || "", 
//       state || "", 
//       brokerageRate || ""
//     ];

//     console.log("Appending values:", values);

//     const response = await sheets.spreadsheets.values.append({
//       spreadsheetId: SPREADSHEET_ID,
//       range: "Sheet1!A:I",
//       valueInputOption: "USER_ENTERED",
//       requestBody: {
//         values: [values],
//       },
//     });

//     console.log("Google Sheets response:", response.status, response.statusText);
    
//     return NextResponse.json({ 
//       message: "Data added successfully!",
//       details: response.data
//     }, { status: 201 });

//   } catch (error: any) {
//     console.error("API Error details:", error);
    
//     return NextResponse.json({ 
//       error: "Internal server error",
//       message: error.message,
//       stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
//     }, { status: 500 });
//   }
// }