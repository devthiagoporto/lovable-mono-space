-- RPC: incrementa estoque vendido de um lote de forma atômica
-- Usada pelo webhook do Stripe. Restrita à service_role.
DROP FUNCTION IF EXISTS public.increment_lot_safely(uuid, integer);

CREATE OR REPLACE FUNCTION public.increment_lot_safely(p_lot_id uuid, p_inc integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _jwt_role text := current_setting('request.jwt.claim.role', true);
  _ok boolean := false;
BEGIN
  IF p_inc IS NULL OR p_inc <= 0 THEN
    RAISE EXCEPTION 'INC_MUST_BE_POSITIVE';
  END IF;

  -- Somente a função deve ser chamada por edge functions com service key
  IF _jwt_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- Incremento condicional (garante que não excede o total)
  UPDATE public.lots
     SET qtd_vendida = qtd_vendida + p_inc
   WHERE id = p_lot_id
     AND (qtd_vendida + p_inc) <= qtd_total
  RETURNING true INTO _ok;

  RETURN COALESCE(_ok, false);
END;
$$;

-- Permissões: só service_role executa
REVOKE ALL ON FUNCTION public.increment_lot_safely(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_lot_safely(uuid, integer) TO postgres, service_role;