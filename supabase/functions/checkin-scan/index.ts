// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-tenant-id, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ScanPayload = {
  qr: string;               // base64url do JSON: { v, tid, n, t }
  gate?: string | null;
  deviceId?: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function b64urlToString(b64url: string): string {
  const pad = (s: string) => s + "===".slice((s.length + 3) % 4);
  const b64 = pad(b64url.replace(/-/g, "+").replace(/_/g, "/"));
  try {
    return new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
  } catch {
    // fallback para ambientes Deno sem atob
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST")    return json({ error: "Method Not Allowed" }, 405);

  try {
    const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
    const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader   = req.headers.get("Authorization");
    const tenantId     = req.headers.get("x-tenant-id");

    if (!authHeader) return json({ error: "Missing Authorization" }, 401);
    if (!tenantId)   return json({ error: "Missing x-tenant-id" }, 400);

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // valida usuário
    const { data: { user }, error: uerr } = await supabase.auth.getUser();
    if (uerr || !user) return json({ error: "Invalid user" }, 401);

    // autoriza: operador de check-in ou admin do tenant
    const { data: allowedOp, error: r1 } = await supabase.rpc("has_role", { p_tenant: tenantId, p_role: "checkin_operator" });
    const { data: allowedAdmin, error: r2 } = await supabase.rpc("is_tenant_admin", { p_tenant: tenantId });
    if ((r1 || r2) || !(allowedOp || allowedAdmin)) {
      return json({ error: "Forbidden (role required)" }, 403);
    }

    const body = (await req.json()) as ScanPayload;
    if (!body?.qr) return json({ error: "Missing qr" }, 400);

    // decode QR -> { v, tid, n, t }
    let decoded: any;
    try {
      decoded = JSON.parse(b64urlToString(body.qr));
    } catch {
      return json({ ok: false, result: "invalido", error: "QR inválido" }, 422);
    }
    const tid = decoded?.tid as string | undefined;
    const nonce = decoded?.n as string | undefined;
    if (!tid || !nonce) return json({ ok: false, result: "invalido", error: "QR incompleto" }, 422);

    // busca ticket
    const { data: ticket, error: terr } = await supabase
      .from("tickets")
      .select("id, tenant_id, status, qr_nonce")
      .eq("id", tid)
      .maybeSingle();

    if (terr || !ticket) return json({ ok: false, result: "invalido", error: "Ticket não encontrado" }, 404);
    if (ticket.tenant_id !== tenantId) return json({ ok: false, result: "invalido", error: "Cross-tenant" }, 403);

    // status já consumido?
    if (ticket.status === "checkin") {
      // registra tentativa duplicada
      await supabase.from("checkins").insert({
        ticket_id: ticket.id,
        operator_id: user.id,
        tenant_id: tenantId,
        gate: body.gate ?? null,
        device_id: body.deviceId ?? null,
        resultado: "duplicado",
      });
      return json({ ok: true, result: "duplicado", ticketId: ticket.id }, 200);
    }
    if (ticket.status === "cancelado") {
      await supabase.from("checkins").insert({
        ticket_id: ticket.id,
        operator_id: user.id,
        tenant_id: tenantId,
        gate: body.gate ?? null,
        device_id: body.deviceId ?? null,
        resultado: "cancelado",
      });
      return json({ ok: false, result: "cancelado", ticketId: ticket.id }, 422);
    }

    // nonce confere?
    if (ticket.qr_nonce !== nonce) {
      await supabase.from("checkins").insert({
        ticket_id: ticket.id,
        operator_id: user.id,
        tenant_id: tenantId,
        gate: body.gate ?? null,
        device_id: body.deviceId ?? null,
        resultado: "invalido",
      });
      return json({ ok: false, result: "invalido", ticketId: ticket.id }, 422);
    }

    // consome idempotente: atualiza somente se ainda não estiver em checkin e nonce confere
    const { error: uperr } = await supabase
      .from("tickets")
      .update({ status: "checkin" })
      .eq("id", ticket.id)
      .eq("qr_nonce", nonce)
      .neq("status", "checkin");

    // registra check-in
    await supabase.from("checkins").insert({
      ticket_id: ticket.id,
      operator_id: user.id,
      tenant_id: tenantId,
      gate: body.gate ?? null,
      device_id: body.deviceId ?? null,
      resultado: uperr ? "invalido" : "ok",
    });

    if (uperr) return json({ ok: false, result: "invalido", ticketId: ticket.id }, 422);

    return json({ ok: true, result: "ok", ticketId: ticket.id }, 200);
  } catch (e) {
    console.error("checkin-scan error", e);
    return json({ error: (e as Error)?.message ?? "unknown" }, 500);
  }
});
