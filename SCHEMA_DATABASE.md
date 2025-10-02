# 🗄️ Schema do Banco de Dados - SaaS Multi-Tenant de Ingressos

**Data**: 02/10/2025  
**Versão**: 1.0.0  
**Status**: ✅ Implementado e testado

---

## 📋 Sumário Executivo

Sistema de venda de ingressos **multi-tenant** (sem assentos numerados), com suporte a:
- **Setores/Áreas** (Pista, Frontstage, Camarote, etc.)
- **Tipos de ingresso** (Inteira, Meia, VIP, etc.)
- **Lotes** de venda progressivos
- **Cupons** de desconto (percentual, valor fixo, cortesia)
- **Transferências** de ingressos entre usuários
- **Check-in** com QR Code
- **RBAC** (Role-Based Access Control) por tenant
- **RLS** (Row Level Security) completo

---

## 🏗️ Arquitetura Multi-Tenant

### Princípio: **Tenant Isolation**

Cada organizador (tenant) tem seus próprios:
- Eventos
- Setores e tipos de ingresso
- Pedidos e ingressos
- Cupons
- Usuários e permissões

**Coluna `tenant_id`** presente em TODAS as tabelas de negócio para garantir isolamento.

---

## 📊 Enums (Tipos Customizados)

### `role_type`
```sql
CREATE TYPE role_type AS ENUM (
  'admin_saas',        -- Administrador da plataforma
  'organizer_admin',   -- Admin do organizador (tenant)
  'organizer_staff',   -- Staff do organizador
  'checkin_operator',  -- Operador de check-in
  'buyer'              -- Comprador final
);
```

### `order_status`
```sql
CREATE TYPE order_status AS ENUM (
  'rascunho',          -- Pedido não finalizado
  'aguardando_pagto',  -- Aguardando confirmação de pagamento
  'pago',              -- Pago e confirmado
  'cancelado'          -- Cancelado
);
```

### `ticket_status`
```sql
CREATE TYPE ticket_status AS ENUM (
  'emitido',           -- Ingresso emitido
  'transferido',       -- Transferido para outro usuário
  'cancelado',         -- Cancelado
  'checkin'            -- Check-in realizado
);
```

### `coupon_type`
```sql
CREATE TYPE coupon_type AS ENUM (
  'percentual',        -- Desconto percentual (ex: 10%)
  'valor',             -- Desconto em valor fixo (ex: R$ 10)
  'cortesia'           -- Cortesia (100% desconto)
);
```

### `checkin_result`
```sql
CREATE TYPE checkin_result AS ENUM (
  'ok',                -- Check-in bem-sucedido
  'duplicado',         -- Tentativa de check-in duplicado
  'invalido',          -- QR Code inválido
  'cancelado'          -- Ingresso cancelado
);
```

---

## 📐 Modelo de Dados

### Diagrama ER Simplificado

```
tenants (organizadores)
  └── app_users (usuários)
       └── user_roles (RBAC)
  └── events (eventos)
       ├── sectors (setores/áreas)
       │    └── ticket_types (tipos de ingresso)
       │         └── lots (lotes de venda)
       ├── orders (pedidos)
       │    └── tickets (ingressos nomeados)
       │         ├── transfers (transferências)
       │         ├── checkins (check-ins)
       │         └── revocations (revogações/CRL)
       └── coupons (cupons)
            └── coupon_usage (uso de cupons)

audit_logs (auditoria geral)
```

---

## 🗃️ Tabelas

### 1. **tenants** (Organizadores)

Cada tenant representa um organizador de eventos independente.

