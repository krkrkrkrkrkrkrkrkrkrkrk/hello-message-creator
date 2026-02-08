-- Create user_reviews table for testimonials on homepage
CREATE TABLE public.user_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  avatar_url TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  plan_purchased TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved reviews
CREATE POLICY "Anyone can view approved reviews"
ON public.user_reviews
FOR SELECT
USING (is_approved = true);

-- Users can create their own reviews
CREATE POLICY "Users can create own reviews"
ON public.user_reviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
ON public.user_reviews
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can manage all reviews
CREATE POLICY "Admins can manage reviews"
ON public.user_reviews
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add tokens column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tokens INTEGER DEFAULT 100;

-- Create platform_stats table for caching real stats
CREATE TABLE public.platform_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stat_key TEXT NOT NULL UNIQUE,
  stat_value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_stats ENABLE ROW LEVEL SECURITY;

-- Anyone can view stats
CREATE POLICY "Anyone can view platform stats"
ON public.platform_stats
FOR SELECT
USING (true);

-- Only service role can update
CREATE POLICY "Service role only updates stats"
ON public.platform_stats
FOR ALL
USING (false)
WITH CHECK (false);

-- Insert initial stats
INSERT INTO public.platform_stats (stat_key, stat_value) VALUES
  ('total_authentications', 0),
  ('active_projects', 0),
  ('total_users', 0)
ON CONFLICT (stat_key) DO NOTHING;

-- Create function to update platform stats
CREATE OR REPLACE FUNCTION public.update_platform_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update total authentications (sum of all script executions)
  UPDATE platform_stats 
  SET stat_value = (SELECT COUNT(*) FROM script_executions), updated_at = now()
  WHERE stat_key = 'total_authentications';
  
  -- Update active projects (scripts created in last 30 days or with recent executions)
  UPDATE platform_stats 
  SET stat_value = (
    SELECT COUNT(DISTINCT id) FROM scripts 
    WHERE updated_at > now() - interval '30 days'
  ), updated_at = now()
  WHERE stat_key = 'active_projects';
  
  -- Update total users
  UPDATE platform_stats 
  SET stat_value = (SELECT COUNT(*) FROM profiles), updated_at = now()
  WHERE stat_key = 'total_users';
END;
$$;

-- Create function to deduct tokens
CREATE OR REPLACE FUNCTION public.deduct_tokens(p_user_id UUID, p_amount INTEGER)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles;
  v_current_tokens INTEGER;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'User not found');
  END IF;
  
  v_current_tokens := COALESCE(v_profile.tokens, 0);
  
  -- Check if user has paid subscription (unlimited tokens)
  IF v_profile.subscription_plan IS NOT NULL 
     AND v_profile.subscription_plan != 'free'
     AND v_profile.subscription_expires_at > now() THEN
    RETURN jsonb_build_object(
      'success', true, 
      'tokens_remaining', -1,
      'unlimited', true
    );
  END IF;
  
  -- Check if enough tokens
  IF v_current_tokens < p_amount THEN
    RETURN jsonb_build_object(
      'success', false, 
      'reason', 'Not enough tokens',
      'tokens_remaining', v_current_tokens,
      'required', p_amount
    );
  END IF;
  
  -- Deduct tokens
  UPDATE profiles 
  SET tokens = tokens - p_amount 
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'tokens_remaining', v_current_tokens - p_amount,
    'deducted', p_amount
  );
END;
$$;