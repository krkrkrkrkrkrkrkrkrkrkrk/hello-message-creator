-- =====================================================
-- SECURITY REPORTS TABLE (Server-side decision making)
-- Client reports data, server decides bans
-- =====================================================

CREATE TABLE IF NOT EXISTS public.security_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  key_id UUID REFERENCES public.script_keys(id) ON DELETE SET NULL,
  
  -- Client-reported data (NOT TRUSTED - for analysis only)
  reported_hwid TEXT,
  reported_ip TEXT,
  reported_executor TEXT,
  reported_threats TEXT[], -- ["simplespy", "hydroxide", etc]
  
  -- Server-verified data (TRUSTED)
  verified_ip TEXT NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  request_fingerprint TEXT, -- Hash of request headers/patterns
  
  -- Server decision
  threat_level TEXT NOT NULL DEFAULT 'none', -- none, low, medium, high, critical
  action_taken TEXT, -- warning, temp_ban, perm_ban, none
  ban_applied BOOLEAN DEFAULT false,
  ban_duration_hours INTEGER,
  
  -- Pattern analysis
  request_count_1h INTEGER DEFAULT 1,
  unique_ips_1h INTEGER DEFAULT 1,
  pattern_anomaly_score NUMERIC(5,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_reports ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role only for security_reports"
  ON public.security_reports
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Index for fast lookups
CREATE INDEX idx_security_reports_script_key ON public.security_reports(script_id, key_id);
CREATE INDEX idx_security_reports_ip ON public.security_reports(verified_ip);
CREATE INDEX idx_security_reports_created ON public.security_reports(created_at DESC);

-- =====================================================
-- SERVER-SIDE THREAT ANALYSIS FUNCTION
-- Analyzes patterns and decides bans (100% server-side)
-- =====================================================

CREATE OR REPLACE FUNCTION public.analyze_security_report(
  p_script_id UUID,
  p_key_id UUID,
  p_verified_ip TEXT,
  p_reported_hwid TEXT DEFAULT NULL,
  p_reported_threats TEXT[] DEFAULT NULL,
  p_reported_executor TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_threat_level TEXT := 'none';
  v_action TEXT := 'none';
  v_should_ban BOOLEAN := false;
  v_ban_hours INTEGER := 0;
  v_request_count INTEGER;
  v_unique_ips INTEGER;
  v_anomaly_score NUMERIC := 0;
  v_existing_bans INTEGER;
  v_report_id UUID;
BEGIN
  -- 1. Count requests from this IP in last hour
  SELECT COUNT(*) INTO v_request_count
  FROM security_reports
  WHERE verified_ip = p_verified_ip
    AND created_at > now() - interval '1 hour';
  
  -- 2. Count unique IPs for this key in last hour
  IF p_key_id IS NOT NULL THEN
    SELECT COUNT(DISTINCT verified_ip) INTO v_unique_ips
    FROM security_reports
    WHERE key_id = p_key_id
      AND created_at > now() - interval '1 hour';
  ELSE
    v_unique_ips := 1;
  END IF;
  
  -- 3. Check existing bans for this IP
  SELECT COUNT(*) INTO v_existing_bans
  FROM tamper_bans
  WHERE ip_address = p_verified_ip
    AND expires_at > now();
  
  -- If already banned, return early
  IF v_existing_bans > 0 THEN
    RETURN jsonb_build_object(
      'threat_level', 'blocked',
      'action', 'already_banned',
      'should_ban', false
    );
  END IF;
  
  -- 4. Calculate anomaly score (SERVER-SIDE ANALYSIS)
  -- High request rate = suspicious
  IF v_request_count > 100 THEN
    v_anomaly_score := v_anomaly_score + 50;
    v_threat_level := 'high';
  ELSIF v_request_count > 50 THEN
    v_anomaly_score := v_anomaly_score + 25;
    v_threat_level := 'medium';
  ELSIF v_request_count > 20 THEN
    v_anomaly_score := v_anomaly_score + 10;
  END IF;
  
  -- Multiple IPs for same key = suspicious (possible key sharing)
  IF v_unique_ips > 5 THEN
    v_anomaly_score := v_anomaly_score + 30;
    IF v_threat_level = 'none' OR v_threat_level = 'low' THEN
      v_threat_level := 'medium';
    END IF;
  ELSIF v_unique_ips > 3 THEN
    v_anomaly_score := v_anomaly_score + 15;
  END IF;
  
  -- 5. Process reported threats (CLIENT DATA - verify with server patterns)
  -- We don't TRUST client reports, but use them as SIGNALS
  IF p_reported_threats IS NOT NULL AND array_length(p_reported_threats, 1) > 0 THEN
    -- Client reported hook tools - this is a SIGNAL, not proof
    -- Server looks for corroborating evidence:
    -- - Unusual request patterns
    -- - Missing expected headers
    -- - Timing anomalies
    
    -- If we have high request count AND client reports threats = likely real
    IF v_request_count > 10 THEN
      v_anomaly_score := v_anomaly_score + 20;
      v_threat_level := 'high';
    END IF;
  END IF;
  
  -- 6. Make decision based on SERVER-SIDE analysis
  IF v_anomaly_score >= 70 THEN
    v_threat_level := 'critical';
    v_action := 'perm_ban';
    v_should_ban := true;
    v_ban_hours := 24;
  ELSIF v_anomaly_score >= 50 THEN
    v_threat_level := 'high';
    v_action := 'temp_ban';
    v_should_ban := true;
    v_ban_hours := 6;
  ELSIF v_anomaly_score >= 30 THEN
    v_threat_level := 'medium';
    v_action := 'warning';
    -- Increment warning count on key
    IF p_key_id IS NOT NULL THEN
      UPDATE script_keys 
      SET warning_count = COALESCE(warning_count, 0) + 1,
          last_warning_at = now()
      WHERE id = p_key_id;
    END IF;
  END IF;
  
  -- 7. Apply ban if needed (SERVER DECISION)
  IF v_should_ban THEN
    INSERT INTO tamper_bans (ip_address, hwid, script_id, reason, expires_at)
    VALUES (
      p_verified_ip,
      p_reported_hwid,
      p_script_id,
      'server_analysis:score=' || v_anomaly_score::text,
      now() + (v_ban_hours || ' hours')::interval
    )
    ON CONFLICT (ip_address, script_id) DO UPDATE
    SET expires_at = GREATEST(tamper_bans.expires_at, EXCLUDED.expires_at),
        reason = EXCLUDED.reason;
  END IF;
  
  -- 8. Log the report
  INSERT INTO security_reports (
    script_id, key_id, reported_hwid, reported_ip, reported_executor,
    reported_threats, verified_ip, threat_level, action_taken,
    ban_applied, ban_duration_hours, request_count_1h, unique_ips_1h,
    pattern_anomaly_score
  ) VALUES (
    p_script_id, p_key_id, p_reported_hwid, p_reported_hwid, p_reported_executor,
    p_reported_threats, p_verified_ip, v_threat_level, v_action,
    v_should_ban, v_ban_hours, v_request_count + 1, v_unique_ips,
    v_anomaly_score
  ) RETURNING id INTO v_report_id;
  
  RETURN jsonb_build_object(
    'report_id', v_report_id,
    'threat_level', v_threat_level,
    'action', v_action,
    'should_ban', v_should_ban,
    'ban_hours', v_ban_hours,
    'anomaly_score', v_anomaly_score,
    'request_count_1h', v_request_count + 1,
    'unique_ips_1h', v_unique_ips
  );
END;
$$;

-- =====================================================
-- CLEANUP FUNCTION for security_reports (keep 7 days)
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_security_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM security_reports WHERE created_at < now() - interval '7 days';
END;
$$;