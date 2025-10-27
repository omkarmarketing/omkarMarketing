import { NextResponse } from "next/server";
import { getGoogleAuth } from "@/lib/googleSheets";

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

// GET endpoint to fetch invoices data
export async function GET(req: Request) {
  try {
    console.log("Fetching invoices data...");
    
    const { searchParams } = new URL(req.url);
    const company = searchParams.get('company');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const brokerageRate = searchParams.get('brokerageRate');

    console.log("Query parameters:", { company, startDate, endDate, brokerageRate });

    if (!SPREADSHEET_ID) {
      console.error("GOOGLE_SPREADSHEET_ID environment variable is not set");
      return NextResponse.json({ 
        message: "Spreadsheet ID not configured in environment variables" 
      }, { status: 500 });
    }

    console.log("Authenticating with Google Sheets...");
    const sheets = await getGoogleAuth();
    console.log("Google Sheets authentication successful");

    // Fetch data from Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:H", // 8 columns as per your structure
    });

    const rows = response.data.values;
    console.log(`Fetched ${rows ? rows.length - 1 : 0} rows from sheet`);

    if (!rows || rows.length <= 1) {
      return NextResponse.json({ 
        message: "No data found in spreadsheet",
        transactions: [],
        totals: {
          totalTransactions: 0,
          totalQuantity: 0,
          totalBrokerage: 0
        }
      });
    }

    // Process rows into transactions with unique IDs
    const transactions = rows.slice(1).map((row: any[], index: number) => {
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

      const qty = parseFloat(quantity) || 0;
      const rt = parseFloat(rate) || 0;
      
      // Create unique ID using multiple fields to avoid duplicates
      const uniqueId = `${date}-${buyer}-${seller}-${product}-${qty}-${rt}-${index}`;

      return {
        id: uniqueId,
        date: date,
        buyer: buyer || "",
        seller: seller || "",
        productCode: product || "",
        quantity: qty,
        rate: rt,
        city: city || "",
        remarks: remarks || ""
      };
    }).filter(t => t.date && (t.buyer || t.seller)); // Filter out incomplete rows

    // Filter transactions based on query parameters
    let filteredTransactions = transactions;

    if (company) {
      filteredTransactions = filteredTransactions.filter((t: any) => 
        t.buyer?.toLowerCase().includes(company.toLowerCase()) || 
        t.seller?.toLowerCase().includes(company.toLowerCase())
      );
    }

    if (startDate) {
      const start = new Date(startDate);
      filteredTransactions = filteredTransactions.filter((t: any) => {
        const transactionDate = new Date(t.date);
        return transactionDate >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include entire end date
      filteredTransactions = filteredTransactions.filter((t: any) => {
        const transactionDate = new Date(t.date);
        return transactionDate <= end;
      });
    }

    console.log(`Filtered to ${filteredTransactions.length} transactions`);

    // Calculate totals with fixed brokerage rate per unit
    const customBrokerageRate = brokerageRate ? parseFloat(brokerageRate) : 10; // Default to ₹10 per unit
    
    const totalQuantity = filteredTransactions.reduce((sum: number, t: any) => sum + t.quantity, 0);
    const totalBrokerage = totalQuantity * customBrokerageRate;

    const totals = {
      totalTransactions: filteredTransactions.length,
      totalQuantity: totalQuantity,
      totalBrokerage: totalBrokerage
    };

    return NextResponse.json({
      message: "Data fetched successfully",
      transactions: filteredTransactions,
      totals,
      filteredCount: filteredTransactions.length,
      totalCount: transactions.length
    });

  } catch (error: any) {
    console.error("API Error details:", error);
    
    return NextResponse.json({ 
      error: "Internal server error",
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// POST endpoint to generate invoice data
export async function POST(req: Request) {
  try {
    console.log("Generating invoice data...");
    
    const body = await req.json();
    console.log("Received request body:", body);

    const { 
      company, 
      startDate, 
      endDate, 
      brokerageRate 
    } = body;

    if (!SPREADSHEET_ID) {
      console.error("GOOGLE_SPREADSHEET_ID environment variable is not set");
      return NextResponse.json({ 
        message: "Spreadsheet ID not configured in environment variables" 
      }, { status: 500 });
    }

    console.log("Authenticating with Google Sheets...");
    const sheets = await getGoogleAuth();
    console.log("Google Sheets authentication successful");

    // Fetch data from Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:H",
    });

    const rows = response.data.values;

    if (!rows || rows.length <= 1) {
      return NextResponse.json({ 
        message: "No data found in spreadsheet",
        invoiceData: null
      });
    }

    // Process data
    const transactions = rows.slice(1).map((row: any[], index: number) => {
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

      const qty = parseFloat(quantity) || 0;
      const rt = parseFloat(rate) || 0;
      
      // Create unique ID using multiple fields
      const uniqueId = `${date}-${buyer}-${seller}-${product}-${qty}-${rt}-${index}`;

      return {
        id: uniqueId,
        date: date,
        buyer: buyer || "",
        seller: seller || "",
        productCode: product || "",
        quantity: qty,
        rate: rt,
        city: city || "",
        remarks: remarks || ""
      };
    }).filter(t => t.date && (t.buyer || t.seller));

    // Filter transactions
    let filteredTransactions = transactions;

    if (company) {
      filteredTransactions = filteredTransactions.filter((t: any) => 
        t.buyer?.toLowerCase().includes(company.toLowerCase()) || 
        t.seller?.toLowerCase().includes(company.toLowerCase())
      );
    }

    if (startDate) {
      const start = new Date(startDate);
      filteredTransactions = filteredTransactions.filter((t: any) => {
        const transactionDate = new Date(t.date);
        return transactionDate >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filteredTransactions = filteredTransactions.filter((t: any) => {
        const transactionDate = new Date(t.date);
        return transactionDate <= end;
      });
    }

    // Calculate totals with fixed brokerage rate per unit
    const customBrokerageRate = brokerageRate ? parseFloat(brokerageRate) : 10;
    
    const totalQuantity = filteredTransactions.reduce((sum: number, t: any) => sum + t.quantity, 0);
    const totalBrokerage = totalQuantity * customBrokerageRate;

    // Generate invoice number
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const invoiceData = {
      partyName: company || "All Companies",
      startDate: startDate || "01/04/2024",
      endDate: endDate || new Date().toLocaleDateString('en-IN'),
      transactions: filteredTransactions,
      totalQuantity: totalQuantity,
      totalBrokerage: totalBrokerage,
      brokerageRate: customBrokerageRate,
      invoiceNumber: invoiceNumber,
      invoiceDate: new Date().toLocaleDateString('en-IN'),
    };

    return NextResponse.json({
      message: "Invoice data generated successfully",
      invoiceData,
      success: true
    });

  } catch (error: any) {
    console.error("API Error details:", error);
    
    return NextResponse.json({ 
      error: "Internal server error",
      message: error.message,
      success: false,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}