ALTER TABLE public.websocket_sessions
ADD COLUMN IF NOT EXISTS key_id uuid;

CREATE INDEX IF NOT EXISTS idx_websocket_sessions_key_id
ON public.websocket_sessions(key_id)
WHERE key_id IS NOT NULL;