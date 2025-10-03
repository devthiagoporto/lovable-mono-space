-- Enum para provedores de pagamento
CREATE TYPE payment_provider AS ENUM ('stripe', 'pagarme', 'mercadopago', 'pix_manual');

-- Tabela de gateways de pagamento por tenant
CREATE TABLE public.payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider payment_provider NOT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider)
);

-- Índices
CREATE INDEX idx_payment_gateways_tenant ON payment_gateways(tenant_id);
CREATE INDEX idx_payment_gateways_provider ON payment_gateways(provider);

-- Habilitar RLS
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "tenant_members_can_view_payment_gateways"
  ON public.payment_gateways
  FOR SELECT
  USING (has_tenant_access(tenant_id));

CREATE POLICY "tenant_admins_can_insert_payment_gateways"
  ON public.payment_gateways
  FOR INSERT
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "tenant_admins_can_update_payment_gateways"
  ON public.payment_gateways
  FOR UPDATE
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "tenant_admins_can_delete_payment_gateways"
  ON public.payment_gateways
  FOR DELETE
  USING (is_tenant_admin(tenant_id));

-- Seeds para tenant demo
INSERT INTO payment_gateways (tenant_id, provider, active, config)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'stripe', false, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111111', 'pagarme', false, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111111', 'mercadopago', false, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111111', 'pix_manual', false, '{}'::jsonb)
ON CONFLICT (tenant_id, provider) DO NOTHING;