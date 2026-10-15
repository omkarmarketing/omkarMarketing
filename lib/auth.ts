import { currentUser } from "@clerk/nextjs/server"

export function isClerkConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY,
  )
}

export function getFallbackClerkPublishableKey() {
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_1234567890"
}

// User email to sheet ID mapping
const USER_SHEET_MAP: Record<string, string> = {
  [process.env.NEXT_PUBLIC_CLERK_EMAIL_USER1 || ""]: process.env.NEXT_PUBLIC_SPREADSHEET_USER1 || "",
  [process.env.NEXT_PUBLIC_CLERK_EMAIL_USER2 || ""]: process.env.NEXT_PUBLIC_SPREADSHEET_USER2 || "",
}

export async function getSheetIdForUser() {
  if (!isClerkConfigured()) {
    throw new Error("Clerk is not configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY.")
  }

  const user = await currentUser()
  if (!user?.emailAddresses[0]) {
    throw new Error("User not found")
  }

  const email = user.emailAddresses[0].emailAddress
  const sheetId = USER_SHEET_MAP[email]

  if (!sheetId) {
    throw new Error(`No sheet configured for user: ${email}`)
  }

  return sheetId
}

export async function getCurrentUserEmail() {
  if (!isClerkConfigured()) {
    return ""
  }

  const user = await currentUser()
  return user?.emailAddresses[0]?.emailAddress || ""
}

export async function verifyUserAccess() {
  if (!isClerkConfigured()) {
    throw new Error("Clerk is not configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY.")
  }

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  const allowedEmails = [process.env.NEXT_PUBLIC_CLERK_EMAIL_USER1, process.env.NEXT_PUBLIC_CLERK_EMAIL_USER2].filter(
    Boolean,
  )

  if (!email || !allowedEmails.includes(email)) {
    throw new Error("Unauthorized access")
  }

  return email
}
export async function isAmit() {
  if (!isClerkConfigured()) {
    return false
  }

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress
  return email === process.env.NEXT_PUBLIC_CLERK_EMAIL_USER2
}
