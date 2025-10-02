# ETAPA 3 - CRUD de Eventos e Validação de Carrinho

## Visão Geral

Esta etapa implementa o CRUD completo para eventos (Event, Sector, TicketType, Lot), página pública do evento com seletor de ingressos, e validação de carrinho via Edge Function.

**Importante:** Esta etapa NÃO inclui pagamentos nem reserva de estoque. É apenas validação pré-checkout.

## Estrutura Implementada

### Frontend

#### Serviços (`src/services/`)
- `events.ts` - CRUD de eventos
- `sectors.ts` - CRUD de setores
- `ticketTypes.ts` - CRUD de tipos de ingresso
- `lots.ts` - CRUD de lotes
- `cart.ts` - Validação de carrinho via Edge Function

#### Páginas Dashboard (`src/pages/Dashboard/`)
- `Events.tsx` - Lista de eventos
- `EventForm.tsx` - Criar/editar evento (incluindo limites)

#### Página Pública
- `EventPublic.tsx` (`/e/:eventId`) - Landing page do evento com seletor de ingressos

### Backend

#### Edge Function
- `cart-validate` - Valida carrinho antes do checkout

## Rotas

### Dashboard (Organizador)
- `/dashboard/events` - Lista de eventos
- `/dashboard/events/new` - Criar novo evento
- `/dashboard/events/:eventId` - Editar evento

### Público
- `/e/:eventId` - Página pública do evento

## Regras de Validação (cart-validate)

### 1. Disponibilidade por Lote
- `qtd_vendida + quantity <= qtd_total`

### 2. Janela de Vendas
- `inicio_vendas <= now() <= fim_vendas`
- Tolerância de clock skew: ±60 segundos

### 3. Limites do Pedido
- **Máximo Total por Pedido**: `sum(items.quantity) <= maxTotalPorPedido`
- **Por Tipo**: `quantity <= TicketType.max_por_pedido`

### 4. Limites por CPF
Considera apenas orders com status `pago`:
- **Por Tipo**: `acumuladoCPFPorTipo + quantity <= maxPorCPFPorTipo`
- **No Evento**: `acumuladoCPFNoEvento + totalQuantity <= maxPorCPFNoEvento`

### 5. Sanitização
- CPF: remove pontuação, valida 11 dígitos

## Edge Function: cart-validate

### Endpoint
```
POST /functions/v1/cart-validate
```

### Request Body
```json
{
  "tenantId": "uuid",
  "eventId": "uuid",
  "buyerCpf": "12345678900",
  "items": [
    {
      "ticketTypeId": "uuid",
      "lotId": "uuid",
      "quantity": 2
    }
  ]
}
```

### Response - Sucesso (200 OK)
```json
{
  "ok": true,
  "summary": {
    "totalItems": 2,
    "byType": [
      { "ticketTypeId": "uuid", "qty": 2 }
    ],
    "byLot": [
      { "lotId": "uuid", "qty": 2 }
    ],
    "warnings": []
  }
}
```

### Response - Erro de Validação (422)
```json
{
  "ok": false,
  "errors": [
    {
      "code": "LIMIT_MAX_TOTAL_POR_PEDIDO",
      "message": "Quantidade máxima total por pedido é 10"
    },
    {
      "code": "LOTE_SEM_ESTOQUE",
      "lotId": "uuid",
      "message": "Lote VIP não tem estoque suficiente (disponível: 5)"
    }
  ]
}
```

### Códigos de Erro Possíveis
- `INVALID_CPF` - CPF inválido
- `EVENT_NOT_FOUND` - Evento não encontrado
- `LOTS_NOT_FOUND` - Lotes não encontrados
- `TYPES_NOT_FOUND` - Tipos de ingresso não encontrados
- `LOT_NOT_FOUND` - Lote específico não encontrado
- `LOTE_FORA_DA_JANELA` - Lote fora da janela de vendas
- `LOTE_SEM_ESTOQUE` - Lote sem estoque suficiente
- `LIMIT_MAX_POR_TIPO_POR_PEDIDO` - Limite por tipo excedido
- `LIMIT_MAX_TOTAL_POR_PEDIDO` - Limite total por pedido excedido
- `LIMIT_MAX_POR_CPF_POR_TIPO` - Limite por CPF por tipo excedido
- `LIMIT_MAX_POR_CPF_NO_EVENTO` - Limite por CPF no evento excedido
- `INTERNAL_ERROR` - Erro interno

## Teste Manual

### 1. Criar Evento (Dashboard)

1. Acesse `/dashboard/events`
2. Clique em "Criar Evento"
3. Preencha:
   - Título: "Show de Rock 2025"
   - Descrição: "Melhor show do ano"
   - Local: "Arena Central"
   - Data início: 2025-06-15 20:00
   - Data fim: 2025-06-16 02:00
   - Capacidade: 10000
   - Status: "publicado"
   - Limites:
     - Max Total por Pedido: 10
     - Max por CPF no Evento: 4
