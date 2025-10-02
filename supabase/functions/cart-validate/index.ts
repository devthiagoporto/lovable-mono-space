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
  couponCodes?: string[];
}

interface ValidationError {
  code: string;
  message: string;
  ticketTypeId?: string;
  lotId?: string;
  couponCode?: string;
}

interface Discount {
  code: string;
  amount: number;
  appliedTo: string[];
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
    const { tenantId, eventId, buyerCpf, items, couponCodes = [] } = body;

    const startTime = Date.now();
    console.log('Validating cart:', { tenantId, eventId, buyerCpf, itemCount: items.length, couponCodes });

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

    // BATCH QUERY 2: Load lots, ticket types, and coupons in parallel
    const lotIds = items.map((i) => i.lotId);
    const ticketTypeIds = items.map((i) => i.ticketTypeId);
    
    const queries = [
      supabase.from('lots').select('*').in('id', lotIds),
      supabase.from('ticket_types').select('*, sectors(*)').in('id', ticketTypeIds),
    ];

    // Load coupons if provided
    if (couponCodes.length > 0) {
      queries.push(
        supabase.from('coupons')
          .select('*')
          .eq('event_id', eventId)
          .eq('ativo', true)
          .in('codigo', couponCodes.map(c => c.toUpperCase()))
      );
    }

