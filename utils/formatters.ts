/**
 * Shared formatting utilities for the app.
 * Indian number system: lakhs (1,00,000) and crores (1,00,00,000).
 */

/**
 * Apply Indian-style comma grouping to the integer part of a number string.
 * Last 3 digits stay together, then groups of 2 from the right.
 * Examples: "10000" → "10,000", "100000" → "1,00,000", "1000000" → "10,00,000"
 */
function applyIndianCommas(intStr: string): string {
  if (intStr.length <= 3) return intStr;
  const lastThree = intStr.slice(-3);
  const remaining = intStr.slice(0, -3);
  return remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
}

/**
 * Format a number using the Indian numbering system (lakhs/crores).
 * Examples: 10000 → "10,000", 100000 → "1,00,000", 1000000 → "10,00,000"
 * @param num - number or string to format
 * @param decimals - max decimal places to show (default 2, max 4)
 * @param minDecimals - minimum decimal places to always show (default 0). Use 2 to always show paisa.
 */
export function formatIndianNumber(num: number | string, decimals: number = 2, minDecimals: number = 0): string {
  if (num === null || num === undefined || num === '') return '0';

  const n = typeof num === 'string' ? parseFloat(num.toString().replace(/[^0-9.-]/g, '')) : num;
  if (isNaN(n)) return '0';

  const isNegative = n < 0;
  const absNum = Math.abs(n);

  const parts = absNum.toFixed(decimals).split('.');
  const integerPart = applyIndianCommas(parts[0]);
  const decimalPart = parts[1];

  let result = integerPart;
  if (decimalPart !== undefined) {
    let trimmed = decimalPart.replace(/0+$/, '');
    if (trimmed.length < minDecimals) {
      trimmed = decimalPart.substring(0, Math.max(trimmed.length, minDecimals));
    }
    if (trimmed.length > 0) {
      result += '.' + trimmed;
    }
  }

  return (isNegative ? '-' : '') + result;
}

/**
 * Format currency with ₹ symbol using Indian number formatting.
 * @param amount - the amount to format
 * @param decimals - max decimal places (default 2, up to 4)
 * @param minDecimals - minimum decimal places to always show (default 2 for currency)
 */
export function formatCurrencyINR(amount: number | string, decimals: number = 2, minDecimals: number = 2): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '₹0';
  const prefix = n < 0 ? '-₹' : '₹';
  return prefix + formatIndianNumber(Math.abs(n), decimals, minDecimals);
}

/**
 * Format a price for display, preserving up to 4 decimal places.
 * Strips trailing zeros but shows meaningful decimals.
 */
export function formatPrice(price: number): string {
  if (price === null || price === undefined || isNaN(price)) return '0';
  // Show up to 4 decimal places, strip trailing zeros
  const fixed = price.toFixed(4);
  const trimmed = fixed.replace(/\.?0+$/, '');
  return trimmed;
}

/**
 * Format a price with Indian commas, preserving up to 4 decimal places.
 */
export function formatPriceINR(price: number, minDecimals: number = 2): string {
  return '₹' + formatIndianNumber(price, 4, minDecimals);
}

/**
 * Format a quantity / stock value.
 * Shows decimals only when the fractional part is non-zero.
 * Up to 3 decimal places, trailing zeros stripped.
 */
export function formatQty(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return '0';
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(3).replace(/\.?0+$/, '');
}

/**
 * Auto-format a raw text input into DD-MM-YYYY (or DD/MM/YYYY) as the user types.
 * Strips non-numeric chars, inserts separator after day and month.
 */
export function autoFormatDateInput(text: string, separator: string = '-'): string {
  const cleaned = text.replace(/[^0-9]/g, '');
  let formatted = '';
  if (cleaned.length > 0) {
    formatted = cleaned.substring(0, 2);
    if (cleaned.length >= 3) formatted += separator + cleaned.substring(2, 4);
    if (cleaned.length >= 5) formatted += separator + cleaned.substring(4, 8);
  }
  return formatted;
}

