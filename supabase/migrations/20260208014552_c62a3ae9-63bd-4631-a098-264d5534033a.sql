
-- =============================================
-- REMAINING MISSING COLUMNS
-- =============================================

-- Scripts: more missing columns
ALTER TABLE public.scripts
  ADD COLUMN IF NOT EXISTS enable_spy_warnings BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS discord_webhook_enabled BOOLEAN NOT NULL DEFAULT false;

-- Websocket Sessions: missing columns
ALTER TABLE public.websocket_sessions
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS executor TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Provider Checkpoints: add missing columns (code expects provider_url and checkpoint_type)
ALTER TABLE public.provider_checkpoints
  ADD COLUMN IF NOT EXISTS provider_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS checkpoint_type TEXT NOT NULL DEFAULT 'linkvertise',
  ADD COLUMN IF NOT EXISTS anti_bypass_enabled BOOLEAN NOT NULL DEFAULT false;

-- =============================================
-- MORE MISSING TABLES
-- =============================================

-- 1. Marketplace Purchases
CREATE TABLE public.marketplace_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  price_paid NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own purchases" ON public.marketplace_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create purchases" ON public.marketplace_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Promo Codes
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL DEFAULT 10,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active promo codes" ON public.promo_codes FOR SELECT USING (true);
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- 3. Crypto Payments
CREATE TABLE public.crypto_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id TEXT NOT NULL UNIQUE,
  invoice_id TEXT,
  plan_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  api_key TEXT,
  marketplace_product_id UUID REFERENCES public.marketplace_products(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crypto_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own payments" ON public.crypto_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view by order_id" ON public.crypto_payments FOR SELECT USING (true);

-- 4. Subscription Codes: add missing columns
ALTER TABLE public.subscription_codes
  ADD COLUMN IF NOT EXISTS is_used BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS used_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS used_at TIMESTAMP WITH TIME ZONE;

-- =============================================
-- MISSING RPC FUNCTIONS
-- =============================================

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

-- check_usage_limit function
CREATE OR REPLACE FUNCTION public.check_usage_limit(p_user_id UUID, p_limit_type TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_plan RECORD;
  v_current INTEGER;
  v_limit INTEGER;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('allowed', false, 'reason', 'Profile not found', 'plan', 'free', 'current', 0, 'limit', 0);
  END IF;

  -- Get plan limits
  SELECT * INTO v_plan FROM public.subscription_plans WHERE name = COALESCE(v_profile.subscription_plan, 'free');
  IF NOT FOUND THEN
    SELECT * INTO v_plan FROM public.subscription_plans WHERE name = 'free';
  END IF;

  -- Determine current usage and limit based on type
  CASE p_limit_type
    WHEN 'obfuscation' THEN
      v_current := v_profile.obfuscation_count;
      v_limit := v_plan.obfuscation_limit;
    WHEN 'key_creation' THEN
      v_current := v_profile.key_creation_count;
      v_limit := v_plan.key_creation_limit;
    WHEN 'script' THEN
      v_current := v_profile.script_creation_count;
      v_limit := v_plan.script_limit;
    ELSE
      RETURN json_build_object('allowed', false, 'reason', 'Invalid limit type', 'plan', v_profile.subscription_plan, 'current', 0, 'limit', 0);
  END CASE;

  -- Unlimited (-1)
  IF v_limit = -1 THEN
    RETURN json_build_object('allowed', true, 'current', v_current, 'limit', 'unlimited', 'plan', v_profile.subscription_plan);
  END IF;

  -- Check if under limit
  IF v_current >= v_limit THEN
    RETURN json_build_object('allowed', false, 'current', v_current, 'limit', v_limit, 'remaining', 0, 'plan', v_profile.subscription_plan, 'reason', 'Limite atingido. Faça upgrade do seu plano.');
  END IF;

  RETURN json_build_object('allowed', true, 'current', v_current, 'limit', v_limit, 'remaining', v_limit - v_current, 'plan', v_profile.subscription_plan);
END;
$$;

-- increment_usage function
CREATE OR REPLACE FUNCTION public.increment_usage(p_user_id UUID, p_usage_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE p_usage_type
    WHEN 'obfuscation' THEN
      UPDATE public.profiles SET obfuscation_count = obfuscation_count + 1 WHERE user_id = p_user_id;
    WHEN 'key_creation' THEN
      UPDATE public.profiles SET key_creation_count = key_creation_count + 1 WHERE user_id = p_user_id;
    WHEN 'script' THEN
      UPDATE public.profiles SET script_creation_count = script_creation_count + 1 WHERE user_id = p_user_id;
    ELSE
      RETURN false;
  END CASE;
  
  RETURN true;
END;
$$;

-- Trigger for crypto_payments updated_at
CREATE TRIGGER update_crypto_payments_updated_at BEFORE UPDATE ON public.crypto_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
