
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, tokens, subscription_plan, api_key, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), 
    100, 
    'free',
    encode(gen_random_bytes(16), 'hex'),
    NEW.email
  );
  RETURN NEW;
END;
$$;
