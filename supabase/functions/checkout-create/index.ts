import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');
    const tenantId = req.headers.get('x-tenant-id');

    if (!authHeader || !tenantId) {
      throw new Error('Missing required headers');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Invalid token');
    }

    const payload = await req.json();
    const { eventId, items, successUrl, cancelUrl, buyerEmail } = payload;

    if (!eventId || !items || items.length === 0) {
      throw new Error('Invalid payload');
    }

    // Check active payment gateway
    const { data: gateway, error: gwError } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .single();

    if (gwError || !gateway) {
      throw new Error('No active payment gateway');
    }

    if (gateway.provider !== 'stripe') {
      return new Response(
        JSON.stringify({ ok: false, message: 'Provider not implemented yet' }),
        { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load lots
    const lotIds = items.map((i: any) => i.lotId);
    const { data: lots, error: lotsError } = await supabase
      .from('lots')
      .select('*, ticket_types!inner(*)')
      .in('id', lotIds);

    if (lotsError || !lots || lots.length === 0) {
      throw new Error('Failed to load lots');
    }

    // Calculate total
    let totalCents = 0;
    const lineItems: any[] = [];

    for (const item of items) {
      const lot = lots.find((l: any) => l.id === item.lotId);
      if (!lot) throw new Error(`Lot ${item.lotId} not found`);

      const available = lot.qtd_total - lot.qtd_vendida;
      if (available < item.quantity) {
        throw new Error(`Insufficient stock for lot ${lot.nome}`);
      }

      const priceInCents = Math.round(parseFloat(lot.preco) * 100);
      totalCents += priceInCents * item.quantity;

      lineItems.push({
        price_data: {
          currency: 'brl',
          product_data: { name: `${lot.ticket_types.nome} - ${lot.nome}` },
          unit_amount: priceInCents,
        },
        quantity: item.quantity,
      });
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        tenant_id: tenantId,
        event_id: eventId,
        buyer_id: user.id,
        status: 'aguardando_pagto',
        total: totalCents / 100,
        payment_provider: 'stripe',
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error('Failed to create order');
    }

    // Create order_items
    const orderItems = items.map((item: any) => {
      const lot = lots.find((l: any) => l.id === item.lotId)!;
      return {
        order_id: order.id,
        tenant_id: tenantId,
        event_id: eventId,
        ticket_type_id: item.ticketTypeId,
        lot_id: item.lotId,
        quantity: item.quantity,
        unit_price: parseFloat(lot.preco),
      };
    });

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) {
      await supabase.from('orders').delete().eq('id', order.id);
      throw new Error('Failed to create order items');
    }

    // Create Stripe session using fetch
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gateway.config.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'success_url': successUrl.replace('{ORDER_ID}', order.id),
        'cancel_url': cancelUrl,
        'client_reference_id': order.id,
        'customer_email': buyerEmail || user.email || '',
        'metadata[order_id]': order.id,
        'metadata[tenant_id]': tenantId,
        ...lineItems.reduce((acc: any, item, idx) => {
          acc[`line_items[${idx}][price_data][currency]`] = item.price_data.currency;
          acc[`line_items[${idx}][price_data][product_data][name]`] = item.price_data.product_data.name;
          acc[`line_items[${idx}][price_data][unit_amount]`] = item.price_data.unit_amount.toString();
          acc[`line_items[${idx}][quantity]`] = item.quantity.toString();
          return acc;
        }, {}),
      }),
    });

    if (!stripeResponse.ok) {
      const error = await stripeResponse.text();
      throw new Error(`Stripe error: ${error}`);
    }

    const session = await stripeResponse.json();

    await supabase.from('orders').update({ payment_intent_id: session.id }).eq('id', order.id);

    return new Response(
      JSON.stringify({ ok: true, checkoutUrl: session.url, orderId: order.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
