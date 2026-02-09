
-- 1. Profiles table (stores user tokens and plan info)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  tokens INTEGER NOT NULL DEFAULT 100,
  subscription_plan TEXT NOT NULL DEFAULT 'free',
  discord_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Scripts table
CREATE TABLE public.scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  share_code TEXT DEFAULT encode(gen_random_bytes(6), 'hex'),
  creator_ip TEXT,
  allowed_ips TEXT[],
  loader_token TEXT DEFAULT gen_random_uuid()::text,
  key_provider_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scripts" ON public.scripts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own scripts" ON public.scripts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own scripts" ON public.scripts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own scripts" ON public.scripts FOR DELETE USING (auth.uid() = user_id);

-- 3. Key System Providers table
CREATE TABLE public.key_system_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_duration_minutes INTEGER NOT NULL DEFAULT 1440,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.key_system_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own providers" ON public.key_system_providers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own providers" ON public.key_system_providers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own providers" ON public.key_system_providers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own providers" ON public.key_system_providers FOR DELETE USING (auth.uid() = user_id);

-- 4. Script Keys table
CREATE TABLE public.script_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  key_value TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  hwid TEXT,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  discord_id TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.script_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view keys for their scripts" ON public.script_keys FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.scripts WHERE scripts.id = script_keys.script_id AND scripts.user_id = auth.uid()));
CREATE POLICY "Users can create keys for their scripts" ON public.script_keys FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.scripts WHERE scripts.id = script_keys.script_id AND scripts.user_id = auth.uid()));
CREATE POLICY "Users can update keys for their scripts" ON public.script_keys FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.scripts WHERE scripts.id = script_keys.script_id AND scripts.user_id = auth.uid()));
CREATE POLICY "Users can delete keys for their scripts" ON public.script_keys FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.scripts WHERE scripts.id = script_keys.script_id AND scripts.user_id = auth.uid()));

-- 5. deduct_tokens function (THIS IS THE FIX for the 90% stuck issue)
CREATE OR REPLACE FUNCTION public.deduct_tokens(p_user_id UUID, p_amount INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_tokens INTEGER;
  user_plan TEXT;
BEGIN
  -- Get current tokens
  SELECT tokens, subscription_plan INTO current_tokens, user_plan
  FROM public.profiles
  WHERE user_id = p_user_id;

  -- If no profile exists, create one with default tokens
  IF NOT FOUND THEN
    INSERT INTO public.profiles (user_id, tokens, subscription_plan)
    VALUES (p_user_id, 100, 'free')
    RETURNING tokens, subscription_plan INTO current_tokens, user_plan;
  END IF;

  -- Unlimited tokens for paid plans
  IF user_plan IN ('pro', 'enterprise', 'premium') THEN
    RETURN json_build_object('success', true, 'remaining', current_tokens, 'plan', user_plan);
  END IF;

  -- Check if enough tokens
  IF current_tokens < p_amount THEN
    RETURN json_build_object('success', false, 'reason', 'Tokens insuficientes. Faça upgrade do seu plano.', 'current', current_tokens, 'required', p_amount);
  END IF;

  -- Deduct tokens
  UPDATE public.profiles
  SET tokens = tokens - p_amount, updated_at = now()
  WHERE user_id = p_user_id;

  RETURN json_build_object('success', true, 'remaining', current_tokens - p_amount, 'plan', user_plan);
END;
$$;

-- 6. Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, tokens, subscription_plan)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), 100, 'free');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_scripts_updated_at BEFORE UPDATE ON public.scripts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
