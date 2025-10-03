-- VIEW: tickets do usuário logado (somente eventos publicados)
CREATE OR REPLACE VIEW v_my_tickets AS
SELECT
  t.id                         AS ticket_id,
  t.status                     AS ticket_status,
  t.order_id,
  t.ticket_type_id,
  t.sector_id,
  tt.nome                      AS ticket_type_name,
  e.titulo                     AS event_title,
  e.inicio,
  e.fim,
  t.tenant_id
FROM tickets t
JOIN ticket_types tt ON tt.id = t.ticket_type_id
JOIN events e ON e.id = tt.event_id
WHERE
  e.status = 'publicado'
  AND EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.id = t.order_id
      AND o.buyer_id = auth.uid()
  );