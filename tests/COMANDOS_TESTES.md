# 🧪 Comandos de Teste - Camada de Dados Supabase

## Estrutura Criada

```
tests/
├── integration/
│   ├── supabase/
│   │   ├── setup.ts                    # Helpers e configuração
│   │   ├── data-creation.spec.ts       # ✅ Teste 1: FKs encadeados
│   │   ├── coupon-uniqueness.spec.ts   # ✅ Teste 2: Unicidade
│   │   ├── atomic-increment.spec.ts    # ✅ Teste 3: Atomicidade
│   │   ├── rls-public-access.spec.ts   # ✅ Teste 4: RLS público
│   │   └── tenant-isolation.spec.ts    # ✅ Teste 5: Isolamento
│   └── README.md
└── COMANDOS_TESTES.md (este arquivo)
```

## 🚀 Comandos Disponíveis

### Executar Todos os Testes
```bash
npm run test
```

### Executar Apenas Testes de Integração
```bash
npm run test tests/integration
```

### Executar Teste Específico
```bash
# Teste 1: Criação encadeada
npm run test tests/integration/supabase/data-creation.spec.ts

# Teste 2: Unicidade de cupons
npm run test tests/integration/supabase/coupon-uniqueness.spec.ts

# Teste 3: Incremento atômico
npm run test tests/integration/supabase/atomic-increment.spec.ts

# Teste 4: RLS público
npm run test tests/integration/supabase/rls-public-access.spec.ts

# Teste 5: Isolamento tenant
npm run test tests/integration/supabase/tenant-isolation.spec.ts
```

### Executar com Watch Mode (desenvolvimento)
```bash
npm run test -- --watch
```

### Executar com UI Interativa
```bash
npm run test:ui
```

### 📊 Cobertura de Código

#### Cobertura Geral
```bash
npm run test:coverage
```

#### Cobertura Apenas Integração
```bash
npm run test:coverage -- tests/integration
```

#### Ver Relatório HTML de Cobertura
```bash
npm run test:coverage
# Abrir: coverage/index.html
```

## 🎯 Meta de Cobertura

**Alvo**: ≥70% para camada de dados

Configuração em `vitest.config.ts`:
```typescript
coverage: {
  lines: 70,
  functions: 70,
  branches: 70,
  statements: 70,
}
```

## 📋 Checklist de Validação

### ✅ Teste 1: Criação Encadeada (data-creation.spec.ts)
- [x] Criar Event → Sector → TicketType → Lot
- [x] Validar relacionamentos via JOIN
- [x] Falhar ao criar Sector sem Event válido

### ✅ Teste 2: Unicidade de Cupom (coupon-uniqueness.spec.ts)
- [x] Criar cupom com código único
- [x] Falhar ao duplicar código no mesmo evento
- [x] Permitir mesmo código em eventos diferentes

### ✅ Teste 3: Incremento Atômico (atomic-increment.spec.ts)
- [x] Incrementar `qtd_vendida` atomicamente
- [x] Respeitar limite `qtd_total`
- [x] Simular race condition (otimistic locking)

### ✅ Teste 4: RLS Público (rls-public-access.spec.ts)
- [x] Ler eventos `status='publicado'` anonimamente
- [x] Bloquear leitura de `status='rascunho'`
- [x] Bloquear INSERT/UPDATE/DELETE anônimos

### ✅ Teste 5: Isolamento Tenant (tenant-isolation.spec.ts)
- [x] Isolar leitura entre tenants
- [x] Prevenir update cross-tenant
- [x] Validar isolamento em cascata

## 🔧 Troubleshooting

### Erro: "Supabase credentials not found"
**Solução**: Verifique `.env`:
```env
VITE_SUPABASE_URL=https://uipwbatjrxfdnpxefmjj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Erro: "Tenant não encontrado"
**Solução**: Execute seeds antes dos testes:
```sql
-- Ver SCRIPT_SQL_COMPLETO.sql (seção SEEDS)
```

### Testes Falhando por RLS
**Diagnóstico**: Verificar políticas RLS no Supabase:
```sql
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### Cleanup Manual (se necessário)
```sql
-- Deletar dados de teste
DELETE FROM lots WHERE tenant_id = '99999999-9999-9999-9999-999999999999';
DELETE FROM ticket_types WHERE tenant_id = '99999999-9999-9999-9999-999999999999';
DELETE FROM sectors WHERE tenant_id = '99999999-9999-9999-9999-999999999999';
DELETE FROM events WHERE tenant_id = '99999999-9999-9999-9999-999999999999';
DELETE FROM tenants WHERE id = '99999999-9999-9999-9999-999999999999';
```

## 📊 Exemplo de Output Esperado

```bash
$ npm run test:coverage -- tests/integration

 ✓ tests/integration/supabase/data-creation.spec.ts (3)
   ✓ Supabase Data Creation - Encadeamento de Entidades
     ✓ deve criar Event → Sector → TicketType → Lot respeitando FKs
     ✓ deve falhar ao criar Sector sem Event válido

 ✓ tests/integration/supabase/coupon-uniqueness.spec.ts (3)
   ✓ Supabase Coupon Uniqueness
     ✓ deve criar cupom com código único para o evento
     ✓ deve FALHAR ao inserir código duplicado no mesmo evento
     ✓ deve PERMITIR mesmo código em eventos diferentes

 ✓ tests/integration/supabase/atomic-increment.spec.ts (3)
   ✓ Supabase Atomic Increment
     ✓ deve incrementar qtd_vendida atomicamente
     ✓ deve respeitar limite qtd_total
     ✓ deve prevenir race condition

 ✓ tests/integration/supabase/rls-public-access.spec.ts (5)
   ✓ Supabase RLS - Acesso Público
     ✓ deve permitir leitura pública de eventos publicados
     ✓ deve BLOQUEAR leitura de rascunhos
     ✓ deve BLOQUEAR inserção anônima
     ✓ deve BLOQUEAR update anônimo
     ✓ deve BLOQUEAR delete anônimo

 ✓ tests/integration/supabase/tenant-isolation.spec.ts (5)
   ✓ Supabase Tenant Isolation
     ✓ deve isolar leitura de eventos entre tenants
     ✓ deve prevenir update de evento de outro tenant
     ✓ deve prevenir criação cross-tenant
     ✓ deve validar isolamento em cascata

Test Files  5 passed (5)
     Tests  19 passed (19)

-------------|---------|----------|---------|---------|
File         | % Stmts | % Branch | % Funcs | % Lines |
-------------|---------|----------|---------|---------|
All files    |   78.45 |    72.30 |   81.20 |   78.45 |
integration/ |   92.15 |    88.50 |   95.00 |   92.15 |
-------------|---------|----------|---------|---------|
```

## 🎓 Próximos Passos

1. **Autenticação Real**: Adicionar testes com usuários autenticados
2. **Edge Functions**: Testar lógica de negócio em functions
3. **Performance**: Adicionar benchmarks de queries
4. **E2E**: Integrar com Playwright para testes end-to-end

---

**Documentação Completa**: Ver `tests/integration/README.md`
