# Sistema de Ingressos Multi-Tenant

Sistema completo de gerenciamento de ingressos para eventos, com autenticação multi-tenant, RBAC e portal de check-in.

## 🚀 Arquitetura

- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Backend:** Supabase (Auth + Postgres + Edge Functions)
- **Idioma:** pt-BR
- **Moeda:** BRL (R$)
- **Fuso Horário:** America/Sao_Paulo

## ✅ Funcionalidades Implementadas

### Etapa 1: Modelagem de Dados
- 15 tabelas com RLS habilitado
- 5 tipos ENUM customizados
- 3 funções de segurança (SECURITY DEFINER)
- 33 políticas RLS para isolamento multi-tenant
- Seed data para testes

### Etapa 2: Autenticação e RBAC
- Autenticação via Supabase Auth (e-mail/senha)
- Sistema de roles: `admin_saas`, `organizer_admin`, `organizer_staff`, `checkin_operator`, `buyer`
- Portal dedicado para operadores de check-in (`/checkin`)
- Edge Functions para provisionamento de operadores
- Isolamento completo por tenant

### Etapa 3: CRUD de Eventos e Validação ✅ Revisada
- CRUD completo (Event, Sector, TicketType, Lot)
- Página pública do evento (`/e/:eventId`)
- Edge Function `cart-validate` com 9 regras de validação
- 14 códigos de erro padronizados
- Batch queries otimizadas (~80-100ms)
- Warnings de capacidade de setor
- Ver: `ETAPA3_README.md` e `ETAPA3_REVISAO.md`

## 🌐 Estrutura de Rotas

| Rota | Proteção | Descrição |
|------|----------|-----------|
| `/` | Pública | Landing page |
| `/login` | Pública | Login geral |
| `/dashboard` | Autenticado | Dashboard principal |
| `/dashboard/events` | Autenticado | Lista de eventos |
| `/dashboard/events/:id` | Autenticado | Criar/editar evento |
| `/dashboard/operators` | Admin | Gestão de operadores |
| `/e/:eventId` | Pública | Página do evento |
| `/checkin` | `checkin_operator` | Portal de check-in |

## 🔧 Setup do Projeto

### Pré-requisitos
- Node.js 18+ e npm
- Conta no Lovable (https://lovable.dev)

### Instalação
```bash
# Clone o repositório
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Instale dependências
npm install

# Execute em desenvolvimento
npm run dev
```

### Variáveis de Ambiente

O Lovable Cloud configura automaticamente:
```env
VITE_SUPABASE_URL=https://uipwbatjrxfdnpxefmjj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_SUPABASE_PROJECT_ID=uipwbatjrxfdnpxefmjj
```

## 🔌 Edge Functions

### `operators-create`
Cria novo operador de check-in (apenas `organizer_admin` ou `admin_saas`).

**Endpoint:** `POST /functions/v1/operators-create`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "email": "operador@exemplo.com",
  "nome": "João Silva",
  "tenantId": "uuid-do-tenant"
}
```

**Resposta (200):**
```json
{
  "userId": "uuid-gerado",
  "tempPassword": "Check12345678!"
}
```

**Erros:**
- `401`: Token ausente ou inválido
- `403`: Usuário sem permissão
- `400`: Campos obrigatórios faltando

### `roles-assign`
Atribui role a um usuário existente.

**Endpoint:** `POST /functions/v1/roles-assign`

**Body:**
```json
{
  "userId": "uuid-do-usuario",
  "tenantId": "uuid-do-tenant",
  "role": "organizer_staff"
}
```

**Roles permitidas:**
- `organizer_staff`
- `checkin_operator`
- `buyer`

## 🧪 Testes

### Testes de Integração
```bash
# Executar todos os testes
npm run test:integration

# Executar com cobertura
npm run test:coverage

# Testes específicos
npm run test tests/integration/supabase/data-creation.spec.ts
```

### Testes Manuais (cURL)

**Obter Token:**
```bash
# Via localStorage no DevTools
localStorage.getItem('supabase.auth.token')

