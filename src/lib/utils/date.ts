import { format as dateFnsFormat, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Default date-time format for the application (Brazilian standard)
 */
export const DEFAULT_DATETIME_FORMAT = "dd/MM/yyyy HH:mm";
export const DEFAULT_DATE_FORMAT = "dd/MM/yyyy";
export const DEFAULT_TIME_FORMAT = "HH:mm";

/**
 * Formats a date to Brazilian standard format
 * 
 * @param date - Date to format (Date object or ISO string)
 * @param formatString - Format string (default: dd/MM/yyyy HH:mm)
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  formatString: string = DEFAULT_DATETIME_FORMAT
): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return dateFnsFormat(dateObj, formatString, { locale: ptBR });
}

/**
 * Formats a date to Brazilian date only format (dd/MM/yyyy)
 */
export function formatDateOnly(date: Date | string): string {
  return formatDate(date, DEFAULT_DATE_FORMAT);
}

/**
 * Formats a date to time only format (HH:mm)
 */
export function formatTimeOnly(date: Date | string): string {
  return formatDate(date, DEFAULT_TIME_FORMAT);
}

/**
 * Brazil timezone identifier
 */
export const BRAZIL_TIMEZONE = "America/Sao_Paulo";
