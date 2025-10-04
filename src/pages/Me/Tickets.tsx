import { useEffect, useState } from 'react';
import { withAuth } from '@/features/auth/withAuth';
import { formatDate } from '@/lib/utils/date';
import { assignTicket } from '@/services/tickets';
import { supabase } from '@/integrations/supabase/client';
import QRCode from 'qrcode';

type MyTicketRow = {
  ticket_id: string;
  tenant_id: string;
  ticket_status: 'emitido' | 'transferido' | 'cancelado' | 'checkin';
  ticket_type_name: string;
  event_title: string;
  order_id: string;
  inicio: string;
  fim: string;
};

async function getMyTickets(): Promise<MyTicketRow[]> {
  const { data, error } = await supabase.functions.invoke('my-tickets');
  if (error) throw error;
  return (data?.tickets ?? []) as MyTicketRow[];
}

function TicketsPage() {
  const [rows, setRows] = useState<MyTicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [qrData, setQrData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

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

  const startEdit = (t: MyTicketRow) => {
    setEditing(t.ticket_id);
    setNome('');
    setCpf('');
  };

  const cancelEdit = () => {
    setEditing(null);
    setNome('');
    setCpf('');
  };

  const doAssign = async (t: MyTicketRow) => {
    try {
      setSaving(t.ticket_id);
      const res = await assignTicket(t.tenant_id, t.ticket_id, nome.trim(), cpf.trim());
      // Gera QR como data URL para exibir
      const dataUrl = await QRCode.toDataURL(res.qr, { margin: 1, scale: 4 });
      setQrData((prev) => ({ ...prev, [t.ticket_id]: dataUrl }));
      setEditing(null);
      // refetch simples
      setRows(await getMyTickets());
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao nomear/emitir QR');
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="container mx-auto p-4">Carregando…</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Meus Tickets</h1>

      {rows.map((t) => {
        const canName = t.ticket_status === 'emitido' || t.ticket_status === 'transferido';
        const isEditing = editing === t.ticket_id;
        const isSaving = saving === t.ticket_id;

        return (
          <div key={t.ticket_id} className="rounded-xl border p-4 space-y-2 bg-card">
            <div className="flex items-center justify-between">
              <div className="font-medium">{t.event_title} — {t.ticket_type_name}</div>
              <div className="text-sm opacity-70">Ticket: {t.ticket_id}</div>
            </div>
            <div className="text-sm">
              Status: <b>{t.ticket_status}</b> · Pedido: {t.order_id}
            </div>
            <div className="text-sm">
              Início: {formatDate(t.inicio)} · Fim: {formatDate(t.fim)}
            </div>

            {!isEditing && canName && (
              <div className="pt-2">
                <button
                  onClick={() => startEdit(t)}
                  className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90"
                >
                  Nomear / Emitir QR
                </button>
              </div>
            )}

            {isEditing && (
              <div className="space-y-2 pt-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className="border rounded-lg px-3 py-2 bg-background"
                    placeholder="Nome completo do titular"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                  <input
                    className="border rounded-lg px-3 py-2 bg-background"
                    placeholder="CPF do titular (somente números)"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => doAssign(t)}
                    disabled={isSaving}
                    className="px-3 py-1 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-60"
                  >
                    {isSaving ? 'Salvando…' : 'Salvar e gerar QR'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1 rounded-lg border text-sm hover:bg-accent"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {qrData[t.ticket_id] && (
              <div className="pt-3">
                <div className="text-sm mb-1">QR gerado:</div>
                <img
                  src={qrData[t.ticket_id]}
                  alt="QR Code"
                  className="border rounded-lg p-2 bg-white max-w-xs"
                />
              </div>
            )}
          </div>
        );
      })}

      {rows.length === 0 && <div className="opacity-60">Nenhum ticket encontrado.</div>}
    </div>
  );
}

export default withAuth(TicketsPage);
