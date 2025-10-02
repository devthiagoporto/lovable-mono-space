# Comandos de Testes - ETAPA 4 (Cupons)

Este documento contém os comandos para executar os testes da ETAPA 4, focados na gestão de cupons e validação no carrinho.

## Executar Todos os Testes da ETAPA 4

```bash
npm run test tests/integration/cart-validate-coupons.spec.ts tests/integration/coupons-crud-rls.spec.ts tests/integration/coupons-analytics.spec.ts
```

## Executar por Arquivo

### A) Validação de Cupons (cart-validate)
```bash
npm run test tests/integration/cart-validate-coupons.spec.ts
```

### B) CRUD e RLS de Cupons
```bash
npm run test tests/integration/coupons-crud-rls.spec.ts
```

### C) Analytics e Export
```bash
npm run test tests/integration/coupons-analytics.spec.ts
```

## Executar por Suíte

### A1. Cupom Percentual
```bash
npm run test tests/integration/cart-validate-coupons.spec.ts -t "A1. Cupom Percentual Simples"
```

### A2. Cupom Valor Fixo
```bash
npm run test tests/integration/cart-validate-coupons.spec.ts -t "A2. Cupom Valor Fixo"
```

### A3. Cupom Cortesia
```bash
npm run test tests/integration/cart-validate-coupons.spec.ts -t "A3. Cupom Cortesia"
```

### A4. Não Combináveis
```bash
npm run test tests/integration/cart-validate-coupons.spec.ts -t "A4. Cupons Não Combináveis"
```

### A5. WhitelistTipos
```bash
npm run test tests/integration/cart-validate-coupons.spec.ts -t "A5. WhitelistTipos"
```

### A6. Limites
```bash
npm run test tests/integration/cart-validate-coupons.spec.ts -t "A6. Limites"
```

### A7. Sanitização
```bash
npm run test tests/integration/cart-validate-coupons.spec.ts -t "A7. Sanitização"
```

### A8. Performance/Batch
```bash
npm run test tests/integration/cart-validate-coupons.spec.ts -t "A8. Batch/Performance"
```

### B1. CRUD Operations
```bash
npm run test tests/integration/coupons-crud-rls.spec.ts -t "B1. CRUD Operations"
```

### B2. Cross-Tenant Isolation
```bash
npm run test tests/integration/coupons-crud-rls.spec.ts -t "B2. Cross-Tenant Isolation"
```

### C1. Analytics KPIs
```bash
npm run test tests/integration/coupons-analytics.spec.ts -t "C1. Analytics KPIs"
```

### C2. Usage by Day
```bash
npm run test tests/integration/coupons-analytics.spec.ts -t "C2. Usage by Day"
```

### C3. CSV Export
```bash
npm run test tests/integration/coupons-analytics.spec.ts -t "C3. CSV Export"
```

## Cobertura

### Cobertura Geral
```bash
npm run test:coverage
```

### Cobertura da ETAPA 4
```bash
npm run test:coverage tests/integration/cart-validate-coupons.spec.ts tests/integration/coupons-crud-rls.spec.ts tests/integration/coupons-analytics.spec.ts
```

## Watch Mode (Desenvolvimento)

```bash
npm run test:watch tests/integration/cart-validate-coupons.spec.ts
npm run test:watch tests/integration/coupons-crud-rls.spec.ts
npm run test:watch tests/integration/coupons-analytics.spec.ts
```

## UI do Vitest

```bash
npm run test:ui
```

## Testes Específicos por Cenário

### Sucesso com Desconto
```bash
npm run test tests/integration/cart-validate-coupons.spec.ts -t "should apply percentage discount correctly"
```

### Erro de Limite
```bash
npm run test tests/integration/cart-validate-coupons.spec.ts -t "LIMITE_TOTAL_EXCEDIDO"
```

### Cupom Não Encontrado
```bash
npm run test tests/integration/cart-validate-coupons.spec.ts -t "coupon not found"
```

### Não Combináveis
```bash
npm run test tests/integration/cart-validate-coupons.spec.ts -t "non-combinable"
```

### Whitelist
```bash
npm run test tests/integration/cart-validate-coupons.spec.ts -t "whitelisted types"
```

## Cenários de Teste Cobertos

### A) Validação de Cupons (38 testes)
- ✅ Cupom percentual simples e múltiplos
- ✅ Cupom valor fixo (com cap em subtotal)
- ✅ Cupom cortesia (zera elegíveis)
- ✅ Não combináveis (2 não combináveis, 1 não + 1 sim)
- ✅ WhitelistTipos (sem elegíveis, parcialmente elegível)
- ✅ Limites (limiteTotal, limitePorCPF)
- ✅ Sanitização (case-insensitive, CPF formatado)
- ✅ Performance (batch, N+1)
- ✅ Edge cases (não encontrado, vazio, precisão)

### B) CRUD e RLS (25 testes)
- ✅ Criar/editar/deletar (com RLS)
- ✅ Isolamento entre tenants
- ✅ Unicidade (codigo por event_id)
- ✅ Tipos válidos/inválidos
- ✅ Estrutura de limites (JSONB)
- ✅ Acesso público restrito
- ✅ Tracking de uso (uso_total)
- ✅ RLS de coupon_usage

### C) Analytics (22 testes)
- ✅ KPIs (total ativos, total usos, top 5)
- ✅ Agregação por dia (últimos 30 dias)
- ✅ Export CSV (header, dados, formatação)
- ✅ Paginação de uso
- ✅ Tratamento de erros

## Total de Testes: 85

## Meta de Cobertura

- **Alvo**: ≥ 75%
- **Arquivos principais**:
  - `services/coupons.ts`
  - `services/cart.ts`
  - Edge Function `cart-validate`

## Notas

- Testes de RLS requerem contexto autenticado (mocks ou service role)
- Edge Function é testada via mocks do cliente Supabase
- Analytics usa fixtures para simular dados históricos
- CSV export verifica estrutura e formatação pt-BR
