-- ETAPA: Adicionar itens do pedido para permitir emissão de ingressos no webhook

-- 1) Tabela order_items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ticket_type_id uuid NOT NULL REFERENCES ticket_types(id) ON DELETE RESTRICT,
  lot_id uuid NOT NULL REFERENCES lots(id) ON DELETE RESTRICT,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Índices
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_tenant ON order_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_lot ON order_items(lot_id);
CREATE INDEX IF NOT EXISTS idx_order_items_type ON order_items(ticket_type_id);

-- 3) RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Leitura: comprador do pedido ou membros do tenant
DROP POLICY IF EXISTS "buyer_or_tenant_can_select_order_items" ON order_items;
CREATE POLICY "buyer_or_tenant_can_select_order_items" ON order_items
FOR SELECT USING (
  has_tenant_access(tenant_id)
  OR EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
      AND o.buyer_id = auth.uid()
  )
);

-- Escrita: apenas membros do tenant (staff/admin)
DROP POLICY IF EXISTS "tenant_can_write_order_items" ON order_items;
CREATE POLICY "tenant_can_write_order_items" ON order_items
FOR ALL
USING (has_tenant_access(tenant_id))
WITH CHECK (has_tenant_access(tenant_id));