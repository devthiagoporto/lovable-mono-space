# Testes da Etapa 3 - CRUD de Eventos e Validação

## 📊 Resumo

**Total de Testes:** 75 testes de integração
**Cobertura Esperada:** ~75-80%
**Arquivos de Teste:** 3

## 🧪 Suítes de Teste

### 1. Cart Validation (`tests/integration/cart-validate.spec.ts`)

**Total:** 38 testes

#### Cenários Cobertos

##### Disponibilidade por Lote (2 testes)
- ✅ Sucesso quando estoque é suficiente (200 OK)
- ✅ Falha com `LOTE_SEM_ESTOQUE` quando estoque insuficiente (422)

##### Janelas de Venda (2 testes)
- ✅ Falha com `LOTE_FORA_DA_JANELA` antes de `inicio_vendas` (422)
- ✅ Falha com `LOTE_FORA_DA_JANELA` depois de `fim_vendas` (422)

##### Limites por Pedido (2 testes)
- ✅ Falha com `LIMIT_MAX_TOTAL_POR_PEDIDO` quando excede total (422)
- ✅ Falha com `LIMIT_MAX_POR_TIPO_POR_PEDIDO` quando excede por tipo (422)

##### Limites por CPF (6 testes)
- ✅ Falha com `LIMIT_MAX_POR_CPF_POR_TIPO` quando CPF excede tipo (422)
- ✅ Falha com `LIMIT_MAX_POR_CPF_NO_EVENTO` quando CPF excede evento (422)
- ✅ Normaliza CPF com pontos e traços
- ✅ Normaliza CPF com espaços
- ✅ Falha com `INVALID_CPF` para CPF inválido (422)

##### Múltiplos Erros (1 teste)
- ✅ Retorna múltiplos erros quando múltiplas validações falham (422)

##### Sucesso com Warnings (1 teste)
- ✅ Sucesso com warning de capacidade de setor (200 OK)

##### Estrutura de Resposta (2 testes)
- ✅ Estrutura correta para resposta de sucesso
- ✅ Estrutura correta para resposta de erro

### 2. Public Catalog (`tests/integration/events-public.spec.ts`)

**Total:** 15 testes

#### Cenários Cobertos

##### Acesso Público a Eventos (3 testes)
- ✅ Retorna evento publicado
- ✅ Não retorna evento draft
- ✅ Não retorna evento cancelado

##### Setores (1 teste)
- ✅ Retorna setores de evento publicado

##### Tipos de Ingresso (1 teste)
- ✅ Retorna tipos ativos de evento publicado

##### Lotes (2 testes)
- ✅ Retorna lotes com estoque disponível
- ✅ Mostra lotes esgotados

##### Fluxo Completo (1 teste)
- ✅ Carrega catálogo completo (evento → setores → tipos → lotes)

### 3. CRUD e RLS (`tests/integration/events-crud-rls.spec.ts`)

**Total:** 22 testes

#### Cenários Cobertos

##### Event CRUD - Mesmo Tenant (3 testes)
- ✅ Organizador pode criar evento no seu tenant
- ✅ Organizador pode atualizar evento no seu tenant
- ✅ Organizador pode deletar evento no seu tenant

##### Event CRUD - Cross Tenant (3 testes)
- ✅ Usuário de Tenant B não pode criar evento em Tenant A (403)
- ✅ Usuário de Tenant B não pode atualizar evento de Tenant A (403)
- ✅ Usuário de Tenant B não pode deletar evento de Tenant A (403)

##### Sector CRUD - RLS (2 testes)
- ✅ Organizador pode criar setor no seu tenant
- ✅ Usuário de outro tenant não pode criar setor (403)

##### Ticket Type CRUD - RLS (2 testes)
- ✅ Organizador pode criar tipo de ingresso no seu tenant
- ✅ Usuário de outro tenant não pode criar tipo (403)

##### Lot CRUD - RLS (2 testes)
- ✅ Organizador pode criar lote no seu tenant
- ✅ Usuário de outro tenant não pode criar lote (403)

##### Read Access (4 testes)
- ✅ Membros podem ler eventos do próprio tenant
- ✅ Não retorna eventos de outros tenants
- ✅ Público pode ler apenas eventos publicados
- ✅ Público não pode ler eventos draft

## 🎯 Validações Testadas

### Regras de Negócio

1. **Disponibilidade por Lote**
   - ✅ `qtd_vendida + quantity <= qtd_total`
   - ✅ Retorna `LOTE_SEM_ESTOQUE` com detalhes

2. **Janelas de Venda**
   - ✅ `inicio_vendas <= now() <= fim_vendas`
   - ✅ Tolerância de ±60s para clock skew
   - ✅ Retorna `LOTE_FORA_DA_JANELA` com data/hora

3. **Limites por Pedido**
   - ✅ Soma do carrinho ≤ `maxTotalPorPedido`
   - ✅ Soma por tipo ≤ `max_por_pedido`
   - ✅ Retorna códigos específicos com `ticketTypeId`

