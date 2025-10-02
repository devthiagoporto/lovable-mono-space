import { describe, it, expect } from "vitest";
import { isValidCPF, formatCPF } from "@/lib/utils/cpf";

describe("CPF Utils", () => {
  describe("isValidCPF", () => {
    it("should return false for CPF with incorrect length", () => {
      expect(isValidCPF("123")).toBe(false);
      expect(isValidCPF("12345678901234")).toBe(false);
      expect(isValidCPF("")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidCPF("")).toBe(false);
    });

    it("should return false for CPF with all same digits", () => {
      expect(isValidCPF("11111111111")).toBe(false);
      expect(isValidCPF("00000000000")).toBe(false);
      expect(isValidCPF("99999999999")).toBe(false);
      expect(isValidCPF("22222222222")).toBe(false);
    });

    it("should accept CPF with valid format (numeric only)", () => {
      // Note: This is a stub test - will be expanded with real CPF validation
      expect(isValidCPF("12345678901")).toBe(true);
      expect(isValidCPF("98765432100")).toBe(true);
    });

    it("should handle CPF with formatting characters (dots and dash)", () => {
      expect(isValidCPF("123.456.789-01")).toBe(true);
      expect(isValidCPF("987.654.321-00")).toBe(true);
    });

    it("should handle CPF with partial formatting", () => {
      expect(isValidCPF("123.456.78901")).toBe(true);
      expect(isValidCPF("12345678-901")).toBe(true);
    });

    it("should reject CPF with letters", () => {
      expect(isValidCPF("123abc78901")).toBe(false);
      expect(isValidCPF("abc.def.ghi-jk")).toBe(false);
    });

    it("should handle CPF with spaces", () => {
      expect(isValidCPF("123 456 789 01")).toBe(true);
      expect(isValidCPF(" 12345678901 ")).toBe(true);
    });
  });

  describe("formatCPF", () => {
    it("should format CPF correctly", () => {
      expect(formatCPF("12345678901")).toBe("123.456.789-01");
      expect(formatCPF("98765432100")).toBe("987.654.321-00");
    });

    it("should handle already formatted CPF", () => {
      expect(formatCPF("123.456.789-01")).toBe("123.456.789-01");
      expect(formatCPF("987.654.321-00")).toBe("987.654.321-00");
    });

    it("should handle CPF with spaces", () => {
      expect(formatCPF("123 456 789 01")).toBe("123.456.789-01");
      expect(formatCPF(" 12345678901 ")).toBe("123.456.789-01");
    });

    it("should handle partial formatting", () => {
      expect(formatCPF("123.456.78901")).toBe("123.456.789-01");
    });
  });
});
