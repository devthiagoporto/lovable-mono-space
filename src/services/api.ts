import { supabase } from "@/integrations/supabase/client";

/**
 * Health check API call
 * Calls the health edge function to verify backend connectivity
 */
export async function healthCheck(): Promise<{ status: string }> {
  const { data, error } = await supabase.functions.invoke("health");

  if (error) {
    throw new Error(`Health check failed: ${error.message}`);
  }

  return data;
}
