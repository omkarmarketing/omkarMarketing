import { getSheetIdForUser, verifyUserAccess, isAmit, isClerkConfigured } from "@/lib/auth";
import { getSheetValues, ensureSheet, sheets } from "@/lib/sheets";
import { getCompanySheetName, getProductSheetName } from "@/lib/sheets-helper";
import { globalCache } from "@/lib/cache";
import { TransactionsPageClient } from "@/app/transactions/transactions-page-client";

export default async function TransactionsPage() {
  if (!isClerkConfigured()) {
    return (
      <TransactionsPageClient
        initialCompanies={[]}
        initialProducts={[]}
        initialIsAmit={false}
        initialTransactions={[]}
      />
    );
  }

  const email = await verifyUserAccess();
  const sheetId = await getSheetIdForUser();
  const companySheetName = getCompanySheetName();
  const productSheetName = getProductSheetName();
  const amitStatus = await isAmit();

  const compCacheKey = `companies_${email}`;
  const prodCacheKey = `products_${email}`;
  
  let companies = globalCache.get<any[]>(compCacheKey);
  let products = globalCache.get<any[]>(prodCacheKey);
  let transactions: any[] = [];

  try {
    const masterDataRequests = [
      companies
        ? Promise.resolve(companies)
        : ensureSheet(sheetId, companySheetName).then(() =>
            getSheetValues(sheetId, companySheetName),
          ),
      products
        ? Promise.resolve(products)
        : ensureSheet(sheetId, productSheetName).then(() =>
            getSheetValues(sheetId, productSheetName),
          ),
    ] as const;
    [companies, products] = await Promise.all(masterDataRequests);
    if (!globalCache.get(compCacheKey)) {
      globalCache.set(compCacheKey, companies, 10 * 60 * 1000);
    }
    if (!globalCache.get(prodCacheKey)) {
      globalCache.set(prodCacheKey, products, 10 * 60 * 1000);
    }

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });
    
    const fySheets = spreadsheet.data.sheets?.filter(
      (s: any) => s.properties?.title?.startsWith("FY")
    ) || [];
    
    const rowsByYear = await Promise.all(fySheets.map(async (sheet: any) => {
      const sheetName = sheet.properties?.title || "";
      if (!sheetName) return [];
      const rows = await getSheetValues(sheetId, sheetName);
      return rows.map((row: any) => ({ ...row, _sheetName: sheetName }));
    }));
    const allRows = rowsByYear.flat();
    
    const productMap = new Map();
    (products || []).forEach((p: any) => {
      const productCode = p.productCode || p["Product Code"] || "";
      const productName = p.productName || p["Product Name"] || "";
      if (productCode) productMap.set(String(productCode).trim().toLowerCase(), productName);
      if (productName) productMap.set(String(productName).trim().toLowerCase(), productName);
    });

    transactions = allRows.map((row: any) => {
      const productCode = row.product || "";
      return {
        ...row,
        product: productMap.get(String(productCode).trim().toLowerCase()) || productCode,
      };
    });
  } catch (e) { 
    console.error("Error fetching transaction page data:", e);
    companies = companies || [];
    products = products || [];
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
