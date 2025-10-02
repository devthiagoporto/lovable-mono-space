import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CartItem {
  ticketTypeId: string;
  lotId: string;
  quantity: number;
}

interface CartValidationRequest {
  tenantId: string;
  eventId: string;
  buyerCpf: string;
  items: CartItem[];
}

interface ValidationError {
  code: string;
  message: string;
  ticketTypeId?: string;
  lotId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: CartValidationRequest = await req.json();
    const { tenantId, eventId, buyerCpf, items } = body;

    console.log('Validating cart:', { tenantId, eventId, buyerCpf, itemCount: items.length });

    // Normalize CPF
    const normalizedCpf = buyerCpf.replace(/\D/g, '');
    if (normalizedCpf.length !== 11) {
      return new Response(
        JSON.stringify({
          ok: false,
          errors: [{ code: 'INVALID_CPF', message: 'CPF inválido' }],
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Load event with limits
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({
          ok: false,
          errors: [{ code: 'EVENT_NOT_FOUND', message: 'Evento não encontrado' }],
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const limits = event.regras_limite || {};

    // Load lots and ticket types
    const lotIds = items.map((i) => i.lotId);
    const { data: lots, error: lotsError } = await supabase
      .from('lots')
      .select('*')
      .in('id', lotIds);

    if (lotsError || !lots) {
      return new Response(
        JSON.stringify({
          ok: false,
          errors: [{ code: 'LOTS_NOT_FOUND', message: 'Lotes não encontrados' }],
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ticketTypeIds = items.map((i) => i.ticketTypeId);
    const { data: ticketTypes, error: typesError } = await supabase
      .from('ticket_types')
      .select('*')
      .in('id', ticketTypeIds);

    if (typesError || !ticketTypes) {
      return new Response(
        JSON.stringify({
          ok: false,
          errors: [{ code: 'TYPES_NOT_FOUND', message: 'Tipos de ingresso não encontrados' }],
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate each item
    const now = new Date();
    const clockSkewSeconds = 60;
    let totalQuantity = 0;
    const quantityByType: Record<string, number> = {};
    const quantityByLot: Record<string, number> = {};

    for (const item of items) {
      totalQuantity += item.quantity;
      quantityByType[item.ticketTypeId] = (quantityByType[item.ticketTypeId] || 0) + item.quantity;
      quantityByLot[item.lotId] = (quantityByLot[item.lotId] || 0) + item.quantity;

      const lot = lots.find((l) => l.id === item.lotId);
      if (!lot) {
        errors.push({ code: 'LOT_NOT_FOUND', lotId: item.lotId, message: `Lote ${item.lotId} não encontrado` });
        continue;
      }

      // Check sales window
      if (lot.inicio_vendas) {
        const startDate = new Date(lot.inicio_vendas);
        startDate.setSeconds(startDate.getSeconds() - clockSkewSeconds);
        if (now < startDate) {
          errors.push({
            code: 'LOTE_FORA_DA_JANELA',
            lotId: lot.id,
            message: `Lote ${lot.nome} ainda não está disponível para venda`,
          });
        }
      }

      if (lot.fim_vendas) {
        const endDate = new Date(lot.fim_vendas);
        endDate.setSeconds(endDate.getSeconds() + clockSkewSeconds);
        if (now > endDate) {
          errors.push({
            code: 'LOTE_FORA_DA_JANELA',
            lotId: lot.id,
            message: `Lote ${lot.nome} não está mais disponível para venda`,
          });
        }
      }

      // Check stock
      const available = lot.qtd_total - lot.qtd_vendida;
      if (item.quantity > available) {
        errors.push({
          code: 'LOTE_SEM_ESTOQUE',
          lotId: lot.id,
          message: `Lote ${lot.nome} não tem estoque suficiente (disponível: ${available})`,
        });
      }

      // Check ticket type limits
      const ticketType = ticketTypes.find((t) => t.id === item.ticketTypeId);
      if (ticketType && ticketType.max_por_pedido && item.quantity > ticketType.max_por_pedido) {
        errors.push({
          code: 'LIMIT_MAX_POR_TIPO_POR_PEDIDO',
          ticketTypeId: ticketType.id,
          message: `Quantidade máxima por pedido para ${ticketType.nome} é ${ticketType.max_por_pedido}`,
        });
      }
    }

    // Check total limit per order
    if (limits.maxTotalPorPedido && totalQuantity > limits.maxTotalPorPedido) {
      errors.push({
        code: 'LIMIT_MAX_TOTAL_POR_PEDIDO',
        message: `Quantidade máxima total por pedido é ${limits.maxTotalPorPedido}`,
      });
    }

    // Check CPF limits
    const { data: paidTickets } = await supabase
      .from('tickets')
      .select('ticket_type_id, orders!inner(status)')
      .eq('cpf_titular', normalizedCpf)
      .eq('orders.event_id', eventId)
      .eq('orders.status', 'pago');

    const ticketsByCpfByType: Record<string, number> = {};
    let totalTicketsByCpf = 0;

    if (paidTickets) {
      for (const ticket of paidTickets) {
        ticketsByCpfByType[ticket.ticket_type_id] = (ticketsByCpfByType[ticket.ticket_type_id] || 0) + 1;
        totalTicketsByCpf++;
      }
    }

    // Check max per CPF per type
    if (limits.maxPorCPFPorTipo) {
      for (const [typeId, qty] of Object.entries(quantityByType)) {
        const current = ticketsByCpfByType[typeId] || 0;
        if (current + qty > limits.maxPorCPFPorTipo) {
          const ticketType = ticketTypes.find((t) => t.id === typeId);
          errors.push({
            code: 'LIMIT_MAX_POR_CPF_POR_TIPO',
            ticketTypeId: typeId,
            message: `CPF já possui ${current} ingressos do tipo ${ticketType?.nome || typeId}. Limite: ${limits.maxPorCPFPorTipo}`,
          });
        }
      }
    }

    // Check max per CPF in event
    if (limits.maxPorCPFNoEvento && totalTicketsByCpf + totalQuantity > limits.maxPorCPFNoEvento) {
      errors.push({
        code: 'LIMIT_MAX_POR_CPF_NO_EVENTO',
        message: `CPF já possui ${totalTicketsByCpf} ingressos neste evento. Limite: ${limits.maxPorCPFNoEvento}`,
      });
    }

    // If there are errors, return them
    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ ok: false, errors }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Success response
    return new Response(
      JSON.stringify({
        ok: true,
        summary: {
          totalItems: totalQuantity,
          byType: Object.entries(quantityByType).map(([ticketTypeId, qty]) => ({ ticketTypeId, qty })),
          byLot: Object.entries(quantityByLot).map(([lotId, qty]) => ({ lotId, qty })),
          warnings,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Cart validation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        ok: false,
        errors: [{ code: 'INTERNAL_ERROR', message: `Erro interno: ${errorMessage}` }],
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
