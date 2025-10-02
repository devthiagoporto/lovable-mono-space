import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get caller user
    const { data: { user: caller }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !caller) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId, tenantId, role } = await req.json();

    if (!userId || !tenantId || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, tenantId, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    const allowedRoles = ['organizer_staff', 'checkin_operator', 'buyer'];
    if (!allowedRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Allowed: organizer_staff, checkin_operator, buyer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller has permission (organizer_admin or admin_saas)
    const { data: callerRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('tenant_id', tenantId)
      .in('role', ['organizer_admin', 'admin_saas']);

    if (rolesError || !callerRoles || callerRoles.length === 0) {
      console.error('Permission check failed:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert or update role (upsert)
    const { error: assignError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: userId,
        tenant_id: tenantId,
        role,
      }, {
        onConflict: 'user_id,tenant_id',
      });

    if (assignError) {
      console.error('Role assignment error:', assignError);
      return new Response(
        JSON.stringify({ error: 'Failed to assign role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
