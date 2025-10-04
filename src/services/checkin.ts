import { supabase } from "@/integrations/supabase/client";

export type CheckinResult = "ok" | "duplicado" | "invalido" | "cancelado";

export async function scanCheckin(tenantId: string, qr: string, gate?: string, deviceId?: string) {
  const { data, error } = await supabase.functions.invoke("checkin-scan", {
    headers: { "x-tenant-id": tenantId },
    body: { qr, gate: gate ?? null, deviceId: deviceId ?? null },
  });
  if (error) throw error;
  return data as { ok: boolean; result: CheckinResult; ticketId?: string; error?: string };
}
