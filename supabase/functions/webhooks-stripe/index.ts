import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@17.5.0';

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
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeWebhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    // Get raw body and signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    // Initialize Stripe (we need a dummy key just to construct the event)
    const stripe = new Stripe('sk_test_dummy', {
      apiVersion: '2024-12-18.acacia',
    });

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Received Stripe event:', event.type);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Only process if payment is completed
      if (session.payment_status !== 'paid') {
        console.log('Payment not completed yet, skipping');
        return new Response(
          JSON.stringify({ received: true, status: 'pending' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const orderId = session.metadata?.order_id || session.client_reference_id;
      const tenantId = session.metadata?.tenant_id;

      if (!orderId || !tenantId) {
        console.error('Missing order_id or tenant_id in session metadata');
        return new Response(
          JSON.stringify({ error: 'Missing required metadata' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Processing payment for order:', orderId);

      try {
        // Load order and order_items
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('*, buyer_id')
          .eq('id', orderId)
          .single();

        if (orderError || !order) {
          throw new Error('Order not found');
        }

        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId);

        if (itemsError || !orderItems || orderItems.length === 0) {
          throw new Error('Order items not found');
        }

        // Get buyer info
        const { data: buyer, error: buyerError } = await supabase
          .from('app_users')
          .select('nome, cpf')
          .eq('id', order.buyer_id)
          .single();

        const buyerName = buyer?.nome || 'Comprador';
        const buyerCpf = buyer?.cpf || '00000000000';

        console.log('Buyer info loaded:', { buyerName, buyerCpf });

        // Process each item: update stock and create tickets
        for (const item of orderItems) {
          console.log(`Processing item: lot ${item.lot_id}, quantity ${item.quantity}`);

          // Update lot stock atomically using RPC
          try {
            const { error: stockError } = await supabase.rpc('increment_lot_sold', {
              p_lot_id: item.lot_id,
              p_quantity: item.quantity,
            });

            if (stockError) {
              console.error('Stock update error:', stockError);
              throw new Error(`Failed to update stock: ${stockError.message}`);
            }

            console.log(`Stock updated for lot ${item.lot_id}`);
          } catch (error) {
            console.error('Error updating stock:', error);
            throw error;
          }

          // Get sector_id from ticket_type
          const { data: ticketType, error: ttError } = await supabase
            .from('ticket_types')
            .select('sector_id')
            .eq('id', item.ticket_type_id)
            .single();

          if (ttError || !ticketType) {
            throw new Error(`Ticket type ${item.ticket_type_id} not found`);
          }

          // Create tickets (one per unit)
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

          const { error: ticketsError } = await supabase
            .from('tickets')
            .insert(tickets);

          if (ticketsError) {
            console.error('Tickets creation error:', ticketsError);
            throw new Error('Failed to create tickets');
          }

          console.log(`Created ${item.quantity} tickets for item ${item.id}`);
        }

        // Update order status to paid
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status: 'pago',
            payment_intent_id: session.payment_intent as string,
          })
          .eq('id', orderId);

        if (updateError) {
          console.error('Failed to update order:', updateError);
          throw new Error('Failed to update order status');
        }

        console.log('Order marked as paid with tickets issued:', orderId);

        return new Response(
          JSON.stringify({ 
            received: true, 
            orderId,
            ticketsCreated: orderItems.reduce((sum, item) => sum + item.quantity, 0)
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        console.error('Error processing payment:', error);
        // Log the error but return 200 to acknowledge webhook
        // Stripe will retry if we return error status
        return new Response(
          JSON.stringify({ 
            received: true, 
            error: error.message,
            orderId 
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // For other events, just acknowledge
    return new Response(
      JSON.stringify({ received: true, type: event.type }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in webhooks-stripe:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
