// POST { ticketId: string, nome: string, cpf: string }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Payload = { ticketId: string; nome: string; cpf: string };

function b64urlFromBytes(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');
    const tenantId = req.headers.get('x-tenant-id');

    if (!authHeader) return json({ error: 'Missing Authorization' }, 401);
    if (!tenantId) return json({ error: 'Missing x-tenant-id' }, 400);

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // valida usuário
    const { data: { user }, error: uerr } = await supabase.auth.getUser();
    if (uerr || !user) return json({ error: 'Invalid user' }, 401);

    const body = (await req.json()) as Payload;
    if (!body?.ticketId || !body?.nome || !body?.cpf) {
      return json({ error: 'Missing fields: ticketId, nome, cpf' }, 400);
    }

    // normaliza CPF
    const cpf = (body.cpf || '').replace(/\D/g, '');
    if (!/^\d{11}$/.test(cpf)) return json({ error: 'CPF inválido' }, 422);

    // carrega ticket + valida posse ou permissão no tenant
    const { data: ticket, error: terr } = await supabase
      .from('tickets')
      .select('id, order_id, tenant_id, status')
      .eq('id', body.ticketId)
      .maybeSingle();

    if (terr || !ticket) return json({ error: 'Ticket não encontrado' }, 404);
    if (ticket.tenant_id !== tenantId) return json({ error: 'Cross-tenant' }, 403);
    if (!['emitido','transferido'].includes(ticket.status)) {
      return json({ error: 'Ticket não está elegível para nomeação' }, 422);
    }

    // é dono do pedido?
    const { data: order, error: oerr } = await supabase
      .from('orders')
      .select('id, buyer_id, tenant_id')
      .eq('id', ticket.order_id)
      .maybeSingle();

    if (oerr || !order) return json({ error: 'Pedido não encontrado' }, 404);

    // checa: comprador OU membro do tenant com permissão
    let allowed = order.buyer_id === user.id;
    if (!allowed) {
      const { data: hasAccess, error: aerr } = await supabase.rpc('has_tenant_access', { p_tenant: tenantId });
      if (!aerr && hasAccess) {
        // restringe a admin/staff
        const { data: isAdmin, error: rerr } = await supabase.rpc('is_tenant_admin', { p_tenant: tenantId });
        allowed = !rerr && !!isAdmin;
      }
    }
    if (!allowed) return json({ error: 'Sem permissão para nomear este ticket' }, 403);

    // emite QR (nonce + payload simples)
    const nonceBytes = new Uint8Array(16);
    crypto.getRandomValues(nonceBytes);
    const qr_nonce = b64urlFromBytes(nonceBytes);
    const qrPayload = { v: 1, tid: ticket.id, n: qr_nonce, t: Date.now() };
    const qr = b64urlFromBytes(new TextEncoder().encode(JSON.stringify(qrPayload)));

    // atualiza ticket
    const { error: uperr } = await supabase
      .from('tickets')
      .update({
        nome_titular: body.nome,
        cpf_titular: cpf,
        qr_nonce,
        qr_last_issued_at: new Date().toISOString(),
      })
      .eq('id', ticket.id);

    if (uperr) return json({ error: 'Falha ao atualizar ticket' }, 500);

    return json({ ok: true, ticketId: ticket.id, qr }, 200);
  } catch (e) {
    console.error('tickets-assign error', e);
    return json({ error: (e as Error)?.message ?? 'unknown' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
