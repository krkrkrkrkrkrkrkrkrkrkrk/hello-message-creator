
-- =============================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- =============================================

-- Profiles: add missing columns
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS obfuscation_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS key_creation_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS script_creation_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS api_key TEXT,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Script Keys: add missing columns  
ALTER TABLE public.script_keys
  ADD COLUMN IF NOT EXISTS duration_type TEXT DEFAULT 'days',
  ADD COLUMN IF NOT EXISTS key_format TEXT;

-- Script Executions: add missing columns
ALTER TABLE public.script_executions
  ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS country TEXT;

-- Scripts: add missing columns
ALTER TABLE public.scripts
  ADD COLUMN IF NOT EXISTS secure_core_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anti_tamper_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anti_debug_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hwid_lock_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS execution_count INTEGER NOT NULL DEFAULT 0;

-- =============================================
-- CREATE MISSING TABLES
-- =============================================

-- 1. Subscription Plans
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  obfuscation_limit INTEGER NOT NULL DEFAULT 10,
  key_creation_limit INTEGER NOT NULL DEFAULT 50,
  script_limit INTEGER NOT NULL DEFAULT 3,
  max_scripts INTEGER NOT NULL DEFAULT 3,
  features JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read subscription plans" ON public.subscription_plans FOR SELECT USING (true);

-- Insert default plans
INSERT INTO public.subscription_plans (name, display_name, price, obfuscation_limit, key_creation_limit, script_limit, max_scripts) VALUES
  ('free', 'Free', 0, 10, 50, 3, 3),
  ('starter', 'Starter', 9.99, 100, 500, 10, 10),
  ('pro', 'Pro', 19.99, -1, -1, -1, -1),
  ('enterprise', 'Enterprise', 49.99, -1, -1, -1, -1);

-- 2. Subscription Codes
CREATE TABLE public.subscription_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  plan_name TEXT NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  price NUMERIC NOT NULL DEFAULT 0,
  redeemed_by UUID REFERENCES auth.users(id),
  redeemed_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own codes" ON public.subscription_codes FOR SELECT USING (auth.uid() = redeemed_by);
CREATE POLICY "Anyone can insert codes" ON public.subscription_codes FOR INSERT WITH CHECK (true);

-- 3. Security Events
CREATE TABLE public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID REFERENCES public.scripts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL DEFAULT 'unknown',
  severity TEXT NOT NULL DEFAULT 'info',
  ip_address TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view events for their scripts" ON public.security_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.scripts WHERE scripts.id = security_events.script_id AND scripts.user_id = auth.uid())
);

-- 4. Marketplace Products
CREATE TABLE public.marketplace_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'Scripts',
  downloads INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_advertised BOOLEAN NOT NULL DEFAULT false,
  script_id UUID REFERENCES public.scripts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active products" ON public.marketplace_products FOR SELECT USING (is_active = true);
CREATE POLICY "Users can manage their own products" ON public.marketplace_products FOR ALL USING (auth.uid() = user_id);

-- 5. Provider Checkpoints
CREATE TABLE public.provider_checkpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.key_system_providers(id) ON DELETE CASCADE,
  checkpoint_order INTEGER NOT NULL DEFAULT 1,
  url TEXT NOT NULL DEFAULT '',
  provider_type TEXT NOT NULL DEFAULT 'linkvertise',
  api_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their provider checkpoints" ON public.provider_checkpoints FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.key_system_providers WHERE key_system_providers.id = provider_checkpoints.provider_id AND key_system_providers.user_id = auth.uid())
);
CREATE POLICY "Users can manage their provider checkpoints" ON public.provider_checkpoints FOR ALL USING (
  EXISTS (SELECT 1 FROM public.key_system_providers WHERE key_system_providers.id = provider_checkpoints.provider_id AND key_system_providers.user_id = auth.uid())
);

-- 6. Discord Servers
CREATE TABLE public.discord_servers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_token TEXT,
  public_key TEXT,
  guild_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.discord_servers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own discord config" ON public.discord_servers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own discord config" ON public.discord_servers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own discord config" ON public.discord_servers FOR UPDATE USING (auth.uid() = user_id);

-- 7. Websocket Sessions
CREATE TABLE public.websocket_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE,
  hwid TEXT,
  ip_address TEXT,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  disconnected_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.websocket_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view sessions for their scripts" ON public.websocket_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.scripts WHERE scripts.id = websocket_sessions.script_id AND scripts.user_id = auth.uid())
);

-- =============================================
-- TRIGGERS
-- =============================================
CREATE TRIGGER update_marketplace_products_updated_at BEFORE UPDATE ON public.marketplace_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_discord_servers_updated_at BEFORE UPDATE ON public.discord_servers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_script_executions_script_id ON public.script_executions(script_id);
CREATE INDEX IF NOT EXISTS idx_script_executions_executed_at ON public.script_executions(executed_at);
CREATE INDEX IF NOT EXISTS idx_script_keys_script_id ON public.script_keys(script_id);
CREATE INDEX IF NOT EXISTS idx_security_events_script_id ON public.security_events(script_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at);
