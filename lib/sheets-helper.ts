// Helper to manage sheet names and automatic year-based sheet creation

export function getCurrentFinancialYearSheetName(): string {
  const now = new Date()
  return getFinancialYearSheetName(now);
}

export function getFinancialYearSheetName(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1

  // Assuming financial year starts in April (common in India)
  const fy = month >= 4 ? year : year - 1
  const nextYear = fy + 1

  return `FY${fy}-${String(nextYear).slice(-2)}`
}

export function getCompanySheetName(): string {
  return "Company Master"
}

export function getProductSheetName(): string {
  return "Product Master"
}

export function getBrokerageSheetName(): string {
  return "Brokerage Bills"
}
