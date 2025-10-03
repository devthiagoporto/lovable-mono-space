import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@17.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
};

interface CheckoutItem {
  ticketTypeId: string;
  lotId: string;
  quantity: number;
}

interface CheckoutPayload {
  eventId: string;
  items: CheckoutItem[];
  successUrl: string;
  cancelUrl: string;
  buyerEmail?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');
    const tenantId = req.headers.get('x-tenant-id');

    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    if (!tenantId) {
      throw new Error('Missing x-tenant-id header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Invalid token or user not found');
    }

    // Parse payload
    const payload: CheckoutPayload = await req.json();
    const { eventId, items, successUrl, cancelUrl, buyerEmail } = payload;

    if (!eventId || !items || items.length === 0) {
      throw new Error('Invalid payload: missing eventId or items');
    }

    // Check active payment gateway
    const { data: gateways, error: gwError } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .single();

    if (gwError || !gateways) {
      throw new Error('No active payment gateway found for this tenant');
    }

    // Only Stripe supported in this phase
    if (gateways.provider !== 'stripe') {
      return new Response(
        JSON.stringify({ ok: false, message: 'Provider not implemented yet' }),
        { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load lots and ticket types
    const lotIds = items.map((i) => i.lotId);
    const { data: lots, error: lotsError } = await supabase
      .from('lots')
      .select('*, ticket_types!inner(*)')
      .in('id', lotIds);

    if (lotsError || !lots || lots.length === 0) {
      throw new Error('Failed to load lots or ticket types');
    }

    // Calculate total and validate stock
    let totalCents = 0;
    const lineItems: any[] = [];

    for (const item of items) {
      const lot = lots.find((l) => l.id === item.lotId);
      if (!lot) {
        throw new Error(`Lot ${item.lotId} not found`);
      }

      // Check stock
      const available = lot.qtd_total - lot.qtd_vendida;
      if (available < item.quantity) {
        throw new Error(`Insufficient stock for lot ${lot.nome}`);
      }

      const priceInCents = Math.round(parseFloat(lot.preco) * 100);
      totalCents += priceInCents * item.quantity;

      lineItems.push({
        price_data: {
          currency: 'brl',
          product_data: {
            name: `${lot.ticket_types.nome} - ${lot.nome}`,
          },
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
      console.error('Order creation error:', orderError);
      throw new Error('Failed to create order');
    }

    console.log('Order created:', order.id);

    // Initialize Stripe
    const stripeSecretKey = gateways.config?.secretKey;
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl.replace('{ORDER_ID}', order.id),
      cancel_url: cancelUrl,
      client_reference_id: order.id,
      customer_email: buyerEmail || user.email,
      metadata: {
        order_id: order.id,
        tenant_id: tenantId,
      },
    });

    // Update order with payment_intent_id
    await supabase
      .from('orders')
      .update({ payment_intent_id: session.id })
      .eq('id', order.id);

    console.log('Stripe session created:', session.id);

    return new Response(
      JSON.stringify({
        ok: true,
        checkoutUrl: session.url,
        orderId: order.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in checkout-create:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
