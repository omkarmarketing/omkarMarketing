import { NextResponse } from "next/server";
import { getCurrentUserEmail } from "@/lib/auth";

export async function GET() {
  try {
    const email = await getCurrentUserEmail();
    return NextResponse.json({ email });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
