-- Update deduct_tokens function to handle plan-specific token limits
CREATE OR REPLACE FUNCTION public.deduct_tokens(p_user_id uuid, p_amount integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile profiles;
  v_current_tokens INTEGER;
  v_plan_name TEXT;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'User not found');
  END IF;
  
  v_current_tokens := COALESCE(v_profile.tokens, 0);
  v_plan_name := LOWER(COALESCE(v_profile.subscription_plan, 'free'));
  
  -- Check if user has active subscription
  IF v_profile.subscription_plan IS NOT NULL 
     AND v_profile.subscription_plan != 'free'
     AND v_profile.subscription_expires_at > now() THEN
    
    -- Only Enterprise has unlimited tokens
    IF v_plan_name = 'enterprise' THEN
      RETURN jsonb_build_object(
        'success', true, 
        'tokens_remaining', -1,
        'unlimited', true
      );
    END IF;
    
    -- Starter and Pro use token system (300 and 500 respectively)
    -- They still need to have enough tokens
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
$function$;

-- Create function to reset tokens monthly based on plan
CREATE OR REPLACE FUNCTION public.reset_plan_tokens()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Reset tokens for Starter users (300 tokens)
  UPDATE profiles 
  SET tokens = 300, last_usage_reset = now()
  WHERE LOWER(subscription_plan) = 'starter'
    AND subscription_expires_at > now()
    AND (last_usage_reset IS NULL OR last_usage_reset < now() - interval '30 days');
  
  -- Reset tokens for Pro users (500 tokens)
  UPDATE profiles 
  SET tokens = 500, last_usage_reset = now()
  WHERE LOWER(subscription_plan) = 'pro'
    AND subscription_expires_at > now()
    AND (last_usage_reset IS NULL OR last_usage_reset < now() - interval '30 days');
  
  -- Free users get 100 tokens reset
  UPDATE profiles 
  SET tokens = 100, last_usage_reset = now()
  WHERE (subscription_plan IS NULL OR subscription_plan = 'free' OR subscription_expires_at <= now())
    AND (last_usage_reset IS NULL OR last_usage_reset < now() - interval '30 days');
END;
$function$;