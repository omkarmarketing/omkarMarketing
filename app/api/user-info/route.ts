import { NextResponse } from "next/server";
import { getCurrentUserEmail } from "@/lib/auth";
import { globalCache } from "@/lib/cache";

const CACHE_KEY_PREFIX = "user_info_";

export async function GET() {
  try {
    const email = await getCurrentUserEmail();
    
    const cacheKey = `${CACHE_KEY_PREFIX}${email}`;
    const cachedData = globalCache.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    const data = { email };
    // Cache for 30 minutes
    globalCache.set(cacheKey, data, 30 * 60 * 1000);

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
