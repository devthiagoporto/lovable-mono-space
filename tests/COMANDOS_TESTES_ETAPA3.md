# Comandos de Testes - ETAPA 3

## Executar Todos os Testes da Etapa 3

```bash
# Executar apenas testes de integração da Etapa 3
npm run test tests/integration

# Executar todos os testes (incluindo Etapa 2)
npm run test

# Executar com watch mode
npm run test:watch tests/integration

# Executar com UI interativa
npm run test:ui
```

## Executar Testes Específicos

### 1. Cart Validation (Edge Function)
```bash
npm run test tests/integration/cart-validate.spec.ts
```

**Cenários testados:**
- ✅ Disponibilidade por lote (sucesso e estoque insuficiente)
- ✅ Janelas de venda (antes/depois)
- ✅ Limites por pedido (total e por tipo)
- ✅ Limites por CPF (por tipo e no evento)
- ✅ Sanitização de CPF (com pontos, traços, espaços)
- ✅ Múltiplos erros simultâneos
- ✅ Sucesso com warnings (capacidade de setor)
- ✅ Estrutura de resposta (ok/summary/errors)

### 2. Events Public Catalog
```bash
npm run test tests/integration/events-public.spec.ts
```

**Cenários testados:**
- ✅ Leitura de eventos publicados
- ✅ Bloqueio de eventos draft/cancelados
- ✅ Listagem de setores
- ✅ Listagem de tipos de ingresso ativos
- ✅ Listagem de lotes com disponibilidade
- ✅ Fluxo completo do catálogo público

### 3. Events CRUD and RLS
```bash
npm run test tests/integration/events-crud-rls.spec.ts
```

**Cenários testados:**
- ✅ CRUD de eventos (mesmo tenant)
- ✅ Isolamento entre tenants (RLS)
- ✅ CRUD de setores (RLS)
- ✅ CRUD de tipos de ingresso (RLS)
- ✅ CRUD de lotes (RLS)
- ✅ Leitura pública vs privada

## Cobertura de Testes

### Gerar Relatório de Cobertura
```bash
# Cobertura completa (todos os testes)
npm run test:coverage

# Cobertura apenas da Etapa 3
npm run test:coverage tests/integration
```

### Visualizar Relatório HTML
```bash
# Após executar test:coverage
npx vite preview --outDir coverage
```

### Métricas Esperadas (Etapa 3)

| Métrica | Meta | Esperado |
|---------|------|----------|
| **Statements** | ≥70% | ~75-80% |
| **Branches** | ≥70% | ~72-78% |
| **Functions** | ≥70% | ~75-82% |
| **Lines** | ≥70% | ~75-80% |

**Nota:** A cobertura da Etapa 3 foca em serviços e lógica de validação. A cobertura de UI components pode ser menor.

## Executar por Categoria

### Validações de Carrinho
```bash
npm run test -- --grep "Cart Validation"
```

### Leitura Pública
```bash
npm run test -- --grep "Public"
```

### RLS e Permissões
```bash
npm run test -- --grep "RLS"
```

## Modo de Desenvolvimento

### Watch Mode (reexecuta ao salvar)
```bash
npm run test:watch tests/integration/cart-validate.spec.ts
```

### UI Interativa (Vitest UI)
```bash
npm run test:ui
```

**Acesse:** http://localhost:51204/__vitest__/

## Comandos de Debug

### Executar com Verbose
```bash
npm run test -- --reporter=verbose tests/integration
```

### Executar com Stack Trace Completo
```bash
npm run test -- --reporter=verbose --no-coverage tests/integration/cart-validate.spec.ts
```

### Ver Apenas Testes que Falharam
```bash
npm run test -- --reporter=verbose --no-coverage --bail tests/integration
```

## Combinações Úteis

### Testes da Etapa 3 com Cobertura
```bash
npm run test:coverage tests/integration
```

### Testes da Etapa 3 em Watch Mode
```bash
npm run test:watch tests/integration
```

### Todos os Testes (Etapa 2 + Etapa 3)
```bash
npm run test
```

### Cobertura Total (Todas as Etapas)
```bash
npm run test:coverage
```

## Estrutura de Arquivos de Teste

```
tests/
├── integration/
│   ├── cart-validate.spec.ts         # Validação de carrinho (Edge Function)
│   ├── events-public.spec.ts         # Catálogo público
│   ├── events-crud-rls.spec.ts       # CRUD e RLS
│   └── supabase/                     # Testes de banco (Etapa 1)
├── auth/                             # Testes de autenticação (Etapa 2)
├── mocks/
│   └── supabase.ts                   # Mocks do Supabase
└── COMANDOS_TESTES_ETAPA3.md        # Este arquivo
```

## Interpretação de Resultados

### Sucesso Total
```
✓ tests/integration/cart-validate.spec.ts (38 tests) 1234ms
✓ tests/integration/events-public.spec.ts (15 tests) 567ms
✓ tests/integration/events-crud-rls.spec.ts (22 tests) 789ms

Test Files  3 passed (3)
     Tests  75 passed (75)
  Start at  10:30:00
  Duration  2.59s
```

### Com Falhas
```
✓ tests/integration/cart-validate.spec.ts (37 tests | 1 failed)
  × should fail with LOTE_SEM_ESTOQUE when stock is insufficient

AssertionError: expected 'ESTOQUE_INSUFICIENTE' to be 'LOTE_SEM_ESTOQUE'
```

## Troubleshooting

### Erro: "Cannot find module '@/services/cart'"
**Solução:** Verifique que o alias `@` está configurado no `vite.config.ts` e `vitest.config.ts`

### Erro: "supabase.functions.invoke is not a function"
**Solução:** Verifique que o mock do Supabase está correto em `tests/mocks/supabase.ts`

### Testes lentos
**Solução:** Use `--run` para desabilitar watch mode ou `--bail` para parar no primeiro erro

### Cobertura baixa
**Solução:** Execute `npm run test:coverage` e abra `coverage/index.html` para ver quais linhas não foram cobertas

## CI/CD

### GitHub Actions
```yaml
- name: Run Tests
  run: npm run test

- name: Generate Coverage
  run: npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

## Relatórios

### Formato JSON (para CI)
```bash
npm run test -- --reporter=json --outputFile=test-results.json
```

### Formato JUnit (para Jenkins/Gitlab)
```bash
npm run test -- --reporter=junit --outputFile=junit.xml
```

## Links Úteis

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)

---

**Última atualização:** ETAPA 3 - Testes de Integração
**Cobertura esperada:** ≥70% (statements, branches, functions, lines)
