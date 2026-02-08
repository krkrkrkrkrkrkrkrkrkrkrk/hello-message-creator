-- =============================================
-- LUARMOR-STYLE BUILD CACHE (PERSISTENT)
-- Prebuilt loader layers stored by script+version
-- =============================================

CREATE TABLE IF NOT EXISTS public.script_builds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  version TEXT NOT NULL,

  -- Prebuilt layers (plain text Lua; may be obfuscated by Luraph)
  layer2 TEXT,
  layer3 TEXT,
  layer4 TEXT,
  layer5 TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- One build per (script, version)
CREATE UNIQUE INDEX IF NOT EXISTS idx_script_builds_unique ON public.script_builds(script_id, version);
CREATE INDEX IF NOT EXISTS idx_script_builds_script ON public.script_builds(script_id);

-- Enable RLS
ALTER TABLE public.script_builds ENABLE ROW LEVEL SECURITY;

-- Only service role can access builds directly
CREATE POLICY "No direct access to script builds" ON public.script_builds
FOR ALL
USING (false);

