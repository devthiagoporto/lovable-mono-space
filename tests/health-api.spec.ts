import { describe, it, expect, vi, beforeEach } from "vitest";
import { healthCheck } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";

// Mock the Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe("Health API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("healthCheck", () => {
    it("should return status ok when edge function succeeds", async () => {
      const mockResponse = { status: "ok" };
      
      // Mock successful response
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const result = await healthCheck();

      expect(result).toEqual({ status: "ok" });
      expect(supabase.functions.invoke).toHaveBeenCalledWith("health");
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
    });

    it("should throw error when edge function fails", async () => {
      const mockError = { message: "Connection failed" };

      // Mock error response
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: null,
        error: mockError,
      });

      await expect(healthCheck()).rejects.toThrow("Health check failed: Connection failed");
      expect(supabase.functions.invoke).toHaveBeenCalledWith("health");
    });

    it("should handle network errors", async () => {
      const mockError = { message: "Network error" };

      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: null,
        error: mockError,
      });

      await expect(healthCheck()).rejects.toThrow("Health check failed: Network error");
    });

    it("should return correct response format", async () => {
      const mockResponse = { status: "ok" };
      
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const result = await healthCheck();

      expect(result).toHaveProperty("status");
      expect(result.status).toBe("ok");
      expect(typeof result.status).toBe("string");
    });
  });
});
