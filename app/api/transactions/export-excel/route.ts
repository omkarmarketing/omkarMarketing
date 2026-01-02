import { NextResponse } from "next/server"
import { getSheetValues } from "@/lib/sheets"
import { verifyUserAccess, getSheetIdForUser } from "@/lib/auth"
import { getCurrentFinancialYearSheetName } from "@/lib/sheets-helper"

export async function GET() {
  try {
    await verifyUserAccess()
    const sheetId = await getSheetIdForUser()
    const sheetName = getCurrentFinancialYearSheetName()

    const transactions = await getSheetValues(sheetId, sheetName)

    // Convert to CSV format
    if (transactions.length === 0) {
      return NextResponse.json({ error: "No transactions to export" }, { status: 400 })
    }

    const headers = Object.keys(transactions[0])
    const csvContent = [
      headers.join(","),
      ...transactions.map((row) => headers.map((h) => `"${row[h] || ""}"`).join(",")),
    ].join("\n")

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="transactions.csv"',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export transactions" },
      { status: 500 },
    )
  }
}
