import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
};

Deno.serve(async (req) => {
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate user and tenant access
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Invalid token or user not found');
    }

    // Check tenant access
    const { data: hasAccess, error: accessError } = await supabase.rpc(
      'has_tenant_access',
      { p_tenant: tenantId }
    );

    if (accessError || !hasAccess) {
      throw new Error('No access to this tenant');
    }

    // Get payment gateways for tenant
    const { data: gateways, error: gatewaysError } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('provider');

    if (gatewaysError) {
      console.error('Error fetching gateways:', gatewaysError);
      throw new Error('Failed to fetch payment gateways');
    }

    return new Response(
      JSON.stringify({ gateways: gateways || [] }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in payments-get:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