/**
 * Parse a DD-MM-YYYY string into a Date, or null if invalid.
 * Validates that the date actually exists (e.g. rejects 30-02-2026).
 */
export function parseDDMMYYYY(dateStr: string): Date | null {
  if (!dateStr || dateStr.length !== 10) return null;
  const sep = dateStr.includes('/') ? '/' : '-';
  const parts = dateStr.split(sep);
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (month < 1 || month > 12 || day < 1 || year < 1900) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

/**
 * Validate a DD-MM-YYYY date string.
 * @param allowFuture - if false (default), rejects dates after today
 * @returns error message or null if valid
 */
export function validateDateDDMMYYYY(dateStr: string, allowFuture: boolean = false): string | null {
  if (!dateStr || dateStr.trim().length === 0) return null;
  if (dateStr.trim().length < 10) return 'Incomplete date';
  const date = parseDDMMYYYY(dateStr);
  if (!date) return 'Invalid date';
  if (!allowFuture) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) return 'Date cannot be in the future';
  }
  return null;
}

/**
 * Convert DD-MM-YYYY to YYYY-MM-DD for backend storage.
 * Returns undefined if the date is invalid.
 */
export function ddmmyyyyToISO(dateStr: string): string | undefined {
  const date = parseDDMMYYYY(dateStr);
  if (!date) return undefined;
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Extract 1-2 letter initials from a name.
 * "Vikram M" → "VM", "Acme Corp" → "AC", "Vikram" → "V"
 */
export function getInitials(name: string | null | undefined): string {
  if (!name || name.trim().length === 0) return '?';
  const words = name.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertChunk(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
  return ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convertChunk(n % 100) : '');
}

/**
 * Convert a number to Indian English words for invoices.
 * e.g. 1234.56 → "Rupees One Thousand Two Hundred and Thirty-Four and Fifty-Six Paise Only"
 * Uses Indian numbering: Lakh (1,00,000), Crore (1,00,00,000).
 */
export function numberToWords(amount: number): string {
  if (amount === 0) return 'Rupees Zero Only';
  const isNeg = amount < 0;
  const abs = Math.abs(amount);
  const rupees = Math.floor(abs);
  const paise = Math.round((abs - rupees) * 100);

  const parts: string[] = [];
  let rem = rupees;

  if (rem >= 1_00_00_000) { parts.push(convertChunk(Math.floor(rem / 1_00_00_000)) + ' Crore'); rem %= 1_00_00_000; }
  if (rem >= 1_00_000) { parts.push(convertChunk(Math.floor(rem / 1_00_000)) + ' Lakh'); rem %= 1_00_000; }
  if (rem >= 1_000) { parts.push(convertChunk(Math.floor(rem / 1_000)) + ' Thousand'); rem %= 1_000; }
  if (rem >= 100) { parts.push(convertChunk(Math.floor(rem / 100)) + ' Hundred'); rem %= 100; }
  if (rem > 0) {
    if (parts.length > 0) parts.push('and');
    parts.push(convertChunk(rem));
  }

  let result = (isNeg ? 'Minus ' : '') + 'Rupees ' + (parts.length > 0 ? parts.join(' ') : 'Zero');
  if (paise > 0) {
    result += ' and ' + convertChunk(paise) + ' Paise';
  }
  return result + ' Only';
}

const AVATAR_COLORS = [
  '#3f66ac', '#059669', '#D97706', '#DC2626', '#7C3AED',
  '#2563EB', '#0891B2', '#DB2777', '#4F46E5', '#EA580C',
];

/**
 * Deterministic background color for an initials avatar.
 */
export function getAvatarColor(name: string | null | undefined): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * Capitalize the first letter of each word.
 * Works on web where autoCapitalize="words" is not supported.
 */
export function capitalizeWords(text: string): string {
  return text.replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}
