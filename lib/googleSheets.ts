// lib/googleSheets.ts
import { google, sheets_v4 } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export const getGoogleAuth = async (): Promise<sheets_v4.Sheets> => {
  try {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
      console.error("Missing Google credentials:");
      console.error("GOOGLE_CLIENT_EMAIL:", !!clientEmail);
      console.error("GOOGLE_PRIVATE_KEY:", !!privateKey);
      throw new Error("Google credentials not found in environment variables");
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, '\n'),
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