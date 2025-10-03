-- Ajustar tabela payment_gateways para match com especificação
-- Se a tabela já existe, vamos renomear as colunas
ALTER TABLE IF EXISTS public.payment_gateways 
  RENAME COLUMN active TO is_active;

ALTER TABLE IF EXISTS public.payment_gateways 
  RENAME COLUMN config TO credentials;

-- Se a tabela não existe, criar do zero
CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe','pagarme','mercadopago','pix_manual')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_tenant_provider UNIQUE (tenant_id, provider)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payment_gateways_tenant ON payment_gateways(tenant_id);

-- RLS já está habilitado, vamos recriar as políticas com nomes corretos
DROP POLICY IF EXISTS "tenant_members_can_view_payment_gateways" ON payment_gateways;
DROP POLICY IF EXISTS "tenant_admins_can_insert_payment_gateways" ON payment_gateways;
DROP POLICY IF EXISTS "tenant_admins_can_update_payment_gateways" ON payment_gateways;
DROP POLICY IF EXISTS "tenant_admins_can_delete_payment_gateways" ON payment_gateways;

-- Políticas RLS
CREATE POLICY "members_can_view_gateways"
  ON public.payment_gateways
  FOR SELECT
  USING (has_tenant_access(tenant_id));

CREATE POLICY "admins_can_insert_gateways"
  ON public.payment_gateways
  FOR INSERT
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "admins_can_update_gateways"
  ON public.payment_gateways
  FOR UPDATE
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "admins_can_delete_gateways"
  ON public.payment_gateways
  FOR DELETE
  USING (is_tenant_admin(tenant_id));

-- Seeds para o tenant demo (se não existirem)
INSERT INTO payment_gateways (tenant_id, provider, is_active, credentials)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'stripe', false, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111111', 'pagarme', false, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111111', 'mercadopago', false, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111111', 'pix_manual', false, '{}'::jsonb)
ON CONFLICT (tenant_id, provider) DO NOTHING;