```sql
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  subdominio text UNIQUE NOT NULL,
  logo_url text,
  plano text DEFAULT 'trial',
  jwk_set jsonb DEFAULT '{}'::jsonb,         -- JSON Web Key Set para QR Codes
  jwk_active_kid text,                        -- Key ID ativa
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Campos importantes**:
- `jwk_set`: Armazena chaves criptográficas para assinatura de QR Codes
- `jwk_active_kid`: Identifica qual chave está ativa

---

### 2. **app_users** (Usuários do App)

Mapeiam usuários do `auth.users` (Supabase Auth).

```sql
CREATE TABLE app_users (
  id uuid PRIMARY KEY,                        -- Mesmo ID do auth.users
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  cpf text,                                   -- Opcional (LGPD)
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Nota de Privacidade**: CPF armazenado apenas quando necessário (compra de ingressos).

---

### 3. **user_roles** (Papéis/RBAC)

Define permissões de usuários por tenant.

```sql
CREATE TABLE user_roles (
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  role role_type NOT NULL,
  PRIMARY KEY (user_id, tenant_id, role)
);
```

**Exemplo**: Um usuário pode ser `organizer_admin` em um tenant e `buyer` em outro.

---

### 4. **events** (Eventos)

```sql
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  local text,
  geo jsonb,                                  -- Coordenadas geográficas
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  capacidade_total int NOT NULL CHECK (capacidade_total >= 0),
  status text NOT NULL DEFAULT 'rascunho',   -- rascunho, publicado, cancelado
  imagem_url text,
  regras_limite jsonb DEFAULT '{}'::jsonb,   -- Regras de compra
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**`regras_limite`** (exemplo):
```json
{
  "maxTotalPorPedido": 6,
  "maxPorCPFPorTipo": 4,
  "maxPorCPFNoEvento": 6
}
```

---

### 5. **sectors** (Setores/Áreas)

Áreas dentro do evento (sem assentos numerados).

```sql
CREATE TABLE sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,                         -- Ex: "Pista", "Camarote"
  capacidade int NOT NULL CHECK (capacidade >= 0),
  ordem int NOT NULL DEFAULT 0                -- Ordem de exibição
);
```

---

### 6. **ticket_types** (Tipos de Ingresso)

Cada setor pode ter múltiplos tipos (Inteira, Meia, VIP, etc.).

```sql
CREATE TABLE ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sector_id uuid NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,                         -- Ex: "Pista Inteira"
  preco numeric(12,2) NOT NULL CHECK (preco >= 0),
  taxa numeric(12,2) NOT NULL DEFAULT 0 CHECK (taxa >= 0),
  meia_elegivel boolean NOT NULL DEFAULT false,
  max_por_pedido int,                         -- Limite por tipo
  ativo boolean NOT NULL DEFAULT true
);
```

---

### 7. **lots** (Lotes de Venda)

Lotes progressivos de cada tipo de ingresso.

```sql
CREATE TABLE lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type_id uuid NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,                         -- Ex: "1º Lote"
  preco numeric(12,2) NOT NULL CHECK (preco >= 0),
  qtd_total int NOT NULL CHECK (qtd_total >= 0),
  qtd_vendida int NOT NULL DEFAULT 0 CHECK (qtd_vendida >= 0),
  inicio_vendas timestamptz,
  fim_vendas timestamptz
);
```

**Validação**: `qtd_vendida <= qtd_total` (implementar via trigger se necessário).

---

### 8. **orders** (Pedidos)

```sql
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  total numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  status order_status NOT NULL DEFAULT 'rascunho',
  payment_provider text,                      -- Ex: "stripe", "pagarme"
  payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

### 9. **tickets** (Ingressos Nomeados)

Cada ingresso é nomeado e possui CPF do titular.

```sql
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ticket_type_id uuid NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  sector_id uuid NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome_titular text NOT NULL,
  cpf_titular text NOT NULL,
  status ticket_status NOT NULL DEFAULT 'emitido',
  qr_version int NOT NULL DEFAULT 1,
  qr_nonce text,                              -- Nonce para renovação de QR
  qr_kid text,                                -- Key ID usada
  qr_last_issued_at timestamptz
);
```

**QR Code**: Assinado com JWK do tenant, contém `ticket_id`, `qr_version`, `qr_nonce`.

---

### 10. **transfers** (Transferências)

Permite transferir ingressos entre usuários.

```sql
CREATE TABLE transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  to_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  status text NOT NULL DEFAULT 'pendente'     -- pendente, aceito, recusado
);
```

---

### 11. **coupons** (Cupons)

```sql
CREATE TABLE coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  tipo coupon_type NOT NULL,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  combinavel boolean NOT NULL DEFAULT false,
  limites jsonb DEFAULT '{}'::jsonb,          -- Limites de uso
  uso_total int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  UNIQUE (event_id, codigo)
);
```

**`limites`** (exemplo):
```json
{
  "limiteTotal": 200,
  "limitePorCPF": 2,
  "whitelistTipos": ["66666666-6666-6666-6666-666666666661"]
}
```

---

### 12. **coupon_usage** (Uso de Cupons)

Rastreia uso de cupons por pedido/usuário.

```sql
CREATE TABLE coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  cpf text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

### 13. **checkins** (Check-ins)

Registra check-ins de ingressos.

```sql
CREATE TABLE checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  operator_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  device_id text,
  gate text,                                  -- Ex: "Portão A"
  online boolean NOT NULL DEFAULT true,       -- Check-in online/offline
  resultado checkin_result NOT NULL
);
```

---

### 14. **revocations** (Revogações)

CRL simplificada para invalidar QR Codes.

```sql
CREATE TABLE revocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Uso**: App de check-in verifica se `ticket_id` está em `revocations` antes de aceitar.

---

### 15. **audit_logs** (Auditoria)

Log geral de ações no sistema.

```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  acao text NOT NULL,
  alvo text,
  dados jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

## 🔒 Row Level Security (RLS)

### Estratégia

1. **Público**: Eventos publicados e seus setores/tipos/lotes são visíveis publicamente
2. **Membros do Tenant**: Acesso completo aos dados do seu tenant
3. **Usuários**: Veem seus próprios pedidos, ingressos e transferências
4. **Admins**: Gestão completa dentro do tenant

### Funções Helper

```sql
-- Verifica se usuário tem role específica no tenant
has_role(p_tenant uuid, p_role role_type) RETURNS boolean

-- Verifica se usuário é admin do tenant
is_tenant_admin(p_tenant uuid) RETURNS boolean

