import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
};

interface UpsertPayload {
  provider: 'stripe' | 'pagarme' | 'mercadopago' | 'pix_manual';
  active: boolean;
  config: Record<string, any>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');
    const tenantId = req.headers.get('x-tenant-id');

    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    if (!tenantId) {
      throw new Error('Missing x-tenant-id header');
    }

    // Create client with user's token for RLS validation
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get user from token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Invalid token or user not found');
    }

    // Check if user is admin of the tenant
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc(
      'is_tenant_admin',
      { p_tenant: tenantId }
    );

    if (roleError) {
      console.error('Role check error:', roleError);
      throw new Error('Failed to verify admin role');
    }

    if (!isAdmin) {
      throw new Error('User is not admin of this tenant');
    }

    // Parse request body
    const payload: UpsertPayload = await req.json();

    if (!payload.provider) {
      throw new Error('Missing provider field');
    }

    if (typeof payload.active !== 'boolean') {
      throw new Error('Missing or invalid active field');
    }

    if (!payload.config || typeof payload.config !== 'object') {
      throw new Error('Missing or invalid config field');
    }

    // Validate required fields per provider if active
    if (payload.active) {
      switch (payload.provider) {
        case 'stripe':
          if (!payload.config.publishableKey || !payload.config.secretKey) {
            throw new Error('Stripe requires publishableKey and secretKey');
          }
          break;
        case 'pagarme':
          if (!payload.config.apiKey || !payload.config.encryptionKey) {
            throw new Error('Pagar.me requires apiKey and encryptionKey');
          }
          break;
        case 'mercadopago':
          if (!payload.config.publicKey || !payload.config.accessToken) {
            throw new Error('Mercado Pago requires publicKey and accessToken');
          }
          break;
        case 'pix_manual':
          if (!payload.config.chavePix || !payload.config.tipoChave) {
            throw new Error('PIX Manual requires chavePix and tipoChave');
          }
          break;
      }
    }

    // Upsert payment gateway
    const { data: gateway, error: upsertError } = await supabaseClient
      .from('payment_gateways')
      .upsert(
        {
          tenant_id: tenantId,
          provider: payload.provider,
          active: payload.active,
          config: payload.config,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'tenant_id,provider',
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      throw new Error('Failed to save payment gateway');
    }

    console.log('Payment gateway saved:', { provider: payload.provider, active: payload.active });

    return new Response(JSON.stringify({ gateway }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
