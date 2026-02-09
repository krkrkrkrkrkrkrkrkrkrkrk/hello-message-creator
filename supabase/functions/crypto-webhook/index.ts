import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CRYPTO-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Webhook received");

    const body = await req.json();
    logStep("Webhook payload", body);

    const { 
      payment_status, 
      order_id, 
      price_amount,
      pay_currency,
      actually_paid,
      payment_id 
    } = body;

    if (!order_id) {
      logStep("Missing order_id");
      return new Response(JSON.stringify({ status: "ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Map NOWPayments status to our status
    let ourStatus = "pending";
    if (payment_status === "finished" || payment_status === "confirmed") {
      ourStatus = "completed";
    } else if (payment_status === "confirming" || payment_status === "sending") {
      ourStatus = "confirming";
    } else if (payment_status === "failed" || payment_status === "refunded") {
      ourStatus = "failed";
    } else if (payment_status === "expired") {
      ourStatus = "expired";
    } else if (payment_status === "partially_paid") {
      ourStatus = "partial";
    }

    logStep("Processing status update", { order_id, ourStatus, payment_status });

    // Get existing payment record
    const { data: existingPayment, error: fetchError } = await supabaseClient
      .from("crypto_payments")
      .select("*")
      .eq("order_id", order_id)
      .single();

    if (fetchError || !existingPayment) {
      logStep("Payment not found", { order_id, error: fetchError?.message });
      return new Response(JSON.stringify({ status: "payment_not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Don't downgrade completed payments
    if (existingPayment.status === "completed" && ourStatus !== "completed") {
      logStep("Payment already completed, ignoring status change");
      return new Response(JSON.stringify({ status: "already_completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Update payment record
    const updateData: any = {
      status: ourStatus,
      payment_currency: pay_currency,
      payment_amount: actually_paid,
    };

    if (ourStatus === "completed") {
      updateData.paid_at = new Date().toISOString();
      
      // Calculate expiration based on plan duration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (existingPayment.duration_days || 30));
      updateData.expires_at = expiresAt.toISOString();
    }

    const { error: updateError } = await supabaseClient
      .from("crypto_payments")
      .update(updateData)
      .eq("order_id", order_id);

    if (updateError) {
      logStep("Database update error", { error: updateError.message });
      throw new Error("Failed to update payment record");
    }

    logStep("Payment updated", { order_id, status: ourStatus });

    // If payment is completed, update user profile subscription
    if (ourStatus === "completed") {
      logStep("Payment completed, activating subscription");
      
      // Find or create user profile by email
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("id")
        .eq("email", existingPayment.user_email)
        .single();

      if (profile) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (existingPayment.duration_days || 30));

        await supabaseClient
          .from("profiles")
          .update({
            subscription_plan: existingPayment.plan_name.toLowerCase(),
            subscription_started_at: new Date().toISOString(),
            subscription_expires_at: expiresAt.toISOString(),
            api_key: existingPayment.api_key,
          })
          .eq("id", profile.id);

        logStep("Subscription activated", { 
          userId: profile.id, 
          plan: existingPayment.plan_name,
          expiresAt: expiresAt.toISOString()
        });
      } else {
        logStep("User profile not found, API key stored in crypto_payments", { 
          email: existingPayment.user_email 
        });
      }

      // Record the sale
      await supabaseClient
        .from("sales")
        .insert({
          user_email: existingPayment.user_email,
          plan_name: existingPayment.plan_name,
          amount: existingPayment.amount,
          duration_days: existingPayment.duration_days,
          payment_method: "crypto",
          status: "completed",
        });

      logStep("Sale recorded");
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
