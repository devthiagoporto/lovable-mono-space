import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { paymentService, PaymentGateway, PaymentProvider } from '@/services/payments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface GatewayFormState {
  isActive: boolean;
  credentials: Record<string, string>;
}

type GatewayStates = Record<PaymentProvider, GatewayFormState>;

const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  stripe: 'Stripe',
  pagarme: 'Pagar.me',
  mercadopago: 'Mercado Pago',
  pix_manual: 'PIX Manual',
};

export default function PaymentSettings() {
  const { memberships } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<PaymentProvider | null>(null);
  const [gateways, setGateways] = useState<GatewayStates>({
    stripe: { isActive: false, credentials: {} },
    pagarme: { isActive: false, credentials: {} },
    mercadopago: { isActive: false, credentials: {} },
    pix_manual: { isActive: false, credentials: {} },
  });

  const tenantId = memberships[0]?.tenantId;

  useEffect(() => {
    if (tenantId) {
      loadGateways();
    }
  }, [tenantId]);

  const loadGateways = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const data = await paymentService.list(tenantId);

      const newStates: GatewayStates = { ...gateways };
      data.forEach((gw: PaymentGateway) => {
        newStates[gw.provider] = {
          isActive: gw.is_active,
          credentials: gw.credentials || {},
        };
      });
      setGateways(newStates);
    } catch (error: any) {
      toast.error('Erro ao carregar gateways: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (provider: PaymentProvider) => {
    if (!tenantId) return;

    const state = gateways[provider];

    // Validação básica se ativo
    if (state.isActive) {
      const requiredFields = getRequiredFields(provider);
      const missing = requiredFields.filter((f) => !state.credentials[f]);
      if (missing.length > 0) {
        toast.error(`Campos obrigatórios faltando: ${missing.join(', ')}`);
        return;
      }
    }

    try {
      setSaving(provider);
      await paymentService.upsert({
        tenantId: tenantId,
        provider,
        isActive: state.isActive,
        credentials: state.credentials,
      });
      toast.success(`${PROVIDER_LABELS[provider]} salvo com sucesso!`);
      await loadGateways();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(null);
    }
  };

  const updateCredentials = (provider: PaymentProvider, key: string, value: string) => {
    setGateways((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        credentials: { ...prev[provider].credentials, [key]: value },
      },
    }));
  };

  const toggleActive = (provider: PaymentProvider) => {
    setGateways((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        isActive: !prev[provider].isActive,
      },
    }));
  };

  const getRequiredFields = (provider: PaymentProvider): string[] => {
    switch (provider) {
      case 'stripe':
        return ['publishableKey', 'secretKey'];
      case 'pagarme':
        return ['apiKey', 'encryptionKey'];
      case 'mercadopago':
        return ['publicKey', 'accessToken'];
      case 'pix_manual':
        return ['chavePix', 'tipoChave'];
      default:
        return [];
    }
  };

  const renderStripeFields = () => {
    const provider: PaymentProvider = 'stripe';
    const state = gateways[provider];
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="stripe-publishable">Publishable Key *</Label>
          <Input
            id="stripe-publishable"
            type="text"
            placeholder="pk_..."
            value={state.credentials.publishableKey || ''}
            onChange={(e) => updateCredentials(provider, 'publishableKey', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stripe-secret">Secret Key *</Label>
          <Input
            id="stripe-secret"
            type="password"
            placeholder="sk_..."
            value={state.credentials.secretKey || ''}
            onChange={(e) => updateCredentials(provider, 'secretKey', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stripe-webhook">Webhook Secret (opcional)</Label>
          <Input
            id="stripe-webhook"
            type="password"
            placeholder="whsec_..."
            value={state.credentials.webhookSecret || ''}
            onChange={(e) => updateCredentials(provider, 'webhookSecret', e.target.value)}
          />
        </div>
      </>
    );
  };

  const renderPagarmeFields = () => {
    const provider: PaymentProvider = 'pagarme';
    const state = gateways[provider];
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="pagarme-api">API Key *</Label>
          <Input
            id="pagarme-api"
            type="password"
            placeholder="ak_..."
            value={state.credentials.apiKey || ''}
            onChange={(e) => updateCredentials(provider, 'apiKey', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pagarme-encryption">Encryption Key *</Label>
          <Input
            id="pagarme-encryption"
            type="password"
            placeholder="ek_..."
            value={state.credentials.encryptionKey || ''}
            onChange={(e) => updateCredentials(provider, 'encryptionKey', e.target.value)}
          />
        </div>
      </>
    );
  };

  const renderMercadoPagoFields = () => {
    const provider: PaymentProvider = 'mercadopago';
    const state = gateways[provider];
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="mp-public">Public Key *</Label>
          <Input
            id="mp-public"
            type="text"
            placeholder="APP_USR-..."
            value={state.credentials.publicKey || ''}
            onChange={(e) => updateCredentials(provider, 'publicKey', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mp-access">Access Token *</Label>
          <Input
            id="mp-access"
            type="password"
            placeholder="APP_USR-..."
            value={state.credentials.accessToken || ''}
            onChange={(e) => updateCredentials(provider, 'accessToken', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mp-webhook">Webhook Secret (opcional)</Label>
          <Input
            id="mp-webhook"
            type="password"
            value={state.credentials.webhookSecret || ''}
            onChange={(e) => updateCredentials(provider, 'webhookSecret', e.target.value)}
          />
        </div>
      </>
    );
  };

  const renderPixManualFields = () => {
    const provider: PaymentProvider = 'pix_manual';
    const state = gateways[provider];
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="pix-chave">Chave PIX *</Label>
          <Input
            id="pix-chave"
            type="text"
            placeholder="12345678900 ou email@example.com"
            value={state.credentials.chavePix || ''}
            onChange={(e) => updateCredentials(provider, 'chavePix', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pix-tipo">Tipo de Chave *</Label>
          <Select
            value={state.credentials.tipoChave || ''}
            onValueChange={(value) => updateCredentials(provider, 'tipoChave', value)}
          >
            <SelectTrigger id="pix-tipo">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cpf">CPF</SelectItem>
              <SelectItem value="cnpj">CNPJ</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="telefone">Telefone</SelectItem>
              <SelectItem value="chave_aleatoria">Chave Aleatória</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pix-instrucoes">Instruções (opcional)</Label>
          <Textarea
            id="pix-instrucoes"
            placeholder="Instruções para o comprador..."
            rows={3}
            value={state.credentials.instrucoes || ''}
            onChange={(e) => updateCredentials(provider, 'instrucoes', e.target.value)}
          />
        </div>
      </>
    );
  };

  const renderProviderCard = (provider: PaymentProvider) => {
    const state = gateways[provider];
    const isSaving = saving === provider;
    const isReady = state.isActive && getRequiredFields(provider).every((f) => state.credentials[f]);

    return (
      <Card key={provider}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle>{PROVIDER_LABELS[provider]}</CardTitle>
                {isReady && (
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    Pronto ✅
                  </span>
                )}
              </div>
              <CardDescription>
                Configurar credenciais de {PROVIDER_LABELS[provider]}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor={`active-${provider}`}>Ativo</Label>
              <Switch
                id={`active-${provider}`}
                checked={state.isActive}
                onCheckedChange={() => toggleActive(provider)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {provider === 'stripe' && renderStripeFields()}
          {provider === 'pagarme' && renderPagarmeFields()}
          {provider === 'mercadopago' && renderMercadoPagoFields()}
          {provider === 'pix_manual' && renderPixManualFields()}

          <Button onClick={() => handleSave(provider)} disabled={isSaving} className="w-full">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Formas de Pagamento</h1>
        <p className="text-muted-foreground">
          Configure os gateways de pagamento disponíveis para seus eventos
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {renderProviderCard('stripe')}
        {renderProviderCard('pagarme')}
        {renderProviderCard('mercadopago')}
        {renderProviderCard('pix_manual')}
      </div>
    </div>
  );
}
