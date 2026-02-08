-- =====================================================
-- LUARMOR PARITY MIGRATION
-- Adiciona campos faltantes para paridade completa
-- =====================================================

-- 1. SCRIPT_KEYS: Adicionar campos Luarmor
ALTER TABLE public.script_keys
ADD COLUMN IF NOT EXISTS key_days integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS activated_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'reset' CHECK (status IN ('active', 'reset', 'banned')),
ADD COLUMN IF NOT EXISTS ban_reason text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ban_expire timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS unban_token text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_resets integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reset timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_execution_ip text DEFAULT NULL;

-- 2. SCRIPTS: Adicionar modos Luarmor
ALTER TABLE public.scripts
ADD COLUMN IF NOT EXISTS ffa_mode boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS silent_mode boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS heartbeat_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS lightning_mode boolean DEFAULT false;

-- 3. Função para ativar key_days no primeiro uso
CREATE OR REPLACE FUNCTION public.activate_key_on_first_use(p_key_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_key script_keys;
BEGIN
  SELECT * INTO v_key FROM script_keys WHERE id = p_key_id;
  
  IF v_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Key not found');
  END IF;
  
  -- Se já foi ativada, retorna info atual
  IF v_key.activated_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_activated', true,
      'activated_at', v_key.activated_at,
      'expires_at', v_key.expires_at
    );
  END IF;
  
  -- Se tem key_days, calcular expires_at baseado no primeiro uso
  IF v_key.key_days IS NOT NULL AND v_key.key_days > 0 THEN
    UPDATE script_keys SET
      activated_at = now(),
      expires_at = now() + (v_key.key_days || ' days')::interval,
      status = 'active',
      used_at = now()
    WHERE id = p_key_id
    RETURNING * INTO v_key;
    
    RETURN jsonb_build_object(
      'success', true,
      'activated_at', v_key.activated_at,
      'expires_at', v_key.expires_at,
      'key_days', v_key.key_days
    );
  END IF;
  
  -- Sem key_days, apenas marca como ativa
  UPDATE script_keys SET
    activated_at = now(),
    status = 'active',
    used_at = now()
  WHERE id = p_key_id;
  
  RETURN jsonb_build_object('success', true, 'activated_at', now());
END;
$function$;

-- 4. Função para reset HWID com tracking
CREATE OR REPLACE FUNCTION public.reset_key_hwid(
  p_key_id uuid,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_key script_keys;
  v_script scripts;
  v_cooldown_hours integer := 24;
BEGIN
  SELECT * INTO v_key FROM script_keys WHERE id = p_key_id;
  
  IF v_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Key not found');
  END IF;
  
  -- Check if banned
  IF v_key.is_banned OR v_key.status = 'banned' THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is banned');
  END IF;
  
  -- Get script for cooldown settings
  SELECT * INTO v_script FROM scripts WHERE id = v_key.script_id;
  
  -- Check cooldown (unless forced)
  IF NOT p_force AND v_key.last_reset IS NOT NULL THEN
    IF v_key.last_reset > now() - (v_cooldown_hours || ' hours')::interval THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'User is on cooldown',
        'cooldown_ends', v_key.last_reset + (v_cooldown_hours || ' hours')::interval
      );
    END IF;
  END IF;
  
  -- Reset HWID
  UPDATE script_keys SET
    hwid = NULL,
    status = 'reset',
    last_reset = now(),
    total_resets = COALESCE(total_resets, 0) + 1,
    hwid_reset_count = COALESCE(hwid_reset_count, 0) + 1
  WHERE id = p_key_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully reset!',
    'total_resets', COALESCE(v_key.total_resets, 0) + 1
  );
END;
$function$;

-- 5. Função para blacklist com ban temporário
CREATE OR REPLACE FUNCTION public.blacklist_key(
  p_key_id uuid,
  p_ban_reason text DEFAULT 'Banned by owner',
  p_ban_expire timestamp with time zone DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_unban_token text;
BEGIN
  -- Gerar unban_token único
  v_unban_token := encode(gen_random_bytes(16), 'hex');
  
  UPDATE script_keys SET
    is_banned = true,
    status = 'banned',
    ban_reason = p_ban_reason,
    ban_expire = p_ban_expire,
    unban_token = v_unban_token
  WHERE id = p_key_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Key not found');
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User has been blacklisted',
    'unban_token', v_unban_token
  );
END;
$function$;

-- 6. Função para unban via token
CREATE OR REPLACE FUNCTION public.unban_key_by_token(p_unban_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE script_keys SET
    is_banned = false,
    status = CASE WHEN hwid IS NOT NULL THEN 'active' ELSE 'reset' END,
    ban_reason = NULL,
    ban_expire = NULL,
    unban_token = NULL
  WHERE unban_token = p_unban_token;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid unban token');
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'User has been unbanned');
END;
$function$;

-- 7. Função para verificar ban expirado automaticamente
CREATE OR REPLACE FUNCTION public.check_and_clear_expired_bans()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE script_keys SET
    is_banned = false,
    status = CASE WHEN hwid IS NOT NULL THEN 'active' ELSE 'reset' END,
    ban_reason = NULL,
    ban_expire = NULL,
    unban_token = NULL
  WHERE is_banned = true 
    AND ban_expire IS NOT NULL 
    AND ban_expire < now();
END;
$function$;

-- 8. Função para buscar keys com filtros (Luarmor-style)
CREATE OR REPLACE FUNCTION public.get_keys_paginated(
  p_script_id uuid,
  p_search text DEFAULT NULL,
  p_discord_id text DEFAULT NULL,
  p_user_key text DEFAULT NULL,
  p_identifier text DEFAULT NULL,
  p_from integer DEFAULT 0,
  p_until integer DEFAULT 100
)
RETURNS TABLE (
  user_key text,
  identifier text,
  identifier_type text,
  discord_id text,
  status text,
  last_reset timestamp with time zone,
  total_resets integer,
  auth_expire timestamp with time zone,
  banned boolean,
  ban_reason text,
  ban_expire timestamp with time zone,
  unban_token text,
  total_executions integer,
  note text,
  activated_at timestamp with time zone,
  key_days integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    sk.key_value as user_key,
    sk.hwid as identifier,
    'HWID'::text as identifier_type,
    sk.discord_id,
    COALESCE(sk.status, 
      CASE 
        WHEN sk.is_banned THEN 'banned'
        WHEN sk.hwid IS NOT NULL THEN 'active'
        ELSE 'reset'
      END
    ) as status,
    sk.last_reset,
    COALESCE(sk.total_resets, sk.hwid_reset_count, 0) as total_resets,
    sk.expires_at as auth_expire,
    sk.is_banned as banned,
    sk.ban_reason,
    sk.ban_expire,
    sk.unban_token,
    COALESCE(sk.execution_count, 0) as total_executions,
    sk.note,
    sk.activated_at,
    sk.key_days
  FROM script_keys sk
  WHERE sk.script_id = p_script_id
    AND (p_discord_id IS NULL OR sk.discord_id = p_discord_id)
    AND (p_user_key IS NULL OR sk.key_value = p_user_key)
    AND (p_identifier IS NULL OR sk.hwid = p_identifier)
    AND (p_search IS NULL OR 
      sk.key_value ILIKE '%' || p_search || '%' OR
      sk.discord_id ILIKE '%' || p_search || '%' OR
      sk.hwid ILIKE '%' || p_search || '%' OR
      sk.note ILIKE '%' || p_search || '%'
    )
  ORDER BY sk.created_at DESC
  OFFSET p_from
  LIMIT (p_until - p_from);
END;
$function$;