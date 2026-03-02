import { getSheetIdForUser, verifyUserAccess, isAmit } from "@/lib/auth";
import { getSheetValues, ensureSheet } from "@/lib/sheets";
import { getProductSheetName } from "@/lib/sheets-helper";
import { globalCache } from "@/lib/cache";
import { ProductPageClient } from "./product-page-client";

export default async function ProductPage() {
  const email = await verifyUserAccess();
  const sheetId = await getSheetIdForUser();
  const productSheetName = getProductSheetName();
  const amitStatus = await isAmit();

  // Try cache first
  const cacheKey = `products_${email}`;
  let products = globalCache.get<any[]>(cacheKey);

  if (!products) {
    try {
      await ensureSheet(sheetId, productSheetName);
      products = await getSheetValues(sheetId, productSheetName);
      globalCache.set(cacheKey, products, 10 * 60 * 1000);
    } catch (e) {
      console.error("Error fetching products on server:", e);
      products = [];
    }
  }

  return (
    <ProductPageClient 
      initialProducts={products || []} 
      initialIsAmit={amitStatus} 
    />
  );
}
