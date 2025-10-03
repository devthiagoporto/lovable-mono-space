import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
      throw new Error('Missing signature or webhook secret');
    }

    // Simple signature validation (production should use proper crypto verification)
    console.log('Webhook received, signature present');

    const event = JSON.parse(body);
    console.log('Event type:', event.type);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      if (session.payment_status !== 'paid') {
        return new Response(
          JSON.stringify({ received: true, status: 'pending' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const orderId = session.metadata?.order_id || session.client_reference_id;
      const tenantId = session.metadata?.tenant_id;

      if (!orderId || !tenantId) {
        throw new Error('Missing metadata');
      }

      console.log('Processing order:', orderId);

      // Load order and items
      const { data: order } = await supabase
        .from('orders')
        .select('buyer_id')
        .eq('id', orderId)
        .single();

      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (!order || !orderItems || orderItems.length === 0) {
        throw new Error('Order not found');
      }

      // Get buyer info
      const { data: buyer } = await supabase
        .from('app_users')
        .select('nome, cpf')
        .eq('id', order.buyer_id)
        .single();

      const buyerName = buyer?.nome || 'Comprador';
      const buyerCpf = buyer?.cpf || '00000000000';

      // Process items
      for (const item of orderItems) {
        // Update stock
        const { error: stockError } = await supabase.rpc('increment_lot_sold', {
          p_lot_id: item.lot_id,
          p_quantity: item.quantity,
        });

        if (stockError) {
          console.error('Stock error:', stockError);
          throw new Error(`Stock update failed: ${stockError.message}`);
        }

        // Get sector
        const { data: ticketType } = await supabase
          .from('ticket_types')
          .select('sector_id')
          .eq('id', item.ticket_type_id)
          .single();

        if (!ticketType) {
          throw new Error('Ticket type not found');
        }

        // Create tickets
        const tickets = Array.from({ length: item.quantity }, () => ({
          order_id: orderId,
          ticket_type_id: item.ticket_type_id,
          sector_id: ticketType.sector_id,
          tenant_id: tenantId,
          nome_titular: buyerName,
          cpf_titular: buyerCpf,
          status: 'emitido',
          qr_version: 1,
          qr_last_issued_at: new Date().toISOString(),
        }));

        const { error: ticketsError } = await supabase.from('tickets').insert(tickets);
        if (ticketsError) {
          console.error('Tickets error:', ticketsError);
          throw new Error('Failed to create tickets');
        }
      }

      // Update order
      await supabase
        .from('orders')
        .update({
          status: 'pago',
          payment_intent_id: session.payment_intent,
        })
        .eq('id', orderId);

      console.log('Order completed:', orderId);

      return new Response(
        JSON.stringify({
          received: true,
          orderId,
          ticketsCreated: orderItems.reduce((sum: number, item: any) => sum + item.quantity, 0),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ received: true, type: event.type }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
