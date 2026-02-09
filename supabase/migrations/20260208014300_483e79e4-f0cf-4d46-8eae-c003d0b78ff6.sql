
-- 1. User Roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage roles" ON public.user_roles FOR ALL USING (true);

-- 2. Support Tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  admin_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tickets" ON public.support_tickets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all tickets" ON public.support_tickets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);
CREATE POLICY "Admins can update all tickets" ON public.support_tickets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- 3. Support Messages table
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages of their tickets" ON public.support_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = auth.uid())
);
CREATE POLICY "Users can create messages on their tickets" ON public.support_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = auth.uid())
);
CREATE POLICY "Admins can view all messages" ON public.support_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);
CREATE POLICY "Admins can create messages" ON public.support_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- 4. Ad Key Settings table
CREATE TABLE public.ad_key_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  checkpoint_count INTEGER NOT NULL DEFAULT 1,
  key_duration_hours INTEGER NOT NULL DEFAULT 24,
  custom_provider_url TEXT,
  linkvertise_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(script_id)
);

ALTER TABLE public.ad_key_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ad settings for their scripts" ON public.ad_key_settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.scripts WHERE scripts.id = ad_key_settings.script_id AND scripts.user_id = auth.uid())
);
CREATE POLICY "Users can create ad settings for their scripts" ON public.ad_key_settings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.scripts WHERE scripts.id = ad_key_settings.script_id AND scripts.user_id = auth.uid())
);
CREATE POLICY "Users can update ad settings for their scripts" ON public.ad_key_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.scripts WHERE scripts.id = ad_key_settings.script_id AND scripts.user_id = auth.uid())
);

-- 5. Ad Checkpoints table
CREATE TABLE public.ad_checkpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  checkpoint_order INTEGER NOT NULL DEFAULT 1,
  provider TEXT NOT NULL DEFAULT 'linkvertise',
  provider_url TEXT NOT NULL DEFAULT '',
  api_token TEXT,
  anti_bypass_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checkpoints for their scripts" ON public.ad_checkpoints FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.scripts WHERE scripts.id = ad_checkpoints.script_id AND scripts.user_id = auth.uid())
);
CREATE POLICY "Users can create checkpoints for their scripts" ON public.ad_checkpoints FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.scripts WHERE scripts.id = ad_checkpoints.script_id AND scripts.user_id = auth.uid())
);
CREATE POLICY "Users can update checkpoints for their scripts" ON public.ad_checkpoints FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.scripts WHERE scripts.id = ad_checkpoints.script_id AND scripts.user_id = auth.uid())
);
CREATE POLICY "Users can delete checkpoints for their scripts" ON public.ad_checkpoints FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.scripts WHERE scripts.id = ad_checkpoints.script_id AND scripts.user_id = auth.uid())
);

-- 6. Platform Stats table (public read)
CREATE TABLE public.platform_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stat_key TEXT NOT NULL UNIQUE,
  stat_value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform stats" ON public.platform_stats FOR SELECT USING (true);

-- Insert default stats
INSERT INTO public.platform_stats (stat_key, stat_value) VALUES
  ('total_authentications', 0),
  ('active_projects', 0),
  ('total_users', 0);

-- 7. Script Executions table
CREATE TABLE public.script_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID REFERENCES public.scripts(id) ON DELETE SET NULL,
  key_id UUID REFERENCES public.script_keys(id) ON DELETE SET NULL,
  hwid TEXT,
  ip_address TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.script_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view executions for their scripts" ON public.script_executions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.scripts WHERE scripts.id = script_executions.script_id AND scripts.user_id = auth.uid())
);

-- 8. User Reviews table
CREATE TABLE public.user_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  user_name TEXT,
  avatar_url TEXT,
  rating INTEGER NOT NULL DEFAULT 5,
  review_text TEXT NOT NULL,
  plan_purchased TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved reviews" ON public.user_reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can create their own reviews" ON public.user_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own reviews" ON public.user_reviews FOR SELECT USING (auth.uid() = user_id);

-- 9. Add email column to profiles (needed by AIChatWidget)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 10. Triggers for updated_at
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
