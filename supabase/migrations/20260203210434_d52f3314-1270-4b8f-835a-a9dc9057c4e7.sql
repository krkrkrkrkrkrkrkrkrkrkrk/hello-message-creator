
-- Add usage tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS obfuscation_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS key_creation_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS script_creation_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_usage_reset timestamp with time zone DEFAULT now();

-- Add manual_approval field to crypto_payments
ALTER TABLE public.crypto_payments 
ADD COLUMN IF NOT EXISTS manual_approval_requested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Create plans table for admin management
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  obfuscation_limit integer DEFAULT -1, -- -1 = unlimited
  key_creation_limit integer DEFAULT -1,
  script_limit integer DEFAULT -1,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view active plans
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
FOR SELECT USING (is_active = true);

-- Only admins can manage plans
CREATE POLICY "Admins can manage plans" ON public.subscription_plans
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Update profiles RLS to allow admins to view all
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Update crypto_payments RLS for admin access
CREATE POLICY "Admins can view all payments" ON public.crypto_payments
FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payments" ON public.crypto_payments
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Insert default plans
INSERT INTO public.subscription_plans (name, display_name, price, duration_days, obfuscation_limit, key_creation_limit, script_limit, features) VALUES
('free', 'Free', 0, 0, 10, 20, 3, '["Basic obfuscation", "Limited keys", "Community support"]'::jsonb),
('starter', 'Starter', 4.99, 30, 100, 500, 10, '["Advanced obfuscation", "More keys", "Email support"]'::jsonb),
('pro', 'Pro', 9.99, 30, -1, -1, 50, '["Unlimited obfuscation", "Unlimited keys", "Priority support", "Custom loader"]'::jsonb),
('enterprise', 'Enterprise', 24.99, 30, -1, -1, -1, '["Everything in Pro", "Dedicated support", "Custom features", "API access"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Function to check usage limits
CREATE OR REPLACE FUNCTION public.check_usage_limit(
  p_user_id uuid,
  p_limit_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles;
  v_plan subscription_plans;
  v_current_count integer;
  v_limit integer;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'User not found');
  END IF;
  
  -- Get plan limits
  SELECT * INTO v_plan FROM subscription_plans 
  WHERE name = COALESCE(v_profile.subscription_plan, 'free');
  
  IF v_plan IS NULL THEN
    SELECT * INTO v_plan FROM subscription_plans WHERE name = 'free';
  END IF;
  
  -- Check if subscription expired
  IF v_profile.subscription_plan IS NOT NULL 
     AND v_profile.subscription_plan != 'free'
     AND v_profile.subscription_expires_at < now() THEN
    -- Treat as free user
    SELECT * INTO v_plan FROM subscription_plans WHERE name = 'free';
  END IF;
  
  -- Get current count and limit based on type
  CASE p_limit_type
    WHEN 'obfuscation' THEN
      v_current_count := v_profile.obfuscation_count;
      v_limit := v_plan.obfuscation_limit;
    WHEN 'key_creation' THEN
      v_current_count := v_profile.key_creation_count;
      v_limit := v_plan.key_creation_limit;
    WHEN 'script' THEN
      v_current_count := v_profile.script_creation_count;
      v_limit := v_plan.script_limit;
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'Invalid limit type');
  END CASE;
  
  -- -1 means unlimited
  IF v_limit = -1 THEN
    RETURN jsonb_build_object(
      'allowed', true, 
      'current', v_current_count, 
      'limit', 'unlimited',
      'plan', v_plan.name
    );
  END IF;
  
  -- Check if within limit
  IF v_current_count >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false, 
      'current', v_current_count, 
      'limit', v_limit,
      'plan', v_plan.name,
      'reason', 'Limit reached. Upgrade your plan for more.'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true, 
    'current', v_current_count, 
    'limit', v_limit,
    'remaining', v_limit - v_current_count,
    'plan', v_plan.name
  );
END;
$$;

-- Function to increment usage
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id uuid,
  p_usage_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE p_usage_type
    WHEN 'obfuscation' THEN
      UPDATE profiles SET obfuscation_count = obfuscation_count + 1 WHERE id = p_user_id;
    WHEN 'key_creation' THEN
      UPDATE profiles SET key_creation_count = key_creation_count + 1 WHERE id = p_user_id;
    WHEN 'script' THEN
      UPDATE profiles SET script_creation_count = script_creation_count + 1 WHERE id = p_user_id;
    ELSE
      RETURN false;
  END CASE;
  
  RETURN true;
END;
$$;
