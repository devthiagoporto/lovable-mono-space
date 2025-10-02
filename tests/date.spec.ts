import { describe, it, expect } from "vitest";
import { 
  formatDate, 
  formatDateOnly, 
  formatTimeOnly,
  DEFAULT_DATETIME_FORMAT,
  DEFAULT_DATE_FORMAT,
  DEFAULT_TIME_FORMAT,
  BRAZIL_TIMEZONE
} from "@/lib/utils/date";

describe("Date Utils", () => {
  const testDate = new Date("2025-10-02T14:30:00");
  const testDateISO = "2025-10-02T14:30:00";

  describe("formatDate", () => {
    it("should format date with default format (dd/MM/yyyy HH:mm)", () => {
      expect(formatDate(testDate)).toBe("02/10/2025 14:30");
    });

    it("should handle ISO string dates", () => {
      expect(formatDate(testDateISO)).toBe("02/10/2025 14:30");
    });

    it("should format with custom format string", () => {
      expect(formatDate(testDate, "dd/MM/yyyy")).toBe("02/10/2025");
      expect(formatDate(testDate, "HH:mm")).toBe("14:30");
    });

    it("should handle different times", () => {
      const morning = new Date("2025-10-02T08:15:00");
      expect(formatDate(morning)).toBe("02/10/2025 08:15");

      const evening = new Date("2025-10-02T20:45:00");
      expect(formatDate(evening)).toBe("02/10/2025 20:45");
    });

    it("should handle midnight and noon", () => {
      const midnight = new Date("2025-10-02T00:00:00");
      expect(formatDate(midnight)).toBe("02/10/2025 00:00");

      const noon = new Date("2025-10-02T12:00:00");
      expect(formatDate(noon)).toBe("02/10/2025 12:00");
    });
  });

  describe("formatDateOnly", () => {
    it("should format date without time (dd/MM/yyyy)", () => {
      expect(formatDateOnly(testDate)).toBe("02/10/2025");
    });

    it("should handle ISO string", () => {
      expect(formatDateOnly(testDateISO)).toBe("02/10/2025");
    });

    it("should format different dates", () => {
      const newYear = new Date("2025-01-01T10:00:00");
      expect(formatDateOnly(newYear)).toBe("01/01/2025");

      const endOfYear = new Date("2025-12-31T23:59:00");
      expect(formatDateOnly(endOfYear)).toBe("31/12/2025");
    });
  });

  describe("formatTimeOnly", () => {
    it("should format time only (HH:mm)", () => {
      expect(formatTimeOnly(testDate)).toBe("14:30");
    });

    it("should handle ISO string", () => {
      expect(formatTimeOnly(testDateISO)).toBe("14:30");
    });

    it("should format different times", () => {
      const morning = new Date("2025-10-02T06:45:00");
      expect(formatTimeOnly(morning)).toBe("06:45");

      const evening = new Date("2025-10-02T18:15:00");
      expect(formatTimeOnly(evening)).toBe("18:15");
    });
  });

  describe("Constants", () => {
    it("should export correct format constants", () => {
      expect(DEFAULT_DATETIME_FORMAT).toBe("dd/MM/yyyy HH:mm");
      expect(DEFAULT_DATE_FORMAT).toBe("dd/MM/yyyy");
      expect(DEFAULT_TIME_FORMAT).toBe("HH:mm");
    });

    it("should export Brazil timezone constant", () => {
      expect(BRAZIL_TIMEZONE).toBe("America/Sao_Paulo");
    });
  });
});
