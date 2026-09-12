/**
 * Formats an amount in minor units (cents) to a readable currency string.
 * e.g., 2500 cents -> "$25.00 USD"
 */
export function formatCentsToCurrency(
  cents: number,
  currency: string = 'USD'
): string {
  const amount = (cents || 0) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parses user input dollars (e.g. "15.50") into integer cents (1550).
 */
export function parseDollarsToCents(dollars: number | string): number {
  const parsed = typeof dollars === 'string' ? parseFloat(dollars) : dollars;
  if (isNaN(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

