// Lista tickets do usuário logado via view v_my_tickets
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'Method Not Allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization' }, 401);

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // valida usuário
    const { data: { user }, error: uerr } = await supabase.auth.getUser();
    if (uerr || !user) return json({ error: 'Invalid user' }, 401);

    const { data, error } = await supabase
      .from('v_my_tickets')
      .select('*')
      .order('ticket_id', { ascending: false });

    if (error) return json({ error: error.message }, 400);
    return json({ tickets: data ?? [] }, 200);
  } catch (e) {
    console.error('my-tickets error', e);
    return json({ error: (e as Error)?.message ?? 'unknown' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
