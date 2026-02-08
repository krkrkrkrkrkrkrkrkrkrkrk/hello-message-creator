import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client with user token to verify admin
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role
    const { data: isAdmin } = await supabaseUser.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Read body ONCE at the beginning
    const body = await req.json();
    const { action, userId, days, plan, keyId, updates, paymentId } = body;

    if (action === 'get_all_users') {
      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ profiles }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_sales') {
      const { data: sales, error } = await supabaseAdmin
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return new Response(JSON.stringify({ sales }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_sales_stats') {
      // Only count completed sales
      const { data: sales, error } = await supabaseAdmin
        .from('sales')
        .select('amount, created_at, plan_name')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const todaySales = sales?.filter(s => new Date(s.created_at) >= todayStart) || [];
      const weekSales = sales?.filter(s => new Date(s.created_at) >= weekStart) || [];
      const monthSales = sales?.filter(s => new Date(s.created_at) >= monthStart) || [];

      const stats = {
        total_sales: sales?.length || 0,
        total_revenue: sales?.reduce((acc, s) => acc + Number(s.amount), 0) || 0,
        today_sales: todaySales.length,
        today_revenue: todaySales.reduce((acc, s) => acc + Number(s.amount), 0),
        week_sales: weekSales.length,
        week_revenue: weekSales.reduce((acc, s) => acc + Number(s.amount), 0),
        month_sales: monthSales.length,
        month_revenue: monthSales.reduce((acc, s) => acc + Number(s.amount), 0),
      };

      return new Response(JSON.stringify({ stats }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_api_stats') {
      const { data: apiStats, error } = await supabaseAdmin.rpc('get_api_stats');
      
      if (error) throw error;

      const { data: recentRequests, error: recentError } = await supabaseAdmin
        .from('api_requests')
        .select('endpoint, status_code, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (recentError) throw recentError;

      const endpointStats: Record<string, { count: number; errors: number }> = {};
      (recentRequests || []).forEach(req => {
        if (!endpointStats[req.endpoint]) {
          endpointStats[req.endpoint] = { count: 0, errors: 0 };
        }
        endpointStats[req.endpoint].count++;
        if (req.status_code >= 400) {
          endpointStats[req.endpoint].errors++;
        }
      });

      return new Response(JSON.stringify({ 
        stats: apiStats?.[0] || {
          total_requests: 0,
          requests_24h: 0,
          requests_1h: 0,
          error_count: 0,
          unique_ips: 0,
          avg_response_time_ms: 0
        },
        endpoints: endpointStats
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'extend_subscription') {
      if (!userId || !days) {
        return new Response(JSON.stringify({ error: 'userId and days required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('subscription_expires_at, subscription_plan')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      const currentExpiry = profile.subscription_expires_at 
        ? new Date(profile.subscription_expires_at)
        : new Date();
      
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          subscription_expires_at: newExpiry.toISOString(),
          subscription_plan: profile.subscription_plan || plan || 'Basic'
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ 
        success: true, 
        new_expiry: newExpiry.toISOString() 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'set_subscription') {
      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const expiresAt = days && days > 0
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          subscription_plan: plan || null,
          subscription_started_at: plan ? new Date().toISOString() : null,
          subscription_expires_at: expiresAt
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_user_keys') {
      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: scripts, error: scriptsError } = await supabaseAdmin
        .from('scripts')
        .select('id, name')
        .eq('user_id', userId);

      if (scriptsError) throw scriptsError;

      if (!scripts || scripts.length === 0) {
        return new Response(JSON.stringify({ keys: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const scriptIds = scripts.map(s => s.id);
      const { data: keys, error: keysError } = await supabaseAdmin
        .from('script_keys')
        .select('*')
        .in('script_id', scriptIds)
        .order('created_at', { ascending: false });

      if (keysError) throw keysError;

      const keysWithScripts = (keys || []).map(key => ({
        ...key,
        script_name: scripts.find(s => s.id === key.script_id)?.name || 'Unknown'
      }));

      return new Response(JSON.stringify({ keys: keysWithScripts }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update_key') {
      if (!keyId) {
        return new Response(JSON.stringify({ error: 'keyId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: updateError } = await supabaseAdmin
        .from('script_keys')
        .update(updates || {})
        .eq('id', keyId);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete_key') {
      if (!keyId) {
        return new Response(JSON.stringify({ error: 'keyId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: deleteError } = await supabaseAdmin
        .from('script_keys')
        .delete()
        .eq('id', keyId);

      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_crypto_payments') {
      const { data: payments, error } = await supabaseAdmin
        .from('crypto_payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return new Response(JSON.stringify({ payments }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'approve_crypto_payment') {
      if (!paymentId) {
        return new Response(JSON.stringify({ error: 'paymentId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: payment, error: paymentError } = await supabaseAdmin
        .from('crypto_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (paymentError) throw paymentError;

      // Generate unique ShadowAUTH key format
      const randomPart = crypto.randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase();
      const apiKey = `ShadowAUTH-${randomPart}`;
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (payment.duration_days || 30));

      // Update crypto payment with new key
      const { error: updatePaymentError } = await supabaseAdmin
        .from('crypto_payments')
        .update({
          status: 'completed',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          api_key: apiKey,
          expires_at: expiresAt.toISOString()
        })
        .eq('id', paymentId);

      if (updatePaymentError) throw updatePaymentError;

      // Create subscription code so user can activate with the key
      const { error: codeError } = await supabaseAdmin
        .from('subscription_codes')
        .insert({
          code: apiKey,
          plan_name: payment.plan_name,
          duration_days: payment.duration_days || 30,
          price: payment.amount,
          is_used: false
        });

      if (codeError) {
        console.error('Error creating subscription code:', codeError);
      }

      // If user already has account, activate subscription directly
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', payment.user_email)
        .maybeSingle();

      if (profileData) {
        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_plan: payment.plan_name,
            subscription_started_at: new Date().toISOString(),
            subscription_expires_at: expiresAt.toISOString(),
            api_key: apiKey
          })
          .eq('id', profileData.id);

        // Mark code as used since user already has account
        await supabaseAdmin
          .from('subscription_codes')
          .update({
            is_used: true,
            used_by: profileData.id,
            used_at: new Date().toISOString()
          })
          .eq('code', apiKey);
      }

      await supabaseAdmin.from('sales').insert({
        user_email: payment.user_email,
        plan_name: payment.plan_name,
        amount: payment.amount,
        duration_days: payment.duration_days,
        payment_method: 'crypto_manual',
        status: 'completed'
      });

      return new Response(JSON.stringify({ success: true, api_key: apiKey }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'reject_crypto_payment') {
      if (!paymentId) {
        return new Response(JSON.stringify({ error: 'paymentId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: updateError } = await supabaseAdmin
        .from('crypto_payments')
        .update({ status: 'rejected' })
        .eq('id', paymentId);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Admin manage user error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
