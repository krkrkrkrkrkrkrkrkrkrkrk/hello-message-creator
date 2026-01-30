-- Add discord_avatar_url column to script_keys table for storing Discord user avatars
ALTER TABLE public.script_keys 
ADD COLUMN IF NOT EXISTS discord_avatar_url TEXT;