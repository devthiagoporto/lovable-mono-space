import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useAuth } from "@/contexts/AuthContext";
import { scanCheckin, CheckinResult } from "@/services/checkin";
import { withRole } from "@/features/auth/withRole";

function CheckinScanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReader = useMemo(() => new BrowserMultiFormatReader(), []);
  const { memberships } = useAuth();
  const defaultTenant = memberships?.find(m => m.role === "checkin_operator") ?? memberships?.[0];
  const [tenantId, setTenantId] = useState<string>(defaultTenant?.tenantId ?? "");
  const [gate, setGate] = useState<string>("Portão A");
  const [deviceId, setDeviceId] = useState<string>("scanner-web");
  const [lastText, setLastText] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{result?: CheckinResult; msg?: string}>({});

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) videoRef.current.srcObject = stream;
        const controls = await codeReader.decodeFromVideoDevice(undefined, videoRef.current!, async (res, err) => {
          if (stop || busy || !tenantId) return;
          if (res) {
            const text = res.getText();
            if (text && text !== lastText) {
              setLastText(text);
              setBusy(true);
              try {
                const r = await scanCheckin(tenantId, text, gate, deviceId);
                if (r.ok) setStatus({ result: r.result, msg: "Check-in OK" });
                else setStatus({ result: r.result, msg: r.error ?? "Falha no check-in" });
              } catch (e: any) {
                setStatus({ result: "invalido", msg: e?.message ?? "Erro" });
              } finally {
                setTimeout(() => { setBusy(false); setLastText(""); }, 900);
              }
            }
          }
        });
        return () => { stop = true; controls?.stop(); stream.getTracks().forEach(t => t.stop()); };
      } catch (e) {
        setStatus({ result: "invalido", msg: "Câmera não disponível" });
      }
    })();
  }, [codeReader, busy, lastText, tenantId, gate, deviceId]);

  const color =
    status.result === "ok" ? "bg-green-600" :
    status.result === "duplicado" ? "bg-yellow-500" :
    status.result === "cancelado" ? "bg-red-700" :
    status.result === "invalido" ? "bg-red-600" : "bg-slate-500";

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Portal de Check-in</h1>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="text-sm text-muted-foreground">Tenant</label>
          <select
            className="w-full border rounded-lg p-2 bg-background"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
          >
            {(memberships ?? []).map((m) => (
              <option key={`${m.tenantId}-${m.role}`} value={m.tenantId}>
                {m.tenantId} · {m.role}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Portão</label>
          <input className="w-full border rounded-lg p-2 bg-background" value={gate} onChange={(e) => setGate(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Dispositivo</label>
          <input className="w-full border rounded-lg p-2 bg-background" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} />
        </div>
      </div>

      <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl shadow" />

      <div className={`text-white rounded-lg p-3 ${color}`}>
        {busy ? "Validando..." : (status.msg ?? "Aponte a câmera para o QR")}
      </div>

      {/* fallback manual */}
      <ManualInput tenantId={tenantId} gate={gate} deviceId={deviceId} setStatus={setStatus} />
    </div>
  );
}

function ManualInput({
  tenantId, gate, deviceId, setStatus,
}: { tenantId: string; gate: string; deviceId: string; setStatus: (s: {result?: CheckinResult; msg?: string}) => void }) {
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <div className="space-y-2">
      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground">Inserir QR manualmente</summary>
        <div className="mt-2 flex gap-2">
          <input className="flex-1 border rounded-lg p-2 bg-background" placeholder="cole o conteúdo do QR (base64url)" value={qr} onChange={(e)=>setQr(e.target.value)} />
          <button
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-60"
            disabled={!tenantId || !qr || loading}
            onClick={async ()=> {
              setLoading(true);
              try {
                const r = await scanCheckin(tenantId, qr, gate, deviceId);
                if (r.ok) setStatus({ result: r.result, msg: "Check-in OK" });
                else setStatus({ result: r.result, msg: r.error ?? "Falha no check-in" });
              } catch (e:any) {
                setStatus({ result: "invalido", msg: e?.message ?? "Erro" });
              } finally {
                setLoading(false);
              }
            }}
          >
            Validar
          </button>
        </div>
      </details>
    </div>
  );
}

export default withRole("checkin_operator")(CheckinScanner);
