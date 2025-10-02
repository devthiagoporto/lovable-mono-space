import { describe, it, expect } from "vitest";
import { formatBRL, parseBRL } from "@/lib/utils/currency";

describe("Currency Utils", () => {
  describe("formatBRL", () => {
    it("should format number as BRL currency", () => {
      expect(formatBRL(1234.5)).toBe("R$ 1.234,50");
    });

    it("should format integer values", () => {
      expect(formatBRL(1000)).toBe("R$ 1.000,00");
    });

    it("should format decimal values correctly", () => {
      expect(formatBRL(99.99)).toBe("R$ 99,99");
    });

    it("should format zero", () => {
      expect(formatBRL(0)).toBe("R$ 0,00");
    });

    it("should handle large numbers", () => {
      expect(formatBRL(1234567.89)).toBe("R$ 1.234.567,89");
    });
  });

  describe("parseBRL", () => {
    it("should parse BRL formatted string to number", () => {
      expect(parseBRL("R$ 1.234,50")).toBe(1234.5);
    });

    it("should handle simple decimal", () => {
      expect(parseBRL("R$ 99,99")).toBe(99.99);
    });
  });
});
