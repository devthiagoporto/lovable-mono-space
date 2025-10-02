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

    const startTime = Date.now();
    console.log('Validating cart:', { tenantId, eventId, buyerCpf, itemCount: items.length });

    // Normalize and validate CPF
    const normalizedCpf = buyerCpf.replace(/\D/g, '');
    if (normalizedCpf.length !== 11 || !/^\d{11}$/.test(normalizedCpf)) {
      return new Response(
        JSON.stringify({
          ok: false,
          errors: [{ code: 'INVALID_CPF', message: 'CPF inválido. Deve conter 11 dígitos numéricos.' }],
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // BATCH QUERY 1: Load event with limits
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single();

    if (eventError || !event) {
      console.error('Event not found:', { eventId, tenantId, error: eventError });
      return new Response(
        JSON.stringify({
          ok: false,
          errors: [{ code: 'EVENT_NOT_FOUND', message: 'Evento não encontrado ou não pertence ao tenant informado.' }],
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const limits = event.regras_limite || {};
    console.log('Event limits loaded:', limits);

    // BATCH QUERY 2: Load lots, ticket types, and sectors in parallel
    const lotIds = items.map((i) => i.lotId);
    const ticketTypeIds = items.map((i) => i.ticketTypeId);
    
    const [lotsResult, ticketTypesResult] = await Promise.all([
      supabase.from('lots').select('*').in('id', lotIds),
      supabase.from('ticket_types').select('*, sectors(*)').in('id', ticketTypeIds),
    ]);

    const { data: lots, error: lotsError } = lotsResult;
    const { data: ticketTypes, error: typesError } = ticketTypesResult;

    if (lotsError || !lots || lots.length === 0) {
      console.error('Lots not found:', { lotIds, error: lotsError });
      return new Response(
        JSON.stringify({
          ok: false,
          errors: [{ code: 'LOTS_NOT_FOUND', message: 'Um ou mais lotes não foram encontrados.' }],
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typesError || !ticketTypes || ticketTypes.length === 0) {
      console.error('Ticket types not found:', { ticketTypeIds, error: typesError });
      return new Response(
        JSON.stringify({
          ok: false,
          errors: [{ code: 'TYPES_NOT_FOUND', message: 'Um ou mais tipos de ingresso não foram encontrados.' }],
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Batch queries completed:', {
      lotsCount: lots.length,
      typesCount: ticketTypes.length,
      elapsed: Date.now() - startTime,
    });

    // Aggregate quantities first
    const now = new Date();
    const clockSkewSeconds = 60;
    let totalQuantity = 0;
    const quantityByType: Record<string, number> = {};
    const quantityByLot: Record<string, number> = {};
    const quantityBySector: Record<string, number> = {};

    // First pass: aggregate quantities
    for (const item of items) {
      if (item.quantity <= 0) {
        errors.push({
          code: 'INVALID_QUANTITY',
          lotId: item.lotId,
          message: 'Quantidade deve ser maior que zero',
        });
        continue;
      }

      totalQuantity += item.quantity;
      quantityByType[item.ticketTypeId] = (quantityByType[item.ticketTypeId] || 0) + item.quantity;
      quantityByLot[item.lotId] = (quantityByLot[item.lotId] || 0) + item.quantity;
    }

    // Validate each item
    for (const item of items) {
      const lot = lots.find((l) => l.id === item.lotId);
      if (!lot) {
        errors.push({
          code: 'LOT_NOT_FOUND',
          lotId: item.lotId,
          message: `Lote não encontrado: ${item.lotId}`,
        });
        continue;
      }

      const ticketType = ticketTypes.find((t) => t.id === item.ticketTypeId);
      if (!ticketType) {
        errors.push({
          code: 'TYPE_NOT_FOUND',
          ticketTypeId: item.ticketTypeId,
          message: `Tipo de ingresso não encontrado: ${item.ticketTypeId}`,
        });
        continue;
      }

      // Validate lot belongs to ticket type
      if (lot.ticket_type_id !== item.ticketTypeId) {
        errors.push({
          code: 'LOT_TYPE_MISMATCH',
          lotId: lot.id,
          ticketTypeId: item.ticketTypeId,
          message: `Lote ${lot.nome} não pertence ao tipo de ingresso informado`,
        });
        continue;
      }

      // Aggregate by sector
      const sector = ticketType.sectors;
      if (sector) {
        quantityBySector[sector.id] = (quantityBySector[sector.id] || 0) + item.quantity;
      }

      // RULE 1: Check sales window
      if (lot.inicio_vendas) {
        const startDate = new Date(lot.inicio_vendas);
        startDate.setSeconds(startDate.getSeconds() - clockSkewSeconds);
        if (now < startDate) {
          errors.push({
            code: 'LOTE_FORA_DA_JANELA',
            lotId: lot.id,
            message: `Lote "${lot.nome}" ainda não está disponível para venda. Início: ${new Date(lot.inicio_vendas).toLocaleString('pt-BR')}`,
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
            message: `Lote "${lot.nome}" não está mais disponível para venda. Fim: ${new Date(lot.fim_vendas).toLocaleString('pt-BR')}`,
          });
        }
      }

      // RULE 2: Check stock availability
      const available = lot.qtd_total - lot.qtd_vendida;
      if (item.quantity > available) {
        errors.push({
          code: 'LOTE_SEM_ESTOQUE',
          lotId: lot.id,
          message: `Lote "${lot.nome}" não tem estoque suficiente. Disponível: ${available}, solicitado: ${item.quantity}`,
        });
      }
    }

    // RULE 3: Check max per type per order (aggregate validation)
    for (const [typeId, qty] of Object.entries(quantityByType)) {
      const ticketType = ticketTypes.find((t) => t.id === typeId);
      if (ticketType && ticketType.max_por_pedido && qty > ticketType.max_por_pedido) {
        errors.push({
          code: 'LIMIT_MAX_POR_TIPO_POR_PEDIDO',
          ticketTypeId: typeId,
          message: `Quantidade máxima por pedido para "${ticketType.nome}" é ${ticketType.max_por_pedido}. Você está tentando comprar ${qty}.`,
        });
      }
    }

    // RULE 4: Check total limit per order
    if (limits.maxTotalPorPedido && totalQuantity > limits.maxTotalPorPedido) {
      errors.push({
        code: 'LIMIT_MAX_TOTAL_POR_PEDIDO',
        message: `Quantidade máxima total por pedido é ${limits.maxTotalPorPedido}. Você está tentando comprar ${totalQuantity}.`,
      });
    }

    // BATCH QUERY 3: Check CPF purchase history (only paid orders)
    const cpfCheckStart = Date.now();
    const { data: paidTickets, error: cpfError } = await supabase
      .from('tickets')
      .select('ticket_type_id, orders!inner(status, event_id)')
      .eq('cpf_titular', normalizedCpf)
      .eq('orders.event_id', eventId)
      .eq('orders.status', 'pago');

    if (cpfError) {
      console.error('Error fetching CPF history:', cpfError);
    }

    console.log('CPF history check completed:', {
      elapsed: Date.now() - cpfCheckStart,
      ticketsFound: paidTickets?.length || 0,
    });

    const ticketsByCpfByType: Record<string, number> = {};
    let totalTicketsByCpf = 0;

    if (paidTickets) {
      for (const ticket of paidTickets) {
        ticketsByCpfByType[ticket.ticket_type_id] = (ticketsByCpfByType[ticket.ticket_type_id] || 0) + 1;
        totalTicketsByCpf++;
      }
    }

    // RULE 5: Check max per CPF per type
    if (limits.maxPorCPFPorTipo) {
      for (const [typeId, qty] of Object.entries(quantityByType)) {
        const current = ticketsByCpfByType[typeId] || 0;
        if (current + qty > limits.maxPorCPFPorTipo) {
          const ticketType = ticketTypes.find((t) => t.id === typeId);
          errors.push({
            code: 'LIMIT_MAX_POR_CPF_POR_TIPO',
            ticketTypeId: typeId,
            message: `CPF já possui ${current} ingresso(s) do tipo "${ticketType?.nome || typeId}". Limite: ${limits.maxPorCPFPorTipo}. Tentando adicionar: ${qty}.`,
          });
        }
      }
    }

    // RULE 6: Check max per CPF in event
    if (limits.maxPorCPFNoEvento && totalTicketsByCpf + totalQuantity > limits.maxPorCPFNoEvento) {
      errors.push({
        code: 'LIMIT_MAX_POR_CPF_NO_EVENTO',
        message: `CPF já possui ${totalTicketsByCpf} ingresso(s) neste evento. Limite total: ${limits.maxPorCPFNoEvento}. Tentando adicionar: ${totalQuantity}.`,
      });
    }

    // Check sector capacity (WARNING only, does not block)
    for (const [sectorId, qty] of Object.entries(quantityBySector)) {
      const ticketType = ticketTypes.find((t) => t.sectors?.id === sectorId);
      if (ticketType && ticketType.sectors) {
        const sector = ticketType.sectors;
        
        // Get all lots for this sector to calculate total allocation
        const { data: sectorLots } = await supabase
          .from('lots')
          .select('qtd_total, ticket_types!inner(sector_id)')
          .eq('ticket_types.sector_id', sectorId);

        if (sectorLots) {
          const totalAllocated = sectorLots.reduce((sum, lot) => sum + lot.qtd_total, 0);
          if (totalAllocated > sector.capacidade) {
            warnings.push(
              `Atenção: O setor "${sector.nome}" tem capacidade de ${sector.capacidade}, mas ${totalAllocated} ingressos foram alocados nos lotes. A capacidade pode ser excedida.`
            );
          }
        }
      }
    }

    // If there are errors, return them
    if (errors.length > 0) {
      console.log('Validation failed with errors:', {
        errorCount: errors.length,
        errors: errors.map((e) => e.code),
        elapsed: Date.now() - startTime,
      });
      return new Response(
        JSON.stringify({ ok: false, errors }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Success response
    const totalElapsed = Date.now() - startTime;
    console.log('Validation successful:', {
      totalItems: totalQuantity,
      warningCount: warnings.length,
      elapsed: totalElapsed,
    });

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
