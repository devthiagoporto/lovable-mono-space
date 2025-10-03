import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpsertPayload {
  tenantId: string;
  provider: 'stripe' | 'pagarme' | 'mercadopago' | 'pix_manual';
  isActive: boolean;
  credentials: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Invalid token or user not found');
    }

    // Parse payload
    const payload: UpsertPayload = await req.json();
    const { tenantId, provider, isActive, credentials } = payload;

    if (!tenantId || !provider) {
      throw new Error('Missing required fields: tenantId, provider');
    }

    // Check if user is admin of tenant
    const { data: isAdmin, error: adminError } = await supabase.rpc(
      'is_tenant_admin',
      { p_tenant: tenantId }
    );

    if (adminError || !isAdmin) {
      throw new Error('User is not admin of this tenant');
    }

    // If activating this provider, deactivate all others for this tenant
    if (isActive) {
      const { error: deactivateError } = await supabase
        .from('payment_gateways')
        .update({ is_active: false })
        .eq('tenant_id', tenantId)
        .neq('provider', provider);

      if (deactivateError) {
        console.error('Error deactivating other providers:', deactivateError);
        throw new Error('Failed to deactivate other providers');
      }
    }

    // Upsert the gateway
    const { data: gateway, error: upsertError } = await supabase
      .from('payment_gateways')
      .upsert(
        {
          tenant_id: tenantId,
          provider,
          is_active: isActive,
          credentials,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'tenant_id,provider',
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting gateway:', upsertError);
      throw new Error('Failed to save payment gateway');
    }

    console.log('Payment gateway saved:', { provider, isActive, tenantId });

    return new Response(
      JSON.stringify({ gateway }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in payments-upsert:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
