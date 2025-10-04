// supabase/functions/webhooks-stripe/index.ts
// Webhook do Stripe: valida assinatura, marca order como "pago",
// atualiza estoque dos lots e emite tickets a partir de order_items.
//
// Requer variáveis de ambiente na função:
// - STRIPE_WEBHOOK_SECRET=whsec_xxx
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import Stripe from 'https://esm.sh/stripe@14.22.0';

const stripe = new Stripe('sk_test_dummy', { apiVersion: '2024-06-20' });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper de espera para retries exponenciais curtos
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, 405);
  }

  try {
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) return json({ error: 'Missing STRIPE_WEBHOOK_SECRET' }, 500);

    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature') ?? req.headers.get('Stripe-Signature');
    if (!signature) return json({ error: 'Missing Stripe-Signature' }, 400);

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (e) {
      console.error('Webhook signature verification failed:', e);
      return json({ error: 'Invalid signature' }, 400);
    }

    // Apenas processamos quando o Checkout terminou com sucesso
    if (event.type !== 'checkout.session.completed') {
      return json({ ok: true, ignored: event.type }, 200);
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = (session.metadata?.orderId as string | undefined) ?? '';
    const tenantId = (session.metadata?.tenantId as string | undefined) ?? '';
    const sessionId = session.id;

    if (!orderId || !tenantId) {
      return json({ error: 'Missing orderId/tenantId in metadata' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // IDEMPOTÊNCIA: registra o evento e sai cedo se já foi processado
    const claim = await supabase.rpc('claim_webhook_event', {
      p_external_id: event.id,
      p_provider: 'stripe',
      p_order_id: orderId,
      p_tenant_id: tenantId,
      p_payload: event as any,
    });

    if (claim.error) {
      console.error('claim_webhook_event error', claim.error);
      return json({ error: 'Claim failed' }, 500);
    }
    if (claim.data === false) {
      // Webhook duplicado (já registrado). Encerramos de forma idempotente.
      return json({ ok: true, idempotent: true }, 200);
    }

    // Carrega order + checa idempotência
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, tenant_id, status, payment_provider, payment_intent_id, event_id')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) return json({ error: 'Order not found' }, 404);
    if (order.tenant_id !== tenantId) return json({ error: 'Tenant mismatch' }, 400);

    // Já processado?
    if (order.status === 'pago') {
      return json({ ok: true, idempotent: true }, 200);
    }

    // Confirma que este webhook vem do mesmo Checkout
    if (order.payment_intent_id && order.payment_intent_id !== sessionId) {
      console.warn('Payment session mismatch', { saved: order.payment_intent_id, got: sessionId });
    }

    // Busca itens do pedido + dados auxiliares (ticket_types.sector_id, lots estoque)
    const { data: items, error: itemsErr } = await supabase
      .from('order_items')
      .select('ticket_type_id, lot_id, tenant_id, quantity, unit_price')
      .eq('order_id', order.id);

    if (itemsErr || !items?.length) return json({ error: 'No order items found' }, 400);

    // Lotes envolvidos
    const lotIds = [...new Set(items.map((i) => i.lot_id))];
    const { data: lots, error: lotsErr } = await supabase
      .from('lots')
      .select('id, tenant_id, qtd_total, qtd_vendida')
      .in('id', lotIds);

    if (lotsErr) return json({ error: 'Failed to load lots' }, 500);

    // Verificação leve de estoque (não transacional)
    const lotsMap = new Map(lots?.map((l) => [l.id, l]) ?? []);
    const perLot: Record<string, number> = {};
    for (const it of items) {
      perLot[it.lot_id] = (perLot[it.lot_id] ?? 0) + Number(it.quantity);
    }
    for (const [lotId, inc] of Object.entries(perLot)) {
      const lot = lotsMap.get(lotId);
      if (!lot || lot.tenant_id !== tenantId) {
        return json({ error: `Lot not found or cross-tenant: ${lotId}` }, 400);
      }
      if (Number(lot.qtd_vendida) + inc > Number(lot.qtd_total)) {
        // Estoque insuficiente — cancela o pedido
        await supabase.from('orders').update({ status: 'cancelado' }).eq('id', order.id);
        return json({ error: 'Stock exceeded for lot', lotId }, 409);
      }
    }

    // Incrementa estoque dos lots com pequenos retries (idempotente por lot)
    for (const [lotId, inc] of Object.entries(perLot)) {
      let ok = false;
      let attempt = 0;

      while (!ok && attempt < 3) {
        attempt++;
        // Tenta via RPC (ideal); se não existir/der conflito, faz fallback
        const { error: upErr } = await supabase.rpc('increment_lot_safely', {
          p_lot_id: lotId,
          p_inc: inc,
        });

        if (!upErr) {
          ok = true;
          break;
        }

        // Fallback: UPDATE condicional leve
        const lot = lotsMap.get(lotId)!;
        const { error: updErr } = await supabase
          .from('lots')
          .update({
            qtd_vendida: (Number(lot.qtd_vendida) + Number(inc)),
          })
          .eq('id', lotId)
          .lte('qtd_vendida', lot.qtd_total);

        if (!updErr) {
          ok = true;
          break;
        }

        // Espera incremental: 100ms, 200ms
        if (attempt < 3) await sleep(100 * attempt);
      }

      if (!ok) {
        console.error('Failed to increment lot after retries', { lotId, inc });
        await supabase.from('orders').update({ status: 'cancelado' }).eq('id', order.id);
        // Loga auditoria de falha
        await supabase.from('audit_logs').insert({
          actor_id: null,
          tenant_id: order.tenant_id,
          acao: 'payment_failed_increment',
          alvo: order.id,
          dados: { provider: 'stripe', lotId, inc, event_id: event.id },
        });
        return json({ error: 'Failed to increment lot' }, 500);
      }
    }

    // Precisamos de sector_id para criar tickets
    const typeIds = [...new Set(items.map((i) => i.ticket_type_id))];
    const { data: types, error: typesErr } = await supabase
      .from('ticket_types')
      .select('id, sector_id, tenant_id')
      .in('id', typeIds);

    if (typesErr) return json({ error: 'Failed to load ticket types' }, 500);
    const typeMap = new Map(types?.map((t) => [t.id, t]) ?? []);

    // Emite tickets (placeholders — nome/cpf serão preenchidos depois no fluxo de nomeação)
    const ticketsPayload: any[] = [];
    for (const it of items) {
      const tt = typeMap.get(it.ticket_type_id);
      if (!tt || tt.tenant_id !== tenantId) {
        return json({ error: 'TicketType cross-tenant or missing' }, 400);
      }
      for (let k = 0; k < Number(it.quantity); k++) {
        ticketsPayload.push({
          order_id: order.id,
          ticket_type_id: it.ticket_type_id,
          sector_id: tt.sector_id,
          tenant_id: tenantId,
          nome_titular: 'Pendente',
          cpf_titular: '00000000000',
          status: 'emitido',
        });
      }
    }

    if (ticketsPayload.length) {
      const { error: tErr } = await supabase.from('tickets').insert(ticketsPayload);
      if (tErr) {
        console.error('Ticket emit error', tErr);
        // não desfazemos o pagamento; logamos e mantemos a ordem para tratativa manual
        return json({ error: 'Failed to emit tickets (manual intervention required)' }, 500);
      }
    }

    // Auditoria: tickets emitidos
    await supabase.from('audit_logs').insert({
      actor_id: null,
      tenant_id: tenantId,
      acao: 'tickets_emitted',
      alvo: order.id,
      dados: { provider: 'stripe', ticket_count: ticketsPayload.length, event_id: event.id },
    });

    // Marca pedido como pago
    await supabase
      .from('orders')
      .update({ status: 'pago', payment_provider: 'stripe' })
      .eq('id', order.id);

    // Auditoria: pagamento confirmado
    await supabase.from('audit_logs').insert({
      actor_id: null,
      tenant_id: order.tenant_id,
      acao: 'payment_succeeded',
      alvo: order.id,
      dados: { provider: 'stripe', event_id: event.id, session_id: sessionId, item_count: items.length },
    });

    // Marca o evento como processado (telemetria/observabilidade)
    await supabase
      .from('payment_webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('provider', 'stripe')
      .eq('external_event_id', event.id);

    return json({ ok: true, orderId: order.id }, 200);
  } catch (err) {
    console.error('webhooks-stripe error', err);
    return json({ error: (err as Error)?.message ?? 'unknown' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
