import { getSheetIdForUser, verifyUserAccess } from "@/lib/auth";
import { getSheetValues, ensureSheet } from "@/lib/sheets";
import { getCompanySheetName } from "@/lib/sheets-helper";
import { globalCache } from "@/lib/cache";
import { CompanyPageClient } from "./company-page-client";

export default async function CompanyPage() {
  const email = await verifyUserAccess();
  const sheetId = await getSheetIdForUser();
  const companySheetName = getCompanySheetName();

  // Try cache first
  const cacheKey = `companies_${email}`;
  let companies = globalCache.get<any[]>(cacheKey);

  if (!companies) {
    try {
      await ensureSheet(sheetId, companySheetName);
      companies = await getSheetValues(sheetId, companySheetName);
      globalCache.set(cacheKey, companies, 10 * 60 * 1000);
    } catch (e) {
      console.error("Error fetching companies on server:", e);
      companies = [];
    }
  }

  return (
    <CompanyPageClient 
      initialCompanies={companies || []} 
    />
  );
}
