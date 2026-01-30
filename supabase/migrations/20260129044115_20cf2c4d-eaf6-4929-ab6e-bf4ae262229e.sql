-- Add Discord Webhook settings to scripts table
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS discord_webhook_url text;
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS discord_webhook_enabled boolean DEFAULT false;

-- Add security settings (Panda Secure Core equivalent)
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS secure_core_enabled boolean DEFAULT true;
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS anti_tamper_enabled boolean DEFAULT true;
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS anti_debug_enabled boolean DEFAULT true;
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS hwid_lock_enabled boolean DEFAULT true;

-- Add execution metrics
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS execution_count integer DEFAULT 0;
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS last_execution_at timestamp with time zone;

-- Create script_assets table for Virtual Storage files
CREATE TABLE IF NOT EXISTS public.script_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id uuid NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  storage_path text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on script_assets
ALTER TABLE public.script_assets ENABLE ROW LEVEL SECURITY;

-- Create policies for script_assets
CREATE POLICY "Users can view own script assets"
ON public.script_assets
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own script assets"
ON public.script_assets
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own script assets"
ON public.script_assets
FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Users can update own script assets"
ON public.script_assets
FOR UPDATE
USING (user_id = auth.uid());

-- Create webhook_logs table for tracking webhook notifications
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id uuid NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  status text DEFAULT 'pending',
  response_code integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on webhook_logs
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for webhook_logs
CREATE POLICY "Script owners can view webhook logs"
ON public.webhook_logs
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM scripts
  WHERE scripts.id = webhook_logs.script_id
  AND scripts.user_id = auth.uid()
));

-- Only service role can insert webhook logs (from edge functions)
CREATE POLICY "Service role can insert webhook logs"
ON public.webhook_logs
FOR INSERT
WITH CHECK (false);