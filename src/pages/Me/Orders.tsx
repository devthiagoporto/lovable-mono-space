import { useEffect, useState } from 'react';
import { getMyOrders } from '@/services/me';
import { formatDate } from '@/lib/utils/date';
import { withAuth } from '@/features/auth/withAuth';

function OrdersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { 
        setRows(await getMyOrders()); 
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally { 
        setLoading(false); 
      }
    })();
  }, []);

  if (loading) return <div className="container mx-auto p-4">Carregando…</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Meus Pedidos</h1>
      <div className="space-y-3">
        {rows.map((o) => (
          <div key={o.id} className="border rounded p-3 bg-card">
            <div><b>Pedido:</b> {o.id}</div>
            <div><b>Status:</b> {o.status}</div>
            <div><b>Total:</b> R$ {Number(o.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div><b>Criado em:</b> {formatDate(o.created_at)}</div>
          </div>
        ))}
        {rows.length === 0 && <div>Nenhum pedido encontrado.</div>}
      </div>
    </div>
  );
}

export default withAuth(OrdersPage);
