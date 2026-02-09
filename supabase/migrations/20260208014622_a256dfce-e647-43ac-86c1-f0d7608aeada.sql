
-- Script Keys: add missing columns
ALTER TABLE public.script_keys
  ADD COLUMN IF NOT EXISTS used_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS note TEXT;

-- Marketplace Products: add missing column
ALTER TABLE public.marketplace_products
  ADD COLUMN IF NOT EXISTS script_content TEXT;

-- Script Executions: add missing columns
ALTER TABLE public.script_executions
  ADD COLUMN IF NOT EXISTS executor_ip TEXT,
  ADD COLUMN IF NOT EXISTS executor_type TEXT,
  ADD COLUMN IF NOT EXISTS roblox_username TEXT;

-- Community Scripts table
CREATE TABLE public.community_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  script_content TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  game_name TEXT,
  category TEXT DEFAULT 'universal',
  downloads INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.community_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active community scripts" ON public.community_scripts FOR SELECT USING (is_active = true);
CREATE POLICY "Users can create their own community scripts" ON public.community_scripts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own community scripts" ON public.community_scripts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own community scripts" ON public.community_scripts FOR DELETE USING (auth.uid() = user_id);

-- Script Views table
CREATE TABLE public.script_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE,
  viewer_ip TEXT,
  can_view_source BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.script_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert script views" ON public.script_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Script owners can view their script views" ON public.script_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.scripts WHERE scripts.id = script_views.script_id AND scripts.user_id = auth.uid())
);

CREATE TRIGGER update_community_scripts_updated_at BEFORE UPDATE ON public.community_scripts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
