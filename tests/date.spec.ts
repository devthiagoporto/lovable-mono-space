import { describe, it, expect } from "vitest";
import { formatDate, formatDateOnly, formatTimeOnly } from "@/lib/utils/date";

describe("Date Utils", () => {
  const testDate = new Date("2025-10-02T14:30:00");

  describe("formatDate", () => {
    it("should format date with default format (dd/MM/yyyy HH:mm)", () => {
      expect(formatDate(testDate)).toBe("02/10/2025 14:30");
    });

    it("should handle ISO string dates", () => {
      expect(formatDate("2025-10-02T14:30:00")).toBe("02/10/2025 14:30");
    });
  });

  describe("formatDateOnly", () => {
    it("should format date without time (dd/MM/yyyy)", () => {
      expect(formatDateOnly(testDate)).toBe("02/10/2025");
    });
  });

  describe("formatTimeOnly", () => {
    it("should format time only (HH:mm)", () => {
      expect(formatTimeOnly(testDate)).toBe("14:30");
    });
  });
});
