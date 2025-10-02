-- ============================================================
-- SAAS MULTI-TENANT DE INGRESSOS (SEM ASSENTOS)
-- Schema: pt-BR, BRL, America/Sao_Paulo
-- ============================================================

-- ENUMS
CREATE TYPE role_type AS ENUM (
  'admin_saas',
  'organizer_admin',
  'organizer_staff',
  'checkin_operator',
  'buyer'
);

CREATE TYPE order_status AS ENUM (
  'rascunho',
  'aguardando_pagto',
  'pago',
  'cancelado'
);

CREATE TYPE ticket_status AS ENUM (
  'emitido',
  'transferido',
  'cancelado',
  'checkin'
);

CREATE TYPE coupon_type AS ENUM (
  'percentual',
  'valor',
  'cortesia'
);

CREATE TYPE checkin_result AS ENUM (
  'ok',
  'duplicado',
  'invalido',
  'cancelado'
);

-- ============================================================
-- TABELAS
-- ============================================================

-- Tenants (organizadores)
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  subdominio text UNIQUE NOT NULL,
  logo_url text,
  plano text DEFAULT 'trial',
  jwk_set jsonb DEFAULT '{}'::jsonb,
  jwk_active_kid text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Usuários de app (mapeiam auth.users)
CREATE TABLE app_users (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  cpf text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Papéis (RBAC)
CREATE TABLE user_roles (
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  role role_type NOT NULL,
  PRIMARY KEY (user_id, tenant_id, role)
);

-- Eventos
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  local text,
  geo jsonb,
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  capacidade_total int NOT NULL CHECK (capacidade_total >= 0),
  status text NOT NULL DEFAULT 'rascunho',
  imagem_url text,
  regras_limite jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Setores (áreas)
CREATE TABLE sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  capacidade int NOT NULL CHECK (capacidade >= 0),
  ordem int NOT NULL DEFAULT 0
);

-- Tipos de ingresso (por setor)
CREATE TABLE ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sector_id uuid NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  preco numeric(12,2) NOT NULL CHECK (preco >= 0),
  taxa numeric(12,2) NOT NULL DEFAULT 0 CHECK (taxa >= 0),
  meia_elegivel boolean NOT NULL DEFAULT false,
  max_por_pedido int,
  ativo boolean NOT NULL DEFAULT true
);

-- Lotes
CREATE TABLE lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type_id uuid NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  preco numeric(12,2) NOT NULL CHECK (preco >= 0),
  qtd_total int NOT NULL CHECK (qtd_total >= 0),
  qtd_vendida int NOT NULL DEFAULT 0 CHECK (qtd_vendida >= 0),
  inicio_vendas timestamptz,
  fim_vendas timestamptz
);

-- Pedidos
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  total numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  status order_status NOT NULL DEFAULT 'rascunho',
  payment_provider text,
  payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ingressos (nomeados + CPF)
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
  qr_nonce text,
  qr_kid text,
  qr_last_issued_at timestamptz
);

-- Transferências
CREATE TABLE transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  to_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  status text NOT NULL DEFAULT 'pendente'
);

-- Cupons
CREATE TABLE coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  tipo coupon_type NOT NULL,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  combinavel boolean NOT NULL DEFAULT false,
  limites jsonb DEFAULT '{}'::jsonb,
  uso_total int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  UNIQUE (event_id, codigo)
);

-- Uso de cupom
CREATE TABLE coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  cpf text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Check-ins
CREATE TABLE checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  operator_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  device_id text,
  gate text,
  online boolean NOT NULL DEFAULT true,
  resultado checkin_result NOT NULL
);

-- Revogações (CRL simplificada)
CREATE TABLE revocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auditoria
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  acao text NOT NULL,
  alvo text,
  dados jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_app_users_tenant ON app_users(tenant_id);
