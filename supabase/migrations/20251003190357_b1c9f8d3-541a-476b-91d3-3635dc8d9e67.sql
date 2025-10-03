-- Função helper para incrementar estoque de lote atomicamente
CREATE OR REPLACE FUNCTION public.increment_lot_sold(
  p_lot_id UUID,
  p_quantity INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_sold INTEGER;
  v_total INTEGER;
BEGIN
  -- Lock the row for update
  SELECT qtd_vendida, qtd_total 
  INTO v_current_sold, v_total
  FROM lots
  WHERE id = p_lot_id
  FOR UPDATE;

  -- Check if lot exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lot not found: %', p_lot_id;
  END IF;

  -- Check if we have enough stock
  IF (v_current_sold + p_quantity) > v_total THEN
    RAISE EXCEPTION 'Insufficient stock for lot %: current=%, requested=%, total=%', 
      p_lot_id, v_current_sold, p_quantity, v_total;
  END IF;

  -- Update the stock
  UPDATE lots
  SET qtd_vendida = qtd_vendida + p_quantity
  WHERE id = p_lot_id;

  RETURN TRUE;
END;
$$;