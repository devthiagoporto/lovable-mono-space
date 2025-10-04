-- Tabela para garantir idempotência dos webhooks de pagamento
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('stripe','pagarme','mercadopago','pix_manual')),
  external_event_id text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- Unicidade do evento por provedor
CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_webhook_events_provider_event
  ON public.payment_webhook_events (provider, external_event_id);

-- Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_created_at
  ON public.payment_webhook_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_order
  ON public.payment_webhook_events (order_id);

-- RLS: habilita, mas não cria políticas (somente service_role acessa via bypass)
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- RPC para "reclamar" o evento de forma atômica
DROP FUNCTION IF EXISTS public.claim_webhook_event(text, text, uuid, uuid, jsonb);

CREATE OR REPLACE FUNCTION public.claim_webhook_event(
  p_external_id text,
  p_provider text,
  p_order_id uuid,
  p_tenant_id uuid,
  p_payload jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _jwt_role text := current_setting('request.jwt.claim.role', true);
  _claimed boolean := false;
BEGIN
  IF _jwt_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  INSERT INTO public.payment_webhook_events (provider, external_event_id, order_id, tenant_id, payload)
  VALUES (p_provider, p_external_id, p_order_id, p_tenant_id, p_payload)
  ON CONFLICT (provider, external_event_id) DO NOTHING
  RETURNING true INTO _claimed;

  RETURN COALESCE(_claimed, false);
END;
$$;

-- Permissões: apenas service_role
REVOKE ALL ON FUNCTION public.claim_webhook_event(text, text, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_webhook_event(text, text, uuid, uuid, jsonb) TO postgres, service_role;