CREATE INDEX idx_app_users_email ON app_users(email);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_tenant ON user_roles(tenant_id);
CREATE INDEX idx_events_tenant ON events(tenant_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_sectors_event ON sectors(event_id);
CREATE INDEX idx_sectors_tenant ON sectors(tenant_id);
CREATE INDEX idx_ticket_types_event ON ticket_types(event_id);
CREATE INDEX idx_ticket_types_sector ON ticket_types(sector_id);
CREATE INDEX idx_ticket_types_tenant ON ticket_types(tenant_id);
CREATE INDEX idx_lots_tt ON lots(ticket_type_id);
CREATE INDEX idx_lots_tenant ON lots(tenant_id);
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_event ON orders(event_id);
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_tickets_order ON tickets(order_id);
CREATE INDEX idx_tickets_tenant ON tickets(tenant_id);
CREATE INDEX idx_tickets_cpf ON tickets(cpf_titular);
CREATE INDEX idx_transfers_ticket ON transfers(ticket_id);
CREATE INDEX idx_transfers_tenant ON transfers(tenant_id);
CREATE INDEX idx_coupons_event ON coupons(event_id);
CREATE INDEX idx_coupons_tenant ON coupons(tenant_id);
CREATE INDEX idx_coupons_codigo ON coupons(event_id, codigo);
CREATE INDEX idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_order ON coupon_usage(order_id);
CREATE INDEX idx_coupon_usage_tenant ON coupon_usage(tenant_id);
CREATE INDEX idx_checkins_ticket ON checkins(ticket_id);
CREATE INDEX idx_checkins_tenant ON checkins(tenant_id);
CREATE INDEX idx_checkins_timestamp ON checkins(timestamp);
CREATE INDEX idx_revocations_ticket ON revocations(ticket_id);
CREATE INDEX idx_revocations_tenant ON revocations(tenant_id);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================
-- VIEWS E FUNÇÕES HELPER
-- ============================================================

-- VIEW: memberships do usuário atual
CREATE OR REPLACE VIEW current_user_memberships AS
SELECT ur.user_id, ur.tenant_id, ur.role
FROM user_roles ur
WHERE ur.user_id = auth.uid();

-- FUNÇÃO: verifica se usuário possui role em tenant
CREATE OR REPLACE FUNCTION has_role(p_tenant uuid, p_role role_type)
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
      AND tenant_id = p_tenant 
      AND role = p_role
  );
$$;

-- FUNÇÃO: verifica se usuário tem qualquer role admin no tenant
CREATE OR REPLACE FUNCTION is_tenant_admin(p_tenant uuid)
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
      AND tenant_id = p_tenant 
      AND role IN ('organizer_admin', 'admin_saas')
  );
$$;

-- FUNÇÃO: verifica se usuário tem acesso ao tenant
CREATE OR REPLACE FUNCTION has_tenant_access(p_tenant uuid)
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
      AND tenant_id = p_tenant
  );
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE revocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS RLS: TENANTS
-- ============================================================

CREATE POLICY "users_can_view_their_tenants" ON tenants
FOR SELECT
USING (id IN (SELECT tenant_id FROM current_user_memberships));

CREATE POLICY "admins_can_update_tenants" ON tenants
FOR UPDATE
USING (is_tenant_admin(id))
WITH CHECK (is_tenant_admin(id));

-- ============================================================
-- POLÍTICAS RLS: APP_USERS
-- ============================================================

CREATE POLICY "users_can_view_themselves" ON app_users
FOR SELECT
USING (id = auth.uid() OR has_tenant_access(tenant_id));

CREATE POLICY "users_can_update_themselves" ON app_users
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "admins_can_manage_users" ON app_users
FOR ALL
USING (is_tenant_admin(tenant_id))
WITH CHECK (is_tenant_admin(tenant_id));

-- ============================================================
-- POLÍTICAS RLS: USER_ROLES
-- ============================================================

CREATE POLICY "users_can_view_roles" ON user_roles
FOR SELECT
USING (user_id = auth.uid() OR is_tenant_admin(tenant_id));

CREATE POLICY "admins_can_manage_roles" ON user_roles
FOR ALL
USING (is_tenant_admin(tenant_id))
WITH CHECK (is_tenant_admin(tenant_id));

-- ============================================================
-- POLÍTICAS RLS: EVENTS
-- ============================================================

CREATE POLICY "public_can_view_published_events" ON events
FOR SELECT
USING (status = 'publicado');

CREATE POLICY "tenant_members_can_view_events" ON events
FOR SELECT
USING (has_tenant_access(tenant_id));

CREATE POLICY "tenant_members_can_manage_events" ON events
FOR ALL
USING (has_tenant_access(tenant_id))
WITH CHECK (has_tenant_access(tenant_id));

-- ============================================================
-- POLÍTICAS RLS: SECTORS
-- ============================================================

CREATE POLICY "public_can_view_sectors_of_published_events" ON sectors
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = sectors.event_id 
      AND events.status = 'publicado'
  )
);

CREATE POLICY "tenant_members_can_manage_sectors" ON sectors
FOR ALL
USING (has_tenant_access(tenant_id))
WITH CHECK (has_tenant_access(tenant_id));

-- ============================================================
-- POLÍTICAS RLS: TICKET_TYPES
-- ============================================================

CREATE POLICY "public_can_view_ticket_types_of_published_events" ON ticket_types
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = ticket_types.event_id 
      AND events.status = 'publicado'
  )
);

