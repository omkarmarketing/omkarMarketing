import { getSheetIdForUser, verifyUserAccess, isAmit } from "@/lib/auth";
import { getSheetValues, ensureSheet, sheets } from "@/lib/sheets";
import { getCompanySheetName, getProductSheetName } from "@/lib/sheets-helper";
import { globalCache } from "@/lib/cache";
import { TransactionsPageClient } from "@/app/transactions/transactions-page-client";

export default async function TransactionsPage() {
  const email = await verifyUserAccess();
  const sheetId = await getSheetIdForUser();
  const companySheetName = getCompanySheetName();
  const productSheetName = getProductSheetName();
  const amitStatus = await isAmit();

  // Try cache first
  const compCacheKey = `companies_${email}`;
  const prodCacheKey = `products_${email}`;
  
  let companies = globalCache.get<any[]>(compCacheKey);
  let products = globalCache.get<any[]>(prodCacheKey);
  let transactions: any[] = [];

  if (!companies) {
    try {
      await ensureSheet(sheetId, companySheetName);
      companies = await getSheetValues(sheetId, companySheetName);
      globalCache.set(compCacheKey, companies, 10 * 60 * 1000);
    } catch (e) { companies = []; }
  }

  if (!products) {
    try {
      await ensureSheet(sheetId, productSheetName);
      products = await getSheetValues(sheetId, productSheetName);
      globalCache.set(prodCacheKey, products, 10 * 60 * 1000);
    } catch (e) { products = []; }
  }

  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });
    
    const fySheets = spreadsheet.data.sheets?.filter(
      (s: any) => s.properties?.title?.startsWith("FY")
    ) || [];
    
    const allRows: any[] = [];
    
    for (const sheet of fySheets) {
      const sheetName = sheet.properties?.title || "";
      if (sheetName) {
        const rows = await getSheetValues(sheetId, sheetName);
        const rowsWithSheet = rows.map((row: any) => ({
          ...row,
          _sheetName: sheetName
        }));
        allRows.push(...rowsWithSheet);
      }
    }

    // Fetch product data for mapping
    const productSheetName = getProductSheetName();
    let productRows: any[] = [];
    try {
      productRows = await getSheetValues(sheetId, productSheetName);
    } catch (e) { productRows = []; }
    
    const productMap = new Map();
    productRows.forEach((p: any) => {
      const productCode = p.productCode || p["productCode"] || "";
      const productName = p.productName || p["productName"] || "";
      if (productCode) productMap.set(productCode, productName);
    });

    transactions = allRows.map((row: any) => {
      const productCode = row.product || "";
      return {
        ...row,
        product: productMap.get(productCode) || productCode,
      };
    });
  } catch (e) { 
    console.error("Error fetching transactions on server:", e);
    transactions = []; 
  }

  return (
    <TransactionsPageClient 
      initialCompanies={companies || []} 
      initialProducts={products || []}
      initialIsAmit={amitStatus}
      initialTransactions={transactions}
    />
  );
}
