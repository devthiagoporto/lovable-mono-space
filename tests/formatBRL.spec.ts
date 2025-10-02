import { describe, it, expect } from "vitest";
import { formatBRL, parseBRL } from "@/lib/utils/currency";

describe("Currency Utils", () => {
  describe("formatBRL", () => {
    it("should format integer values", () => {
      expect(formatBRL(1000)).toBe("R$ 1.000,00");
      expect(formatBRL(100)).toBe("R$ 100,00");
      expect(formatBRL(1)).toBe("R$ 1,00");
    });

    it("should format decimal values correctly", () => {
      expect(formatBRL(1234.5)).toBe("R$ 1.234,50");
      expect(formatBRL(99.99)).toBe("R$ 99,99");
      expect(formatBRL(1234.56)).toBe("R$ 1.234,56");
      expect(formatBRL(0.99)).toBe("R$ 0,99");
    });

    it("should format zero", () => {
      expect(formatBRL(0)).toBe("R$ 0,00");
    });

    it("should handle large numbers", () => {
      expect(formatBRL(1234567.89)).toBe("R$ 1.234.567,89");
      expect(formatBRL(9876543210.99)).toBe("R$ 9.876.543.210,99");
      expect(formatBRL(1000000)).toBe("R$ 1.000.000,00");
    });

    it("should handle negative numbers", () => {
      expect(formatBRL(-100)).toBe("-R$ 100,00");
      expect(formatBRL(-1234.56)).toBe("-R$ 1.234,56");
    });

    it("should handle very small decimals", () => {
      expect(formatBRL(0.01)).toBe("R$ 0,01");
      expect(formatBRL(0.1)).toBe("R$ 0,10");
    });
  });

  describe("parseBRL", () => {
    it("should parse BRL formatted string to number", () => {
      expect(parseBRL("R$ 1.234,50")).toBe(1234.5);
      expect(parseBRL("R$ 99,99")).toBe(99.99);
    });

    it("should handle simple decimal", () => {
      expect(parseBRL("1.234,50")).toBe(1234.5);
      expect(parseBRL("99,99")).toBe(99.99);
    });

    it("should handle values without thousands separator", () => {
      expect(parseBRL("R$ 999,99")).toBe(999.99);
      expect(parseBRL("100,50")).toBe(100.5);
    });
  });
});
