// supabase/functions/checkout-create/index.ts
// Cria order + order_items e inicia Checkout do Stripe (quando ativo)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import Stripe from 'https://esm.sh/stripe@14.22.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-tenant-id, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ItemInput = {
  ticketTypeId: string;
  lotId: string;
  quantity: number;
};

type Payload = {
  tenantId: string;
  eventId: string;
  items: ItemInput[];
  successUrl: string;
  cancelUrl: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    const body = (await req.json()) as Payload;

    // validação básica do payload
    if (
      !body?.tenantId ||
      !body?.eventId ||
      !Array.isArray(body.items) ||
      body.items.length === 0 ||
      !body.successUrl ||
      !body.cancelUrl
    ) {
      return json({ error: 'Invalid payload' }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // valida usuário
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return json({ error: 'Invalid user' }, 401);

    // carrega evento (garantia de que pertence ao tenant informado)
    const { data: eventRow, error: eventErr } = await supabase
      .from('events')
      .select('id, tenant_id, titulo, status')
      .eq('id', body.eventId)
      .single();

    if (eventErr || !eventRow || eventRow.tenant_id !== body.tenantId) {
      return json({ error: 'Event not found for tenant' }, 404);
    }

    // carrega lotes e tipos ligados aos itens (para preço e validação leve)
    const lotIds = [...new Set(body.items.map((i) => i.lotId))];
    const typeIds = [...new Set(body.items.map((i) => i.ticketTypeId))];

    const [{ data: lots, error: lotsErr }, { data: types, error: typesErr }] =
      await Promise.all([
        supabase
          .from('lots')
          .select('id, ticket_type_id, tenant_id, preco, qtd_total, qtd_vendida, inicio_vendas, fim_vendas')
          .in('id', lotIds),
        supabase
          .from('ticket_types')
          .select('id, event_id, tenant_id, nome')
          .in('id', typeIds),
      ]);

    if (lotsErr || typesErr) {
      return json({ error: 'Failed to load pricing data' }, 500);
    }

    // indexadores
    const lotsById = new Map(lots?.map((l) => [l.id, l]) ?? []);
    const typesById = new Map(types?.map((t) => [t.id, t]) ?? []);

    // cálculo do total e checagens leves (preço por lote)
    let total = 0;
    for (const it of body.items) {
      const lot = lotsById.get(it.lotId);
      const tt = typesById.get(it.ticketTypeId);
      if (!lot || !tt || lot.ticket_type_id !== it.ticketTypeId) {
        return json({ error: 'Invalid lot/ticketType combination' }, 422);
      }
      if (tt.event_id !== body.eventId) {
        return json({ error: 'Item does not belong to this event' }, 422);
      }
      if (lot.tenant_id !== body.tenantId || tt.tenant_id !== body.tenantId) {
        return json({ error: 'Cross-tenant item not allowed' }, 422);
      }
      if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
        return json({ error: 'Invalid quantity' }, 422);
      }
      const line = Number(lot.preco) * it.quantity;
      total += line;
    }

    // cria order (aguardando_pagto)
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        buyer_id: user.id,
        event_id: body.eventId,
        tenant_id: body.tenantId,
        total,
        status: 'aguardando_pagto',
        payment_provider: null, // setaremos abaixo
      })
      .select('id')
      .single();

    if (orderErr || !order) return json({ error: 'Failed to create order' }, 500);

    // grava order_items
    const orderItems = body.items.map((it) => {
      const lot = lotsById.get(it.lotId)!;
      return {
        order_id: order.id,
        ticket_type_id: it.ticketTypeId,
        lot_id: it.lotId,
        tenant_id: body.tenantId,
        quantity: it.quantity,
        unit_price: lot.preco,
      };
    });

    const { error: oiErr } = await supabase.from('order_items').insert(orderItems);
    if (oiErr) return json({ error: 'Failed to create order items' }, 500);

    // busca gateway ativo
    const { data: gw, error: gwErr } = await supabase
      .from('payment_gateways')
      .select('provider, is_active, credentials')
      .eq('tenant_id', body.tenantId)
      .eq('is_active', true)
      .maybeSingle();

    if (gwErr) return json({ error: 'Failed to load payment gateway' }, 500);
    if (!gw) {
      return json({ error: 'No active payment gateway for tenant' }, 422);
    }

    // Stripe
    if (gw.provider === 'stripe') {
      const secretKey = gw.credentials?.secretKey as string | undefined;
      if (!secretKey) return json({ error: 'Stripe not configured (secretKey)' }, 422);

      const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });

      // converte itens em line_items para o Checkout
      const line_items = body.items.map((it) => {
        const lot = lotsById.get(it.lotId)!;
        const tt = typesById.get(it.ticketTypeId)!;
        return {
          quantity: it.quantity,
          price_data: {
            currency: 'brl',
            unit_amount: Math.round(Number(lot.preco) * 100),
            product_data: {
              name: tt.nome,
              metadata: {
                tenantId: body.tenantId,
                eventId: body.eventId,
                ticketTypeId: it.ticketTypeId,
                lotId: it.lotId,
              },
            },
          },
        };
      });

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: body.successUrl + `?orderId=${order.id}`,
        cancel_url: body.cancelUrl + `?orderId=${order.id}`,
        line_items,
        metadata: {
          orderId: order.id,
          tenantId: body.tenantId,
          eventId: body.eventId,
          provider: 'stripe',
        },
      });

      // grava provider e payment_intent_id/checkout id
      await supabase
        .from('orders')
        .update({
          payment_provider: 'stripe',
          payment_intent_id: session.id,
        })
        .eq('id', order.id);

      return json({ orderId: order.id, checkoutUrl: session.url }, 200);
    }

    // providers ainda não implementados
    return json({ error: `Provider ${gw.provider} not implemented yet` }, 501);
  } catch (err) {
    console.error('checkout-create error', err);
    return json({ error: (err as Error)?.message ?? 'unknown' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
