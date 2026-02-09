-- Add columns for user's own Discord bot credentials
ALTER TABLE public.discord_servers 
ADD COLUMN IF NOT EXISTS bot_token TEXT,
ADD COLUMN IF NOT EXISTS public_key TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.discord_servers.bot_token IS 'User Discord bot token for their own bot';
COMMENT ON COLUMN public.discord_servers.public_key IS 'User Discord application public key';