4. Salve o evento

### 2. Adicionar Setores, Tipos e Lotes

**Nota:** Nesta etapa, o CRUD de setores/tipos/lotes ainda está básico. 
Você pode adicioná-los diretamente via SQL ou implementar as UIs completas em extensões futuras.

Exemplo de SQL para popular:
```sql
-- Inserir setor
INSERT INTO sectors (tenant_id, event_id, nome, capacidade, ordem)
VALUES ('seu-tenant-id', 'event-id', 'Pista', 5000, 1);

-- Inserir tipo de ingresso
INSERT INTO ticket_types (tenant_id, event_id, sector_id, nome, preco, taxa, max_por_pedido, ativo)
VALUES ('seu-tenant-id', 'event-id', 'sector-id', 'Inteira', 150.00, 15.00, 4, true);

-- Inserir lote
INSERT INTO lots (tenant_id, ticket_type_id, nome, preco, qtd_total, qtd_vendida, inicio_vendas, fim_vendas)
VALUES ('seu-tenant-id', 'ticket-type-id', '1º Lote', 120.00, 1000, 0, '2025-05-01 00:00:00', '2025-05-31 23:59:59');
```

### 3. Testar Página Pública

1. Acesse `/e/:eventId` (copie o ID do evento criado)
2. Preencha o CPF
3. Selecione quantidades nos lotes disponíveis
4. Clique em "Continuar"
5. Observe:
   - ✅ Sucesso: Mensagem com total de ingressos
   - ❌ Erros: Mensagens específicas sobre limites/estoque

### 4. Testar Validações

#### Teste 1: Limite Total por Pedido
- Configure maxTotalPorPedido = 10
- Tente comprar 11 ingressos
- Esperado: Erro `LIMIT_MAX_TOTAL_POR_PEDIDO`

#### Teste 2: Limite por Tipo
- Configure max_por_pedido = 4 no tipo
- Tente comprar 5 ingressos do mesmo tipo
- Esperado: Erro `LIMIT_MAX_POR_TIPO_POR_PEDIDO`

#### Teste 3: Estoque Insuficiente
- Lote com 10 disponíveis
- Tente comprar 11
- Esperado: Erro `LOTE_SEM_ESTOQUE`

#### Teste 4: Janela de Vendas
- Configure inicio_vendas no futuro
- Tente comprar
- Esperado: Erro `LOTE_FORA_DA_JANELA`

## Teste via cURL

```bash
# Exemplo de validação bem-sucedida
curl -X POST https://seu-projeto.supabase.co/functions/v1/cart-validate \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "uuid-do-tenant",
    "eventId": "uuid-do-evento",
    "buyerCpf": "12345678900",
    "items": [
      {
        "ticketTypeId": "uuid-do-tipo",
        "lotId": "uuid-do-lote",
        "quantity": 2
      }
    ]
  }'
```

## Limitações da Etapa 3

1. **Sem Pagamentos**: Validação apenas, nenhum gateway de pagamento
2. **Sem Reserva de Estoque**: `qtd_vendida` não é alterado
3. **Sem Checkout**: Próxima etapa implementará criação de orders/tickets
4. **CRUD Básico**: UI de setores/tipos/lotes pode ser expandida
5. **Sem Imagens**: Campo `imagem_url` do evento não é utilizado ainda

## Próximas Etapas

**Etapa 4: Checkout e Pagamentos**
- Integração com gateway de pagamento
- Reserva de estoque (transação atômica)
- Criação de orders e tickets
- Geração de QR codes

**Etapa 5: Check-in**
- Validação de QR codes
- Portal de operador completo
- Logs de check-in

## Estrutura de Arquivos Criados

```
src/
├── services/
│   ├── events.ts
│   ├── sectors.ts
│   ├── ticketTypes.ts
│   ├── lots.ts
│   └── cart.ts
├── pages/
│   ├── Dashboard/
│   │   ├── Events.tsx
│   │   └── EventForm.tsx
│   └── EventPublic.tsx
supabase/
└── functions/
    └── cart-validate/
        └── index.ts
```

## Segurança

### RLS Policies
- CRUD de eventos: apenas organizadores do tenant
- Leitura pública: apenas eventos com status `publicado`
- Edge Function: usa service role para bypass de RLS na validação

### Validação de Input
- CPF: normalização e validação de formato
- Quantidades: validação de valores não-negativos
- Datas: coerência entre início/fim e janelas de venda

## Logs e Debugging

A Edge Function `cart-validate` registra logs detalhados:
```
Validating cart: { tenantId, eventId, buyerCpf, itemCount }
```

Para ver logs:
```bash
# Via Supabase CLI
supabase functions logs cart-validate

# Ou via dashboard Supabase
# Lovable Cloud > Functions > cart-validate > Logs
```

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs da Edge Function
2. Confirme que o evento está `publicado`
3. Valide RLS policies no banco
4. Teste com dados de seed conhecidos