CREATE POLICY "tenant_members_can_manage_ticket_types" ON ticket_types
FOR ALL
USING (has_tenant_access(tenant_id))
WITH CHECK (has_tenant_access(tenant_id));

-- ============================================================
-- POLÍTICAS RLS: LOTS
-- ============================================================

CREATE POLICY "public_can_view_lots_of_published_events" ON lots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ticket_types tt
    JOIN events e ON e.id = tt.event_id
    WHERE tt.id = lots.ticket_type_id 
      AND e.status = 'publicado'
  )
);

CREATE POLICY "tenant_members_can_manage_lots" ON lots
FOR ALL
USING (has_tenant_access(tenant_id))
WITH CHECK (has_tenant_access(tenant_id));

-- ============================================================
-- POLÍTICAS RLS: ORDERS
-- ============================================================

CREATE POLICY "users_can_view_own_orders" ON orders
FOR SELECT
USING (buyer_id = auth.uid() OR has_tenant_access(tenant_id));

CREATE POLICY "users_can_create_orders" ON orders
FOR INSERT
WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "users_can_update_own_draft_orders" ON orders
FOR UPDATE
USING (buyer_id = auth.uid() AND status = 'rascunho')
WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "tenant_members_can_manage_orders" ON orders
FOR ALL
USING (has_tenant_access(tenant_id))
WITH CHECK (has_tenant_access(tenant_id));

-- ============================================================
-- POLÍTICAS RLS: TICKETS
-- ============================================================

CREATE POLICY "users_can_view_own_tickets" ON tickets
FOR SELECT
USING (
  cpf_titular = (SELECT cpf FROM app_users WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM orders WHERE orders.id = tickets.order_id AND orders.buyer_id = auth.uid())
  OR has_tenant_access(tenant_id)
);

CREATE POLICY "tenant_members_can_manage_tickets" ON tickets
FOR ALL
USING (has_tenant_access(tenant_id))
WITH CHECK (has_tenant_access(tenant_id));

-- ============================================================
-- POLÍTICAS RLS: TRANSFERS
-- ============================================================

CREATE POLICY "users_can_view_own_transfers" ON transfers
FOR SELECT
USING (
  from_user_id = auth.uid() 
  OR to_user_id = auth.uid() 
  OR has_tenant_access(tenant_id)
);

CREATE POLICY "users_can_create_transfers" ON transfers
FOR INSERT
WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "users_can_accept_transfers" ON transfers
FOR UPDATE
USING (to_user_id = auth.uid() AND status = 'pendente')
WITH CHECK (to_user_id = auth.uid());

CREATE POLICY "tenant_members_can_manage_transfers" ON transfers
FOR ALL
USING (has_tenant_access(tenant_id))
WITH CHECK (has_tenant_access(tenant_id));

-- ============================================================
-- POLÍTICAS RLS: COUPONS
-- ============================================================

CREATE POLICY "public_can_view_active_coupons" ON coupons
FOR SELECT
USING (
  ativo = true 
  AND EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = coupons.event_id 
      AND events.status = 'publicado'
  )
);

CREATE POLICY "tenant_members_can_manage_coupons" ON coupons
FOR ALL
USING (has_tenant_access(tenant_id))
WITH CHECK (has_tenant_access(tenant_id));

-- ============================================================
-- POLÍTICAS RLS: COUPON_USAGE
-- ============================================================

CREATE POLICY "users_can_view_own_coupon_usage" ON coupon_usage
FOR SELECT
USING (
  user_id = auth.uid() 
  OR has_tenant_access(tenant_id)
);

CREATE POLICY "users_can_create_coupon_usage" ON coupon_usage
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "tenant_members_can_view_coupon_usage" ON coupon_usage
FOR SELECT
USING (has_tenant_access(tenant_id));

-- ============================================================
-- POLÍTICAS RLS: CHECKINS
-- ============================================================

CREATE POLICY "checkin_operators_can_create_checkins" ON checkins
FOR INSERT
WITH CHECK (has_role(tenant_id, 'checkin_operator') OR is_tenant_admin(tenant_id));

CREATE POLICY "tenant_members_can_view_checkins" ON checkins
FOR SELECT
USING (has_tenant_access(tenant_id));

-- ============================================================
-- POLÍTICAS RLS: REVOCATIONS
-- ============================================================

CREATE POLICY "tenant_admins_can_manage_revocations" ON revocations
FOR ALL
USING (is_tenant_admin(tenant_id))
WITH CHECK (is_tenant_admin(tenant_id));

-- ============================================================
-- POLÍTICAS RLS: AUDIT_LOGS
-- ============================================================

CREATE POLICY "tenant_admins_can_view_audit_logs" ON audit_logs
FOR SELECT
USING (is_tenant_admin(tenant_id));