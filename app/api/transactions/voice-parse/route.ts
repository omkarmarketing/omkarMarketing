import { NextRequest, NextResponse } from "next/server";
import { getSheetValues } from "@/lib/sheets";
import { verifyUserAccess, getSheetIdForUser, isClerkConfigured } from "@/lib/auth";
import { getCompanySheetName, getProductSheetName } from "@/lib/sheets-helper";
import { globalCache } from "@/lib/cache";
import { z } from "zod";

export const maxDuration = 30;

const requestSchema = z.object({
  text: z.string().trim().min(2, "Transcript or text is required"),
  apiKey: z.string().trim().optional(),
  companies: z.array(z.any()).optional(),
  products: z.array(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsedBody = requestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message || "Invalid input text." },
        { status: 400 },
      );
    }

    const clientHeaderKey = req.headers.get("x-gemini-api-key");
    const apiKey =
      process.env.GEMINI_API_KEY ||
      parsedBody.data.apiKey ||
      clientHeaderKey;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "No Gemini API key provided. Please enter your API key in the Voice Dictation settings or configure GEMINI_API_KEY.",
        },
        { status: 400 },
      );
    }

    const transcript = parsedBody.data.text;

    // Use companies and products passed from client if available, else fetch from sheets
    let companies: any[] = parsedBody.data.companies || [];
    let products: any[] = parsedBody.data.products || [];

    if (companies.length === 0 && isClerkConfigured()) {
      try {
        const email = await verifyUserAccess();
        const sheetId = await getSheetIdForUser();

        const compCacheKey = `companies_${email}`;
        companies = globalCache.get<any[]>(compCacheKey) || [];
        if (companies.length === 0) {
          companies = await getSheetValues(sheetId, getCompanySheetName());
          globalCache.set(compCacheKey, companies, 10 * 60 * 1000);
        }
      } catch (err) {
        console.warn("Could not fetch companies from sheets:", err);
      }
    }

    if (products.length === 0 && isClerkConfigured()) {
      try {
        const email = await verifyUserAccess();
        const sheetId = await getSheetIdForUser();

        const prodCacheKey = `products_${email}`;
        products = globalCache.get<any[]>(prodCacheKey) || [];
        if (products.length === 0) {
          products = await getSheetValues(sheetId, getProductSheetName());
          globalCache.set(prodCacheKey, products, 10 * 60 * 1000);
        }
      } catch (err) {
        console.warn("Could not fetch products from sheets:", err);
      }
    }

    const companyList = companies.map((c) => ({
      name: String(c.companyName || c["Company Name"] || "").trim(),
      city: String(c.companyCity || c["City"] || "").trim(),
    })).filter((c) => c.name);

    const productList = products.map((p) => ({
      code: String(p.productCode || p["Product Code"] || "").trim(),
      name: String(p.productName || p["Product Name"] || "").trim(),
      rate: Number(p.brokerageRate || p["Brokerage Rate"] || 0),
    })).filter((p) => p.code || p.name);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const systemPrompt = `You are an expert commodity brokerage transaction extractor for Omkar Marketing (an agricultural brokerage firm in India).
The user will speak or type one or more trade transactions in English, Gujarati, Hindi, or Hinglish.

Your job is to parse every transaction accurately and match spoken entity names against the provided Company Master and Product Master lists.

TODAY'S DATE: ${todayStr}

COMPANY MASTER (Canonical list of known companies and their cities):
${JSON.stringify(companyList)}

PRODUCT MASTER (Canonical list of known products and default brokerage rates):
${JSON.stringify(productList)}

LANGUAGE VOCABULARY & SLANG GUIDELINES:
- Trade terms:
  - "vechyu" / "vechi" / "sold" / "bheja" / "diya" / "seller" -> indicates the SELLER party
  - "kharidyu" / "lidhu" / "bought" / "liya" / "buyer" -> indicates the BUYER party
  - "sauda" / "deal" / "lot" -> transaction
  - "guni" / "bags" / "bori" / "kattas" / "ton" / "qtl" -> quantity (extract as pure number of bags/units)
  - "bhav" / "rate" / "price" / "rupiya" -> price per unit
  - "other side brokerage" / "brokerage" in remarks -> keep in remarks
- Commodities:
  - "Jeera" / "Jira" -> Cumin
  - "Kapas" / "Rui" -> Cotton
  - "Singdana" / "Magfali" / "Groundnut" -> Groundnut
  - "Ghau" / "Gehu" -> Wheat
  - "Chana" -> Chickpeas / Gram
  - "Tal" / "Til" -> Sesame
  - "Dhana" / "Dhaniya" -> Coriander
  - "Divela" / "Arandi" -> Castor
  - "Rai" / "Sarson" -> Mustard
- Dates:
  - "aaj" / "today" -> ${todayStr}
  - "kal" / "yesterday" -> yesterday's date
  - Explicit dates (e.g. "10th Nov", "5/11", "12-11-2024") -> convert to YYYY-MM-DD.

MATCHING RULES:
1. ALWAYS prioritize matching buyer and seller to a known company in COMPANY MASTER. If there's an exact or close match, use the exact canonical name and city from the master and set confidence="exact" or "fuzzy". If completely unknown, use the spoken name and confidence="unmatched".
2. Match product to PRODUCT MASTER name or code. If matched, use the canonical product name/code and set confidence="exact" or "fuzzy".
3. Quantity must be a positive integer number.
4. Price must be a positive number.
5. If the input contains multiple deals (e.g. "Deal 1: ... Deal 2: ..."), extract each as a separate transaction in the array.

OUTPUT FORMAT:
Return a JSON object conforming strictly to this structure:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "sellerCompanyName": "Exact company name from master or spoken name",
      "sellerCompanyCity": "Exact city from master or empty",
      "sellerConfidence": "exact" | "fuzzy" | "unmatched",
      "buyerCompanyName": "Exact company name from master or spoken name",
      "buyerCompanyCity": "Exact city from master or empty",
      "buyerConfidence": "exact" | "fuzzy" | "unmatched",
      "product": "Product name or code from master",
      "productConfidence": "exact" | "fuzzy" | "unmatched",
      "qty": 100,
      "price": 2500,
      "brokerageRate": 0,
      "remarks": ""
    }
  ]
}`;

    const modelsToTry = [
      "gemini-3.5-flash-lite",
      "gemini-3.6-flash",
    ];

    let geminiResponse: Response | null = null;
    let lastErrorText = "";

    const cleanApiKey = apiKey.trim();

    const requestPayload = {
      contents: [
        {
          parts: [
            { text: systemPrompt },
            { text: `USER SPOKEN/TYPED TEXT TO EXTRACT:\n${transcript}` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    };

    for (const model of modelsToTry) {
      // Try with both query param and x-goog-api-key header for maximum compatibility with all key formats
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanApiKey)}`;
      try {
        geminiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": cleanApiKey,
          },
          body: JSON.stringify(requestPayload),
        });

        if (geminiResponse.ok) {
          break;
        }

        lastErrorText = await geminiResponse.text();
        console.warn(`Gemini model ${model} returned error:`, lastErrorText);

        // If it's an API key error, don't keep trying models
        if (geminiResponse.status === 400 || geminiResponse.status === 401 || geminiResponse.status === 403) {
          break;
        }
      } catch (fetchErr) {
        lastErrorText = String(fetchErr);
      }
    }

    if (!geminiResponse || !geminiResponse.ok) {
      let friendlyMessage = lastErrorText;
      try {
        const errorJson = JSON.parse(lastErrorText);
        friendlyMessage =
          errorJson.error?.message ||
          errorJson.message ||
          lastErrorText;
      } catch {
        // use raw
      }

      console.error("Gemini API call failed:", friendlyMessage);
      return NextResponse.json(
        {
          error: `Google Gemini API error: ${friendlyMessage}`,
        },
        { status: 502 },
      );
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return NextResponse.json(
        { error: "No response text received from Gemini." },
        { status: 500 },
      );
    }

    let parsedResult: any;
    try {
      parsedResult = JSON.parse(rawText);
    } catch (parseError) {
      console.error("Failed to parse Gemini JSON:", rawText);
      return NextResponse.json(
        { error: "Failed to parse structured JSON from AI output." },
        { status: 500 },
      );
    }

    const rawTransactions = Array.isArray(parsedResult?.transactions)
      ? parsedResult.transactions
      : Array.isArray(parsedResult)
      ? parsedResult
      : [];

    // Master lookup map for post-validation guarantee
    const compMap = new Map<string, string>();
    for (const c of companyList) {
      compMap.set(c.name.toLowerCase().trim(), c.city);
    }

    const prodMap = new Map<string, { name: string; rate: number }>();
    for (const p of productList) {
      if (p.name) prodMap.set(p.name.toLowerCase().trim(), { name: p.name, rate: p.rate });
      if (p.code) prodMap.set(p.code.toLowerCase().trim(), { name: p.name || p.code, rate: p.rate });
    }

    const cleanedTransactions = rawTransactions.map((tx: any) => {
      const sellerKey = String(tx.sellerCompanyName || "").toLowerCase().trim();
      const buyerKey = String(tx.buyerCompanyName || "").toLowerCase().trim();
      const productKey = String(tx.product || "").toLowerCase().trim();

      const sellerCity = compMap.get(sellerKey) || tx.sellerCompanyCity || "";
      const buyerCity = compMap.get(buyerKey) || tx.buyerCompanyCity || "";
      const matchedProd = prodMap.get(productKey);

      return {
        date: tx.date || todayStr,
        sellerCompanyName: tx.sellerCompanyName || "",
        sellerCompanyCity: sellerCity,
        sellerConfidence: compMap.has(sellerKey)
          ? tx.sellerConfidence || "exact"
          : "unmatched",
        buyerCompanyName: tx.buyerCompanyName || "",
        buyerCompanyCity: buyerCity,
        buyerConfidence: compMap.has(buyerKey)
          ? tx.buyerConfidence || "exact"
          : "unmatched",
        product: matchedProd ? matchedProd.name : tx.product || "",
        productConfidence: matchedProd
          ? tx.productConfidence || "exact"
          : "unmatched",
        qty: Number(tx.qty) || 0,
        price: Number(tx.price) || 0,
        brokerageRate: Number(tx.brokerageRate ?? matchedProd?.rate ?? 0),
        remarks: tx.remarks ? String(tx.remarks) : "",
      };
    });

    return NextResponse.json({
      success: true,
      count: cleanedTransactions.length,
      transactions: cleanedTransactions,
    });
  } catch (error) {
    console.error("Voice parse error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse transactions." },
      { status: 500 },
    );
  }
}
