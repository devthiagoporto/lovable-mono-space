import { useEffect, useState } from 'react';
import { getMyTickets } from '@/services/me';
import { formatDate } from '@/lib/utils/date';
import { withAuth } from '@/features/auth/withAuth';

function TicketsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { 
        setRows(await getMyTickets()); 
      } catch (err) {
        console.error('Failed to load tickets:', err);
      } finally { 
        setLoading(false); 
      }
    })();
  }, []);

  if (loading) return <div className="container mx-auto p-4">Carregando…</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Meus Tickets</h1>
      <div className="space-y-3">
        {rows.map((t) => (
          <div key={t.ticket_id} className="border rounded p-3 bg-card">
            <div className="font-medium">{t.event_title} — {t.ticket_type_name}</div>
            <div><b>Ticket:</b> {t.ticket_id}</div>
            <div><b>Status:</b> {t.ticket_status}</div>
            <div><b>Pedido:</b> {t.order_id}</div>
            <div><b>Início:</b> {formatDate(t.inicio)}</div>
            <div><b>Fim:</b> {formatDate(t.fim)}</div>
          </div>
        ))}
        {rows.length === 0 && <div>Nenhum ticket encontrado.</div>}
      </div>
    </div>
  );
}

export default withAuth(TicketsPage);
