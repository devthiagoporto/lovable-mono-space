# Testes de Integração - Supabase

## Estrutura

```
tests/integration/supabase/
├── setup.ts                    # Configuração e helpers
├── data-creation.spec.ts       # Teste 1: Criação encadeada (FKs)
├── coupon-uniqueness.spec.ts   # Teste 2: Unicidade de cupons
├── atomic-increment.spec.ts    # Teste 3: Incremento atômico
├── rls-public-access.spec.ts   # Teste 4: RLS leitura pública
└── tenant-isolation.spec.ts    # Teste 5: Isolamento por tenant
```

## Cobertura

### ✅ Teste 1: Criação Encadeada
- Valida criação de Event → Sector → TicketType → Lot
- Verifica integridade de relacionamentos via JOIN
- Testa falha ao criar setor sem evento válido

### ✅ Teste 2: Unicidade de Cupom
- Valida constraint única `(event_id, codigo)`
- Testa erro ao duplicar código no mesmo evento
- Permite mesmo código em eventos diferentes

### ✅ Teste 3: Incremento Atômico
- Incrementa `lots.qtd_vendida` de forma atômica
- Valida limite `qtd_vendida <= qtd_total`
- Simula race condition (otimistic locking)

### ✅ Teste 4: RLS Leitura Pública
- Usuário anônimo pode ler eventos `status='publicado'`
- Bloqueia leitura de eventos `status='rascunho'`
- Bloqueia INSERT/UPDATE/DELETE anônimos

### ✅ Teste 5: Isolamento por Tenant
- Valida que usuário de Tenant A não acessa dados de Tenant B
- Previne update cross-tenant
- Valida isolamento em cascata (event → sector → type)

## Executar Testes

```bash
# Todos os testes de integração
npm run test tests/integration

# Teste específico
npm run test tests/integration/supabase/data-creation.spec.ts

# Com cobertura
npm run test:coverage
```

## Pré-requisitos

- **Variáveis de ambiente** configuradas:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`

- **Dados de seed** presentes:
  - Tenant: `11111111-1111-1111-1111-111111111111`
  - Evento: `44444444-4444-4444-4444-444444444444`

## Observações

### Autenticação
- Testes usam cliente anônimo (anonKey)
- Para testes de RLS com roles, seria necessário:
  1. Criar usuários via `supabase.auth.signUp()`
  2. Autenticar com `supabase.auth.signInWithPassword()`
  3. Configurar roles em `user_roles`

### Foreign Keys
- Atualmente as FKs não estão explícitas no schema
- Testes validam integridade via lógica de negócio
- Recomenda-se adicionar FKs via migration

### Cleanup
- Função `cleanupTestData()` remove dados de teste
- Executada após cada suite de testes
- Usa tenant de teste isolado: `99999999-9999-9999-9999-999999999999`

## Meta de Cobertura

**Alvo**: ≥70% de cobertura na camada de dados

Executar:
```bash
npm run test:coverage -- tests/integration
```