-- Verifica se usuário tem qualquer acesso ao tenant
has_tenant_access(p_tenant uuid) RETURNS boolean
```

### Exemplos de Políticas

#### Eventos (público pode ver publicados)
```sql
CREATE POLICY "public_can_view_published_events" ON events
FOR SELECT
USING (status = 'publicado');
```

#### Pedidos (usuário vê os seus)
```sql
CREATE POLICY "users_can_view_own_orders" ON orders
FOR SELECT
USING (buyer_id = auth.uid() OR has_tenant_access(tenant_id));
```

#### Check-ins (apenas operadores)
```sql
CREATE POLICY "checkin_operators_can_create_checkins" ON checkins
FOR INSERT
WITH CHECK (has_role(tenant_id, 'checkin_operator') OR is_tenant_admin(tenant_id));
```

---

## 📇 Índices

Índices criados para performance:

```sql
-- Usuários
CREATE INDEX idx_app_users_tenant ON app_users(tenant_id);
CREATE INDEX idx_app_users_email ON app_users(email);

-- Eventos
CREATE INDEX idx_events_tenant ON events(tenant_id);
CREATE INDEX idx_events_status ON events(status);

-- Ingressos
CREATE INDEX idx_tickets_tenant ON tickets(tenant_id);
CREATE INDEX idx_tickets_cpf ON tickets(cpf_titular);

-- Check-ins
CREATE INDEX idx_checkins_timestamp ON checkins(timestamp);

-- Auditoria
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

... (40+ índices no total)
```

---

## 🌱 Seeds Mínimos (Dados de Teste)

### IDs Fixos para Teste

| Entidade | ID | Descrição |
|----------|----|----|
| **Tenant** | `11111111-1111-1111-1111-111111111111` | Demo Org |
| **Admin** | `22222222-2222-2222-2222-222222222222` | admin@demo.com |
| **Operador** | `33333333-3333-3333-3333-333333333333` | operador@demo.com |
| **Evento** | `44444444-4444-4444-4444-444444444444` | Festa Teste |

### Estrutura Criada

1. **1 Tenant**: "Demo Org" (subdomínio: `demo`)
2. **2 Usuários**:
   - Admin Demo (`organizer_admin`)
   - Operador Portão A (`checkin_operator`)
3. **1 Evento**: "Festa Teste"
   - Data: 7 dias a partir de hoje
   - Capacidade: 1000 pessoas
   - Status: `publicado`
4. **3 Setores**:
   - Pista (700 pessoas)
   - Frontstage (200 pessoas)
   - Camarote (100 pessoas)
5. **6 Tipos de Ingresso** (2 por setor):
   - Pista Inteira (R$ 100) / Pista Meia (R$ 50)
   - Frontstage Inteira (R$ 150) / Frontstage Meia (R$ 75)
   - Camarote Inteira (R$ 200) / Camarote Meia (R$ 100)
6. **6 Lotes** (1º Lote, 200 unidades cada)
7. **2 Cupons**:
   - `INFLU_X`: 10% desconto (limite: 200 usos)
   - `CORTESIA`: 100% desconto (limite: 50 usos)

---

## 🔐 Segurança

### ✅ Implementado

1. **RLS habilitado** em todas as tabelas
2. **Políticas granulares** por tenant
3. **SECURITY DEFINER** functions para verificação de roles
4. **Validação de CPF** em ingressos
5. **Constraints** de integridade (CHECK, FOREIGN KEY)
6. **Isolamento por tenant** (todas as tabelas com `tenant_id`)

### ⚠️ Importante

- **CPF**: Armazenado apenas quando necessário (LGPD)
- **QR Codes**: Assinados com JWK (não reutilizáveis)
- **Revogações**: CRL para invalidar ingressos cancelados
- **Auditoria**: Log completo de ações críticas

---

## 🚀 Próximos Passos

### Etapa 2: Lógica de Negócio

1. **Triggers** para:
   - Atualizar `qtd_vendida` em `lots`
   - Validar limites de compra (CPF, pedido)
   - Atualizar `updated_at` em `app_users`

2. **Functions** para:
   - Validar cupons (limites, combinabilidade)
   - Calcular preço final com cupons
   - Gerar QR Code assinado
   - Validar QR Code no check-in

3. **Views** para:
   - Disponibilidade de ingressos por lote
   - Relatórios de vendas
   - Dashboard de check-in

### Etapa 3: Frontend

1. **Landing de Evento** (público)
2. **Checkout** de ingressos
3. **Dashboard do Organizador**
4. **App de Check-in** (móvel)

---

## 📚 Referências

- **Fuso Horário**: `America/Sao_Paulo` (UTC-3)
- **Moeda**: BRL (Real Brasileiro)
- **Idioma**: pt-BR
- **Framework**: React + Vite + TypeScript
- **Backend**: Supabase (PostgreSQL 15+)

---

**Versão do Schema**: 1.0.0  
**Última atualização**: 02/10/2025  
**Status**: ✅ Produção-Ready (Etapa 0 concluída)
