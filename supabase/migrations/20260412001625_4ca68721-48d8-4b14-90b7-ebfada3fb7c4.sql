
-- Add missing columns to discord_servers for bot functionality
ALTER TABLE public.discord_servers
  ADD COLUMN IF NOT EXISTS script_id uuid REFERENCES public.scripts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS buyer_role_id text,
  ADD COLUMN IF NOT EXISTS manager_role_id text,
  ADD COLUMN IF NOT EXISTS webhook_url text,
  ADD COLUMN IF NOT EXISTS hwid_reset_cooldown_hours integer NOT NULL DEFAULT 24;

-- Add missing columns to script_keys for bot functionality
ALTER TABLE public.script_keys
  ADD COLUMN IF NOT EXISTS discord_avatar_url text,
  ADD COLUMN IF NOT EXISTS last_hwid_reset timestamp with time zone,
  ADD COLUMN IF NOT EXISTS hwid_reset_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS execution_count integer NOT NULL DEFAULT 0;
