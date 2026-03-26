/**
 * Utility functions for date parsing and formatting
 */

/**
 * Parse a date string in dd-mm-yy format to a JavaScript Date object
 * @param dateStr Date string in dd-mm-yy format (e.g., "15-01-24")
 * @returns Date object
 */
/**
 * Parse a date string, number, or Date object to a JavaScript Date object
 */
export function parseDateFromSheet(dateInput: any): Date {
  if (!dateInput) return new Date(NaN);

  // If already a Date object
  if (dateInput instanceof Date) return dateInput;

  // If it's a number (Excel/Sheets serial number)
  if (typeof dateInput === "number") {
    // 25569 is the difference in days between 1899-12-30 and 1970-01-01
    return new Date((dateInput - 25569) * 86400000);
  }

  const dateStr = dateInput.toString().trim();
  if (!dateStr) return new Date(NaN);

  // Check if string is a pure number (serial number as string)
  if (/^\d+$/.test(dateStr) && dateStr.length < 10) {
    return parseDateFromSheet(Number(dateStr));
  }

  // Check if already in ISO format (yyyy-mm-dd)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return new Date(dateStr);
  }

  // Handle various delimiters (hyphen, slash, dot)
  // Support dd-mm-yy, dd/mm/yy, dd.mm.yy
  const shortDateMatch = dateStr.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{2})$/);
  if (shortDateMatch) {
    const day = Number(shortDateMatch[1]);
    const month = Number(shortDateMatch[2]);
    const year = Number(shortDateMatch[3]);
    const fullYear = year < 50 ? 2000 + year : 1900 + year;
    return new Date(fullYear, month - 1, day);
  }

  // Support dd-mm-yyyy, dd/mm/yyyy, dd.mm.yyyy
  const longDateMatch = dateStr.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/);
  if (longDateMatch) {
    const day = Number(longDateMatch[1]);
    const month = Number(longDateMatch[2]);
    const year = Number(longDateMatch[3]);
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
export function formatDateToSheet(date: any): string {
  const dateObj = parseDateFromSheet(date);
  if (isNaN(dateObj.getTime())) return String(date);

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
export function formatDateForDisplay(date: any): string {
  const dateObj = parseDateFromSheet(date);
  if (isNaN(dateObj.getTime())) return String(date);

  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Format a date to dd.MM.yy format for display
 * @param date Date object or string to format
 * @returns Date string in dd.MM.yy format
 */
export function formatDateToDots(date: any): string {
  const dateObj = parseDateFromSheet(date);
  if (isNaN(dateObj.getTime())) return String(date);

  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = String(dateObj.getFullYear()).slice(-2);

  return `${day}.${month}.${year}`;
}

/**
 * Format a date to dd-mm-yyyy format
 * @param date Date object or string to format
 * @returns Date string in dd-mm-yyyy format
 */
export function formatDateWithHyphens(date: any): string {
  const dateObj = parseDateFromSheet(date);
  if (isNaN(dateObj.getTime())) return String(date);

  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();

  return `${day}-${month}-${year}`;
}
