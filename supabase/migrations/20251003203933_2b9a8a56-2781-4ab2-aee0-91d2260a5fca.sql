-- RLS: comprador pode atualizar seus próprios tickets (nome/cpf) enquanto emitidos/transferidos
DROP POLICY IF EXISTS "buyer_update_own_tickets" ON tickets;
CREATE POLICY "buyer_update_own_tickets" ON tickets
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM orders o WHERE o.id = tickets.order_id AND o.buyer_id = auth.uid())
  AND tickets.status IN ('emitido','transferido')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM orders o WHERE o.id = tickets.order_id AND o.buyer_id = auth.uid())
);