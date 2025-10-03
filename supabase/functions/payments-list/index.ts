import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
};

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

    // List payment gateways for the tenant
    const { data: gateways, error: gatewaysError } = await supabaseClient
      .from('payment_gateways')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('provider');

    if (gatewaysError) {
      console.error('Gateways fetch error:', gatewaysError);
      throw new Error('Failed to fetch payment gateways');
    }

    return new Response(JSON.stringify({ gateways }), {
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
