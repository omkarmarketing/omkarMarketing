import { InvoiceForm } from "@/components/invoice-form";
import { getSheetIdForUser, verifyUserAccess, isAmit } from "@/lib/auth";
import { getSheetValues, ensureSheet } from "@/lib/sheets";
import { getCompanySheetName } from "@/lib/sheets-helper";
import { globalCache } from "@/lib/cache";
import { InvoicePageClient } from "@/app/invoice/invoice-page-client";

export default async function InvoicePage() {
  const email = await verifyUserAccess();
  const sheetId = await getSheetIdForUser();
  const companySheetName = getCompanySheetName();
  const amitStatus = await isAmit();

  // Try cache first
  const cacheKey = `companies_${email}`;
  let companies = globalCache.get<any[]>(cacheKey);

  if (!companies) {
    try {
      await ensureSheet(sheetId, companySheetName);
      companies = await getSheetValues(sheetId, companySheetName);
      globalCache.set(cacheKey, companies, 10 * 60 * 1000);
    } catch (error) {
      console.error("Error fetching companies in server component:", error);
      companies = [];
    }
  }

  return (
    <InvoicePageClient 
      initialCompanies={companies} 
      userEmail={email} 
      isAmit={amitStatus} 
    />
  );
}