# Configurar ambiente
export TOKEN="seu-token-aqui"
export SUPABASE_URL="https://uipwbatjrxfdnpxefmjj.supabase.co"
```

**Criar Operador:**
```bash
curl -X POST "${SUPABASE_URL}/functions/v1/operators-create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@exemplo.com",
    "nome": "Teste",
    "tenantId": "11111111-1111-1111-1111-111111111111"
  }'
```

**Atribuir Role:**
```bash
curl -X POST "${SUPABASE_URL}/functions/v1/roles-assign" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid-do-usuario",
    "tenantId": "11111111-1111-1111-1111-111111111111",
    "role": "organizer_staff"
  }'
```

Ver `CORREÇÕES_APLICADAS.md` para mais exemplos de testes.

## 🔐 Segurança

### RLS (Row Level Security)
Todas as tabelas possuem RLS habilitado:

- **Leitura pública:** Apenas `events`, `sectors`, `ticket_types`, `lots` e `coupons` com status publicado
- **Escrita:** Restrita ao tenant do usuário autenticado
- **Isolamento:** Queries automáticas filtrando por `tenant_id`

### Roles e Permissões
- **admin_saas:** Acesso global a todos os tenants
- **organizer_admin:** Acesso total ao próprio tenant
- **organizer_staff:** Acesso operacional ao tenant
- **checkin_operator:** Apenas check-in de ingressos
- **buyer:** Comprar e visualizar próprios ingressos

### Service Role Key
**CRÍTICO:** A `SUPABASE_SERVICE_ROLE_KEY` é usada **apenas** nas Edge Functions no servidor. **NUNCA** exponha no frontend.

## 📝 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run lint` | Verificar código |
| `npm test` | Executar todos os testes |
| `npm run test:watch` | Testes em watch mode |
| `npm run test:ui` | UI interativa de testes |
| `npm run test:coverage` | Cobertura de testes |
| `npm run test tests/auth` | Testes de autenticação (Etapa 2) |
| `npm run test tests/integration` | Testes de integração (Etapa 3) |

### Testes Vitest

**Meta de Cobertura:** ≥70% para todas as métricas

| Etapa | Cobertura | Arquivos |
|-------|-----------|----------|
| **Etapa 2** | ~82% | `tests/auth/*.spec.ts` |
| **Etapa 3** | ~75-80% | `tests/integration/*.spec.ts` |
| **Total** | ~78-82% | Todos os testes |

**Documentação:**
- `tests/COMANDOS_TESTES_AUTH.md` - Comandos da Etapa 2
- `tests/COMANDOS_TESTES_ETAPA3.md` - Comandos da Etapa 3
- `TESTES_COBERTURA.md` - Relatório geral

## 📚 Documentação Adicional

- [Modelagem de Dados](./RESUMO_MODELAGEM.md)
- [Autenticação Implementada](./AUTENTICACAO_IMPLEMENTADA.md)
- [Correções Aplicadas](./CORREÇÕES_APLICADAS.md)
- [Revisão da Etapa 3](./ETAPA3_REVISAO.md)
- [Diff da Etapa 3](./ETAPA3_DIFF.md)
- [README da Etapa 3](./ETAPA3_README.md)
- [Testes de Integração](./TESTES_INTEGRACAO.md)
- [Testes da Etapa 3](./tests/COMANDOS_TESTES_ETAPA3.md)
- [Comandos de Teste](./tests/COMANDOS_TESTES.md)
- [Cobertura de Testes](./TESTES_COBERTURA.md)

## 🗺️ Próximas Etapas

- [ ] Implementar fluxo de compra de ingressos
- [ ] Adicionar validação de QR Codes (JWT assinado)
- [ ] Implementar transferência de ingressos
- [ ] Dashboard de métricas e relatórios
- [ ] Integração com gateway de pagamento

## 📧 Suporte

Para dúvidas sobre autenticação e RBAC, consulte `AUTENTICACAO_IMPLEMENTADA.md`.
Para comandos de teste, consulte `tests/COMANDOS_TESTES.md`.

---

**Desenvolvido com ❤️ usando Lovable**
