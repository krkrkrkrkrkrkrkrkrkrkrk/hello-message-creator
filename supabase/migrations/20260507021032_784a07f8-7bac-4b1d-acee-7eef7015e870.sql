ALTER TABLE public.script_keys
  ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_script_keys_ban_expires_at ON public.script_keys(ban_expires_at) WHERE ban_expires_at IS NOT NULL;