
ALTER TABLE public.scripts
ADD COLUMN IF NOT EXISTS ffa_mode boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS silent_mode boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS heartbeat_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS lightning_mode boolean NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
