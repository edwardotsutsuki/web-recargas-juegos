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
 * Normaliza cualquier entrada numérica reemplazando comas por puntos
 * para cumplir con el estándar bancario y de USD en Ecuador.
 * Permite que usuarios que tengan teclado con coma no rompan el cálculo.
 */
export function sanitizeDecimalInput(input: string): string {
  if (!input) return '';
  // Reemplazar coma por punto y permitir solo números y un único punto
  const withDot = input.replace(/,/g, '.');
  const parts = withDot.split('.');
  if (parts.length > 2) {
    return `${parts[0]}.${parts.slice(1).join('')}`;
  }
  return withDot;
}

/**
 * Convierte un monto en dólares (ej: "1.50", "1,50", 1.5) a centavos enteros (150).
 * Seguro ante entradas con coma o punto.
 */
export function parseDollarsToCents(dollars: number | string): number {
  if (typeof dollars === 'number') {
    if (isNaN(dollars) || dollars < 0) return 0;
    return Math.round(dollars * 100);
  }
  const clean = sanitizeDecimalInput(dollars).trim();
  const parsed = parseFloat(clean);
  if (isNaN(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

/**
 * Formatea un número en formato estándar USD con punto decimal siempre ($ 1.50).
 */
export function formatUsd(amount: number): string {
  return `$ ${Number(amount || 0).toFixed(2)}`;
}