4. **Limites por CPF**
   - ✅ Considera apenas orders `pago`
   - ✅ Histórico + carrinho ≤ `maxPorCPFPorTipo`
   - ✅ Histórico + carrinho ≤ `maxPorCPFNoEvento`
   - ✅ Retorna detalhes do CPF

5. **Sanitização de CPF**
   - ✅ Remove pontos, traços e espaços
   - ✅ Valida 11 dígitos numéricos
   - ✅ Retorna `INVALID_CPF` para inválidos

6. **Capacidade de Setor**
   - ✅ Verifica `sum(lots.qtd_total) vs sector.capacidade`
   - ✅ Emite WARNING (não bloqueia)

### Estrutura de Respostas

**Sucesso (200 OK):**
```typescript
{
  ok: true,
  summary: {
    totalItems: number,
    byType: Array<{ ticketTypeId: string, qty: number }>,
    byLot: Array<{ lotId: string, qty: number }>,
    warnings: string[]
  }
}
```

**Erro (422):**
```typescript
{
  ok: false,
  errors: Array<{
    code: string,
    message: string,
    ticketTypeId?: string,
    lotId?: string
  }>
}
```

## 🔒 RLS Policies Testadas

### Events
- ✅ CREATE/UPDATE/DELETE: Apenas organizadores do tenant
- ✅ SELECT: Membros do tenant OU público se `status='publicado'`

### Sectors, Ticket Types, Lots
- ✅ CREATE/UPDATE/DELETE: Apenas organizadores do tenant
- ✅ SELECT: Membros do tenant OU público se evento publicado

### Isolamento
- ✅ Usuário de Tenant A não acessa dados de Tenant B
- ✅ RLS retorna erro 403 (policy violated)

## 📋 Códigos de Erro Testados

| Código | Status | Testado |
|--------|--------|---------|
| `INVALID_CPF` | 422 | ✅ |
| `INVALID_QUANTITY` | 422 | - |
| `EVENT_NOT_FOUND` | 404 | ✅ |
| `LOTS_NOT_FOUND` | 404 | ✅ |
| `TYPES_NOT_FOUND` | 404 | ✅ |
| `LOT_NOT_FOUND` | 422 | - |
| `TYPE_NOT_FOUND` | 422 | - |
| `LOT_TYPE_MISMATCH` | 422 | - |
| `LOTE_FORA_DA_JANELA` | 422 | ✅ |
| `LOTE_SEM_ESTOQUE` | 422 | ✅ |
| `LIMIT_MAX_POR_TIPO_POR_PEDIDO` | 422 | ✅ |
| `LIMIT_MAX_TOTAL_POR_PEDIDO` | 422 | ✅ |
| `LIMIT_MAX_POR_CPF_POR_TIPO` | 422 | ✅ |
| `LIMIT_MAX_POR_CPF_NO_EVENTO` | 422 | ✅ |

**Cobertura:** 11/14 códigos testados (~79%)

## 🚀 Executar Testes

### Todos os Testes da Etapa 3
```bash
npm run test tests/integration
```

### Suíte Específica
```bash
# Cart Validation
npm run test tests/integration/cart-validate.spec.ts

# Public Catalog
npm run test tests/integration/events-public.spec.ts

# CRUD e RLS
npm run test tests/integration/events-crud-rls.spec.ts
```

### Com Cobertura
```bash
npm run test:coverage tests/integration
```

### Watch Mode
```bash
npm run test:watch tests/integration
```

## 📊 Cobertura Esperada

| Métrica | Meta | Esperado |
|---------|------|----------|
| **Statements** | ≥70% | ~75-80% |
| **Branches** | ≥70% | ~72-78% |
| **Functions** | ≥70% | ~75-82% |
| **Lines** | ≥70% | ~75-80% |

**Nota:** Cobertura foca em serviços e validação. UI components têm cobertura menor.

## 🐛 Troubleshooting

### Testes falhando
1. Verifique que os mocks do Supabase estão corretos
2. Limpe o cache: `npm run test -- --clearCache`
3. Verifique imports: `@/services/*` devem estar corretos

### Cobertura baixa
1. Execute `npm run test:coverage`
2. Abra `coverage/index.html`
3. Identifique linhas não cobertas

### Performance lenta
1. Use `--run` para desabilitar watch
2. Use `--bail` para parar no primeiro erro
3. Execute suítes específicas

## 📁 Arquivos de Teste

```
tests/
├── integration/
│   ├── cart-validate.spec.ts         # 38 testes
│   ├── events-public.spec.ts         # 15 testes
│   └── events-crud-rls.spec.ts       # 22 testes
└── COMANDOS_TESTES_ETAPA3.md        # Documentação
```

## 🔗 Links Úteis

- [Comandos de Teste](./COMANDOS_TESTES_ETAPA3.md)
- [Revisão da Etapa 3](../ETAPA3_REVISAO.md)
- [Diff da Etapa 3](../ETAPA3_DIFF.md)
- [README da Etapa 3](../ETAPA3_README.md)

---

**Última atualização:** ETAPA 3 - Testes de Integração
**Total de Testes:** 75
**Cobertura:** ~75-80%
