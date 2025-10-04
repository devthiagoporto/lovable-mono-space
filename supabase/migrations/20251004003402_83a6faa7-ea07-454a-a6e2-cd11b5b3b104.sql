DROP VIEW IF EXISTS v_my_tickets;

CREATE VIEW v_my_tickets AS
SELECT
  t.id               AS ticket_id,
  t.tenant_id        AS tenant_id,
  t.status           AS ticket_status,
  tt.nome            AS ticket_type_name,
  e.titulo           AS event_title,
  o.id               AS order_id,
  e.inicio,
  e.fim
FROM tickets t
JOIN ticket_types tt ON tt.id = t.ticket_type_id
JOIN orders o       ON o.id  = t.order_id
JOIN events e       ON e.id  = tt.event_id
WHERE o.buyer_id = auth.uid();