    const results = await Promise.all(queries);
    const { data: lots, error: lotsError } = results[0];
    const { data: ticketTypes, error: typesError } = results[1];
    const coupons = couponCodes.length > 0 ? results[2].data : [];

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
      couponsFound: coupons?.length || 0,
      elapsed: Date.now() - startTime,
    });

    // Validate coupons exist
    if (couponCodes.length > 0 && (!coupons || coupons.length !== couponCodes.length)) {
      const foundCodes = (coupons || []).map((c: any) => c.codigo);
      const missingCodes = couponCodes.filter(code => !foundCodes.includes(code.toUpperCase()));
      missingCodes.forEach(code => {
        errors.push({
          code: 'COUPON_NOT_FOUND',
          couponCode: code,
          message: `Cupom "${code}" não encontrado ou inativo.`,
        });
      });
    }

    // Aggregate quantities first
    const now = new Date();
    const clockSkewSeconds = 60;
    let totalQuantity = 0;
    const quantityByType: Record<string, number> = {};
    const quantityByLot: Record<string, number> = {};
    const quantityBySector: Record<string, number> = {};

    // Calculate subtotal by type
    const subtotalByType: Record<string, number> = {};

    // First pass: aggregate quantities and calculate subtotals
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

      // Calculate subtotal
      const lot = lots.find((l: any) => l.id === item.lotId);
      if (lot) {
        subtotalByType[item.ticketTypeId] = (subtotalByType[item.ticketTypeId] || 0) + (lot.preco * item.quantity);
      }
    }

    // Validate each item (stock, windows, etc.)
    for (const item of items) {
      const lot = lots.find((l: any) => l.id === item.lotId);
      if (!lot) {
        errors.push({
          code: 'LOT_NOT_FOUND',
          lotId: item.lotId,
          message: `Lote não encontrado: ${item.lotId}`,
        });
        continue;
      }

      const ticketType = ticketTypes.find((t: any) => t.id === item.ticketTypeId);
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
      const ticketType = ticketTypes.find((t: any) => t.id === typeId);
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
          const ticketType = ticketTypes.find((t: any) => t.id === typeId);
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
      const ticketType = ticketTypes.find((t: any) => t.sectors?.id === sectorId);
      if (ticketType && ticketType.sectors) {
        const sector = ticketType.sectors;
        
        const { data: sectorLots } = await supabase
          .from('lots')
          .select('qtd_total, ticket_types!inner(sector_id)')
          .eq('ticket_types.sector_id', sectorId);

        if (sectorLots) {
          const totalAllocated = sectorLots.reduce((sum: number, lot: any) => sum + lot.qtd_total, 0);
          if (totalAllocated > sector.capacidade) {
            warnings.push(
              `Atenção: O setor "${sector.nome}" tem capacidade de ${sector.capacidade}, mas ${totalAllocated} ingressos foram alocados nos lotes. A capacidade pode ser excedida.`
            );
          }
        }
      }
    }

    // ===== COUPON VALIDATION AND DISCOUNT CALCULATION =====
    const discounts: Discount[] = [];
    let totalSubtotal = Object.values(subtotalByType).reduce((sum, val) => sum + val, 0);
    
    if (coupons && coupons.length > 0) {
      // Check combinability
      const nonCombinable = coupons.filter((c: any) => !c.combinavel);
      if (nonCombinable.length > 1) {
        errors.push({
          code: 'COUPON_NOT_COMBINABLE',
          message: `Os cupons ${nonCombinable.map((c: any) => c.codigo).join(', ')} não são combináveis entre si.`,
        });
      }

      if (nonCombinable.length > 0 && coupons.length > 1 && nonCombinable.length < coupons.length) {
        errors.push({
          code: 'COUPON_NOT_COMBINABLE',
          message: `O cupom ${nonCombinable[0].codigo} não é combinável com outros cupons.`,
        });
      }

      // BATCH QUERY: Load coupon usage by CPF for limit check
      const couponIds = coupons.map((c: any) => c.id);
      const { data: couponUsageData } = await supabase
        .from('coupon_usage')
        .select('coupon_id')
        .eq('cpf', normalizedCpf)
        .in('coupon_id', couponIds);

      const usageByCoupon: Record<string, number> = {};
      if (couponUsageData) {
        for (const usage of couponUsageData) {
          usageByCoupon[usage.coupon_id] = (usageByCoupon[usage.coupon_id] || 0) + 1;
        }
      }

      // Validate and calculate discounts for each coupon
      for (const coupon of coupons as any[]) {
        // Check total limit
        if (coupon.limites?.limiteTotal && coupon.uso_total >= coupon.limites.limiteTotal) {
          errors.push({
            code: 'COUPON_LIMIT_EXCEEDED',
            couponCode: coupon.codigo,
            message: `Cupom "${coupon.codigo}" atingiu o limite de usos (${coupon.limites.limiteTotal}).`,
          });
          continue;
        }

        // Check CPF limit
        if (coupon.limites?.limitePorCPF) {
          const currentUsage = usageByCoupon[coupon.id] || 0;
          if (currentUsage >= coupon.limites.limitePorCPF) {
            errors.push({
              code: 'COUPON_CPF_LIMIT_EXCEEDED',
              couponCode: coupon.codigo,
              message: `Você já utilizou o cupom "${coupon.codigo}" o número máximo de vezes (${coupon.limites.limitePorCPF}).`,
            });
            continue;
          }
        }

        // Determine which types are eligible (whitelist)
        const eligibleTypes = coupon.limites?.whitelistTipos?.length > 0
          ? coupon.limites.whitelistTipos
          : Object.keys(quantityByType);

        const appliedTo: string[] = [];
        let discountAmount = 0;

        // Calculate discount based on type
        if (coupon.tipo === 'cortesia') {
          // Cortesia: zero out eligible items
          for (const typeId of eligibleTypes) {
            if (subtotalByType[typeId]) {
              discountAmount += subtotalByType[typeId];
              appliedTo.push(typeId);
            }
          }
        } else {
          // Calculate eligible subtotal
          let eligibleSubtotal = 0;
          for (const typeId of eligibleTypes) {
            if (subtotalByType[typeId]) {
              eligibleSubtotal += subtotalByType[typeId];
              appliedTo.push(typeId);
            }
          }

          if (coupon.tipo === 'percentual') {
            discountAmount = (eligibleSubtotal * coupon.valor) / 100;
          } else if (coupon.tipo === 'valor') {
            discountAmount = Math.min(coupon.valor, eligibleSubtotal);
          }
        }

        if (appliedTo.length > 0) {
          discounts.push({
            code: coupon.codigo,
            amount: discountAmount,
            appliedTo,
          });
        } else {
          warnings.push(`Cupom "${coupon.codigo}" não se aplica a nenhum item do carrinho.`);
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

    // Calculate final total
    const totalDiscount = discounts.reduce((sum, d) => sum + d.amount, 0);
    const finalTotal = Math.max(0, totalSubtotal - totalDiscount);

    // Success response
    const totalElapsed = Date.now() - startTime;
    console.log('Validation successful:', {
      totalItems: totalQuantity,
      subtotal: totalSubtotal,
      totalDiscount,
      finalTotal,
      discountCount: discounts.length,
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
          pricing: {
            subtotal: totalSubtotal,
            discounts,
            total: finalTotal,
          },
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
