/**
 * Formats a number as Brazilian Real (BRL) currency
 * 
 * @param value - Numeric value to format
 * @returns Formatted string in BRL format (R$ X.XXX,XX)
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Parses a BRL formatted string to number
 * Example: "R$ 1.234,50" -> 1234.5
 */
export function parseBRL(value: string): number {
  const cleaned = value.replace(/[^\d,-]/g, "").replace(",", ".");
  return parseFloat(cleaned);
}
