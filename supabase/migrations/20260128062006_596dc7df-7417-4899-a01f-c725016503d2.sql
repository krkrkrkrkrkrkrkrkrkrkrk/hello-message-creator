-- Create table for community free scripts (ScriptBlox)
CREATE TABLE public.community_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  script_content TEXT NOT NULL,
  image_url TEXT,
  game_name TEXT,
  category TEXT DEFAULT 'general',
  views INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_scripts ENABLE ROW LEVEL SECURITY;

-- Anyone can view active scripts
CREATE POLICY "Anyone can view active community scripts"
ON public.community_scripts FOR SELECT
USING (is_active = true);

-- Users can manage their own scripts
CREATE POLICY "Users can manage own community scripts"
ON public.community_scripts FOR ALL
USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_community_scripts_created_at ON public.community_scripts(created_at DESC);
CREATE INDEX idx_community_scripts_category ON public.community_scripts(category);

-- Add trigger for updated_at
CREATE TRIGGER update_community_scripts_updated_at
BEFORE UPDATE ON public.community_scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();