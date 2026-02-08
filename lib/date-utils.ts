/**
 * Utility functions for date parsing and formatting
 */

/**
 * Parse a date string in dd-mm-yy format to a JavaScript Date object
 * @param dateStr Date string in dd-mm-yy format (e.g., "15-01-24")
 * @returns Date object
 */
export function parseDateFromSheet(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);

  // Check if already in ISO format (yyyy-mm-dd)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return new Date(dateStr);
  }

  // Check if in dd-mm-yy format
  if (/^\d{2}-\d{2}-\d{2}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split("-").map(Number);
    // Handle 2-digit year: assume 20xx for years < 50, 19xx for years >= 50
    const fullYear = year < 50 ? 2000 + year : 1900 + year;
    return new Date(fullYear, month - 1, day); // month is 0-indexed
  }

  // Check if in dd/mm/yyyy format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split("/").map(Number);
    return new Date(year, month - 1, day);
  }

  // Check if in dd-mm-yyyy format
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  // Otherwise try to parse as a standard date string
  return new Date(dateStr);
}

/**
 * Format a date to dd-mm-yy format for storing in Google Sheets
 * @param date Date object to format
 * @returns Date string in dd-mm-yy format
 */
export function formatDateToSheet(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = String(dateObj.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

/**
 * Format a date to dd/mm/yyyy format for display
 * @param date Date object or string to format
 * @returns Date string in dd/mm/yyyy format
 */
export function formatDateForDisplay(date: Date | string): string {
  if (!date) return "";

  const dateObj = typeof date === "string" ? parseDateFromSheet(date) : date;
  if (isNaN(dateObj.getTime())) return String(date); // Return original if not a valid date

  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();

  return `${day}/${month}/${year}`;
}
