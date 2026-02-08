-- =============================================
-- LUARMOR-STYLE SECURITY TABLES
-- =============================================

-- Table for anti-replay nonces (TTL 60s like Luarmor)
CREATE TABLE public.auth_nonces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nonce TEXT NOT NULL,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  client_hwid TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '60 seconds')
);

-- Unique constraint on nonce per script (prevents replay)
CREATE UNIQUE INDEX idx_auth_nonces_unique ON public.auth_nonces(nonce, script_id);
CREATE INDEX idx_auth_nonces_expires ON public.auth_nonces(expires_at);
CREATE INDEX idx_auth_nonces_script ON public.auth_nonces(script_id);

-- Enable RLS
ALTER TABLE public.auth_nonces ENABLE ROW LEVEL SECURITY;

-- Only service role can access nonces
CREATE POLICY "No direct access to nonces" ON public.auth_nonces FOR ALL USING (false);

-- Table for rotating session tokens (TTL 15s like Luarmor)
CREATE TABLE public.rotating_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  key_id UUID REFERENCES public.script_keys(id) ON DELETE CASCADE,
  hwid_hash TEXT,
  ip_address TEXT,
  step INTEGER NOT NULL DEFAULT 1,
  max_step INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '15 seconds'),
  used_at TIMESTAMP WITH TIME ZONE,
  is_valid BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_rotating_tokens_token ON public.rotating_tokens(token);
CREATE INDEX idx_rotating_tokens_expires ON public.rotating_tokens(expires_at);
CREATE INDEX idx_rotating_tokens_script ON public.rotating_tokens(script_id);

-- Enable RLS
ALTER TABLE public.rotating_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access tokens
CREATE POLICY "No direct access to rotating tokens" ON public.rotating_tokens FOR ALL USING (false);

-- Table for tracepath validation (mandatory endpoint sequence)
CREATE TABLE public.tracepath_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  hwid_hash TEXT,
  ip_address TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 0,
  -- Tracepath: version(1) -> info(2) -> endpoints(3) -> flags(4) -> validate(5)
  step_version_at TIMESTAMP WITH TIME ZONE,
  step_info_at TIMESTAMP WITH TIME ZONE,
  step_endpoints_at TIMESTAMP WITH TIME ZONE,
  step_flags_at TIMESTAMP WITH TIME ZONE,
  step_validate_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes'),
  completed_at TIMESTAMP WITH TIME ZONE,
  is_valid BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_tracepath_session_id ON public.tracepath_sessions(session_id);
CREATE INDEX idx_tracepath_expires ON public.tracepath_sessions(expires_at);
CREATE INDEX idx_tracepath_script ON public.tracepath_sessions(script_id);

-- Enable RLS
ALTER TABLE public.tracepath_sessions ENABLE ROW LEVEL SECURITY;

-- Only service role can access tracepath
CREATE POLICY "No direct access to tracepath" ON public.tracepath_sessions FOR ALL USING (false);

-- Table for shared secrets (like Luarmor's secret_n1, n2, n3)
CREATE TABLE public.script_secrets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE UNIQUE,
  secret_n1 TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  secret_n2 TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  secret_n3 TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  hmac_key TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  aes_salt TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  rotated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_script_secrets_script ON public.script_secrets(script_id);

-- Enable RLS
ALTER TABLE public.script_secrets ENABLE ROW LEVEL SECURITY;

-- Only service role can access secrets
CREATE POLICY "No direct access to script secrets" ON public.script_secrets FOR ALL USING (false);

-- Function to cleanup expired nonces
CREATE OR REPLACE FUNCTION public.cleanup_expired_nonces()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.auth_nonces WHERE expires_at < now();
  DELETE FROM public.rotating_tokens WHERE expires_at < now();
  DELETE FROM public.tracepath_sessions WHERE expires_at < now() AND completed_at IS NULL;
END;
$$;

-- Function to validate nonce (returns true if valid and not used)
CREATE OR REPLACE FUNCTION public.validate_and_consume_nonce(
  p_nonce TEXT,
  p_script_id UUID,
  p_hwid TEXT DEFAULT NULL,
  p_ip TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Try to insert the nonce (will fail if already exists due to unique constraint)
  BEGIN
    INSERT INTO public.auth_nonces (nonce, script_id, client_hwid, ip_address)
    VALUES (p_nonce, p_script_id, p_hwid, p_ip);
    RETURN true;
  EXCEPTION WHEN unique_violation THEN
    -- Nonce already used - replay attack!
    RETURN false;
  END;
END;
$$;

-- Function to auto-create secrets for new scripts
CREATE OR REPLACE FUNCTION public.create_script_secrets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.script_secrets (script_id)
  VALUES (NEW.id)
  ON CONFLICT (script_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to auto-create secrets when script is created
DROP TRIGGER IF EXISTS trigger_create_script_secrets ON public.scripts;
CREATE TRIGGER trigger_create_script_secrets
  AFTER INSERT ON public.scripts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_script_secrets();

-- Create secrets for existing scripts
INSERT INTO public.script_secrets (script_id)
SELECT id FROM public.scripts
ON CONFLICT (script_id) DO NOTHING;