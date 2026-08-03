export interface CurrencyConfig {
  code: string;
  symbol: string;
  label: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: "PHP", symbol: "₱", label: "Philippine Peso (PHP)", locale: "en-PH" },
  { code: "USD", symbol: "$", label: "US Dollar (USD)", locale: "en-US" },
  { code: "EUR", symbol: "€", label: "Euro (EUR)", locale: "de-DE" },
  { code: "GBP", symbol: "£", label: "British Pound (GBP)", locale: "en-GB" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen (JPY)", locale: "ja-JP" },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar (CAD)", locale: "en-CA" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar (AUD)", locale: "en-AU" },
];

export const DEFAULT_CURRENCY = SUPPORTED_CURRENCIES[0]; // PHP ₱

/**
 * Gets currency symbol by code or default PHP symbol.
 */
export function getCurrencySymbol(currencyCode?: string): string {
  if (!currencyCode) return DEFAULT_CURRENCY.symbol;
  const found = SUPPORTED_CURRENCIES.find(c => c.code.toUpperCase() === currencyCode.toUpperCase());
  return found ? found.symbol : currencyCode;
}

/**
 * Formats an integer cents value into a localized currency string with symbol.
 * Example: 150050 cents -> "₱1,500.50"
 */
export function formatCurrencyCents(
  cents: number = 0,
  currencyCode: string = "PHP",
  options?: { showSymbol?: boolean; hideDecimalsIfZero?: boolean }
): string {
  const showSymbol = options?.showSymbol ?? true;
  const dollars = (cents || 0) / 100;
  const symbol = getCurrencySymbol(currencyCode);

  const formattedNumber = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);

  if (!showSymbol) {
    return formattedNumber;
  }

  return `${symbol}${formattedNumber}`;
}
