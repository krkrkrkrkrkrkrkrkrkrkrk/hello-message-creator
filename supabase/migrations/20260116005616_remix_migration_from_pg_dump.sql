CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);


--
-- Name: generate_api_key(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_api_key() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;


--
-- Name: get_api_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_api_stats() RETURNS TABLE(total_requests bigint, requests_24h bigint, requests_1h bigint, error_count bigint, unique_ips bigint, avg_response_time_ms integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    COUNT(*)::bigint as total_requests,
    COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours')::bigint as requests_24h,
    COUNT(*) FILTER (WHERE created_at > now() - interval '1 hour')::bigint as requests_1h,
    COUNT(*) FILTER (WHERE status_code >= 400)::bigint as error_count,
    COUNT(DISTINCT ip_address)::bigint as unique_ips,
    COALESCE(AVG(response_time_ms)::integer, 0) as avg_response_time_ms
  FROM public.api_requests
  WHERE created_at > now() - interval '7 days';
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: ad_checkpoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_checkpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    script_id uuid NOT NULL,
    checkpoint_order integer DEFAULT 1 NOT NULL,
    provider text NOT NULL,
    provider_url text NOT NULL,
    api_token text,
    callback_token text DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text),
    anti_bypass_enabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ad_checkpoints_provider_check CHECK ((provider = ANY (ARRAY['linkvertise'::text, 'lootlabs'::text, 'workink'::text, 'shrtfly'::text, 'shrinkearn'::text, 'custom'::text])))
);


--
-- Name: ad_key_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_key_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    script_id uuid NOT NULL,
    session_token text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text) NOT NULL,
    ip_address text NOT NULL,
    hwid text,
    current_step integer DEFAULT 0 NOT NULL,
    total_steps integer DEFAULT 3 NOT NULL,
    step1_completed_at timestamp with time zone,
    step2_completed_at timestamp with time zone,
    step3_completed_at timestamp with time zone,
    generated_key text,
    key_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    pending_checkpoint_id uuid,
    checkpoint_started_at timestamp with time zone,
    last_activity_at timestamp with time zone DEFAULT now()
);


--
-- Name: ad_key_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_key_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    script_id uuid NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    checkpoint_count integer DEFAULT 3 NOT NULL,
    key_duration_hours integer DEFAULT 24 NOT NULL,
    linkvertise_enabled boolean DEFAULT false,
    custom_provider_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: api_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    endpoint text NOT NULL,
    method text DEFAULT 'POST'::text NOT NULL,
    ip_address text,
    user_agent text,
    script_id uuid,
    key_id uuid,
    status_code integer DEFAULT 200,
    response_time_ms integer,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: discord_servers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discord_servers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guild_id text NOT NULL,
    user_id uuid NOT NULL,
    api_key text NOT NULL,
    script_id uuid,
    buyer_role_id text,
    manager_role_id text,
    log_channel_id text,
    webhook_url text,
    allow_user_hwid_reset boolean DEFAULT true,
    hwid_reset_cooldown_hours integer DEFAULT 24,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: obfuscated_loaders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.obfuscated_loaders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    script_id uuid NOT NULL,
    loader_code text NOT NULL,
    script_hash text NOT NULL,
    luraph_job_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    avatar_url text,
    display_name text,
    api_key text,
    subscription_plan text,
    subscription_expires_at timestamp with time zone,
    subscription_started_at timestamp with time zone,
    is_admin boolean DEFAULT false,
    discord_id text
);


--
-- Name: promo_code_uses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_code_uses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    promo_code_id uuid,
    user_email text NOT NULL,
    used_at timestamp with time zone DEFAULT now()
);


--
-- Name: promo_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    discount_percent integer NOT NULL,
    expires_at timestamp with time zone,
    max_uses integer,
    current_uses integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT promo_codes_discount_percent_check CHECK (((discount_percent > 0) AND (discount_percent <= 100)))
);


--
-- Name: rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    endpoint text NOT NULL,
    attempts integer DEFAULT 1 NOT NULL,
    first_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    last_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    blocked_until timestamp with time zone
);


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_email text NOT NULL,
    plan_name text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    discount_percent integer DEFAULT 0,
    promo_code text,
    duration_days integer,
    payment_method text DEFAULT 'unknown'::text,
    status text DEFAULT 'completed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: script_executions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.script_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    script_id uuid NOT NULL,
    key_id uuid,
    executed_at timestamp with time zone DEFAULT now() NOT NULL,
    executor_ip text,
    hwid text,
    country text,
    executor_type text,
    roblox_username text,
    roblox_user_id text
);


--
-- Name: script_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.script_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    script_id uuid NOT NULL,
    key_value text DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text) NOT NULL,
    hwid text,
    is_banned boolean DEFAULT false NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    used_at timestamp with time zone,
    note text,
    key_format text,
    duration_type text DEFAULT 'lifetime'::text,
    discord_id text,
    hwid_reset_count integer DEFAULT 0,
    last_hwid_reset timestamp with time zone,
    execution_count integer DEFAULT 0,
    warning_count integer DEFAULT 0,
    last_warning_at timestamp with time zone,
    CONSTRAINT script_keys_duration_type_check CHECK ((duration_type = ANY (ARRAY['days'::text, 'months'::text, 'years'::text, 'lifetime'::text])))
);


--
-- Name: script_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.script_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    script_id uuid NOT NULL,
    viewer_ip text NOT NULL,
    can_view_source boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scripts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scripts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    content text NOT NULL,
    share_code text DEFAULT encode(extensions.gen_random_bytes(8), 'hex'::text) NOT NULL,
    creator_ip text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    allowed_ips text[] DEFAULT '{}'::text[],
    enable_spy_warnings boolean DEFAULT true,
    max_warnings integer DEFAULT 3,
    loader_token text NOT NULL
);


--
-- Name: security_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    ip_address text,
    user_agent text,
    script_id uuid,
    key_id uuid,
    details jsonb,
    severity text DEFAULT 'warning'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscription_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text) NOT NULL,
    plan_name text NOT NULL,
    duration_days integer NOT NULL,
    price numeric(10,2) NOT NULL,
    is_used boolean DEFAULT false,
    used_by uuid,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: support_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    sender_type text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_email text NOT NULL,
    user_name text,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: used_nonces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.used_nonces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nonce text NOT NULL,
    session_key text NOT NULL,
    "timestamp" bigint NOT NULL,
    script_id uuid NOT NULL,
    used_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ad_checkpoints ad_checkpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_checkpoints
    ADD CONSTRAINT ad_checkpoints_pkey PRIMARY KEY (id);


--
-- Name: ad_checkpoints ad_checkpoints_script_id_checkpoint_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_checkpoints
    ADD CONSTRAINT ad_checkpoints_script_id_checkpoint_order_key UNIQUE (script_id, checkpoint_order);


--
-- Name: ad_key_sessions ad_key_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_key_sessions
    ADD CONSTRAINT ad_key_sessions_pkey PRIMARY KEY (id);


--
-- Name: ad_key_sessions ad_key_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_key_sessions
    ADD CONSTRAINT ad_key_sessions_session_token_key UNIQUE (session_token);


--
-- Name: ad_key_settings ad_key_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_key_settings
    ADD CONSTRAINT ad_key_settings_pkey PRIMARY KEY (id);


--
-- Name: ad_key_settings ad_key_settings_script_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_key_settings
    ADD CONSTRAINT ad_key_settings_script_id_key UNIQUE (script_id);


--
-- Name: api_requests api_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_requests
    ADD CONSTRAINT api_requests_pkey PRIMARY KEY (id);


--
-- Name: discord_servers discord_servers_guild_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discord_servers
    ADD CONSTRAINT discord_servers_guild_id_key UNIQUE (guild_id);


--
-- Name: discord_servers discord_servers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discord_servers
    ADD CONSTRAINT discord_servers_pkey PRIMARY KEY (id);


--
-- Name: obfuscated_loaders obfuscated_loaders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obfuscated_loaders
    ADD CONSTRAINT obfuscated_loaders_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: promo_code_uses promo_code_uses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_code_uses
    ADD CONSTRAINT promo_code_uses_pkey PRIMARY KEY (id);


--
-- Name: promo_codes promo_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_code_key UNIQUE (code);


--
-- Name: promo_codes promo_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_pkey PRIMARY KEY (id);


--
-- Name: rate_limits rate_limits_identifier_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_identifier_endpoint_key UNIQUE (identifier, endpoint);


--
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: script_executions script_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.script_executions
    ADD CONSTRAINT script_executions_pkey PRIMARY KEY (id);


--
-- Name: script_keys script_keys_key_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.script_keys
    ADD CONSTRAINT script_keys_key_value_key UNIQUE (key_value);


--
-- Name: script_keys script_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.script_keys
    ADD CONSTRAINT script_keys_pkey PRIMARY KEY (id);


--
-- Name: script_views script_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.script_views
    ADD CONSTRAINT script_views_pkey PRIMARY KEY (id);


--
-- Name: scripts scripts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scripts
    ADD CONSTRAINT scripts_pkey PRIMARY KEY (id);


--
-- Name: scripts scripts_share_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scripts
    ADD CONSTRAINT scripts_share_code_key UNIQUE (share_code);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: subscription_codes subscription_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_codes
    ADD CONSTRAINT subscription_codes_code_key UNIQUE (code);


--
-- Name: subscription_codes subscription_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_codes
    ADD CONSTRAINT subscription_codes_pkey PRIMARY KEY (id);


--
-- Name: support_messages support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: obfuscated_loaders unique_script_loader; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obfuscated_loaders
    ADD CONSTRAINT unique_script_loader UNIQUE (script_id);


--
-- Name: used_nonces used_nonces_nonce_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.used_nonces
    ADD CONSTRAINT used_nonces_nonce_key UNIQUE (nonce);


--
-- Name: used_nonces used_nonces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.used_nonces
    ADD CONSTRAINT used_nonces_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_api_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_requests_created_at ON public.api_requests USING btree (created_at DESC);


--
-- Name: idx_api_requests_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_requests_endpoint ON public.api_requests USING btree (endpoint);


--
-- Name: idx_api_requests_script_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_requests_script_id ON public.api_requests USING btree (script_id);


--
-- Name: idx_discord_servers_guild_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discord_servers_guild_id ON public.discord_servers USING btree (guild_id);


--
-- Name: idx_obfuscated_loaders_script_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_obfuscated_loaders_script_id ON public.obfuscated_loaders USING btree (script_id);


--
-- Name: idx_profiles_discord_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_discord_id ON public.profiles USING btree (discord_id);


--
-- Name: idx_rate_limits_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_limits_lookup ON public.rate_limits USING btree (identifier, endpoint, last_attempt_at);


--
-- Name: idx_script_executions_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_script_executions_country ON public.script_executions USING btree (country);


--
-- Name: idx_script_keys_discord_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_script_keys_discord_id ON public.script_keys USING btree (discord_id);


--
-- Name: idx_script_keys_key_value; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_script_keys_key_value ON public.script_keys USING btree (key_value);


--
-- Name: idx_script_keys_script_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_script_keys_script_id ON public.script_keys USING btree (script_id);


--
-- Name: idx_scripts_loader_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_scripts_loader_token ON public.scripts USING btree (loader_token);


--
-- Name: idx_security_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_created ON public.security_events USING btree (created_at DESC);


--
-- Name: idx_security_events_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_ip ON public.security_events USING btree (ip_address, created_at DESC);


--
-- Name: idx_used_nonces_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_used_nonces_lookup ON public.used_nonces USING btree (session_key, "timestamp");


--
-- Name: idx_used_nonces_used_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_used_nonces_used_at ON public.used_nonces USING btree (used_at);


--
-- Name: ad_checkpoints update_ad_checkpoints_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ad_checkpoints_updated_at BEFORE UPDATE ON public.ad_checkpoints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ad_key_settings update_ad_key_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ad_key_settings_updated_at BEFORE UPDATE ON public.ad_key_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: obfuscated_loaders update_obfuscated_loaders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_obfuscated_loaders_updated_at BEFORE UPDATE ON public.obfuscated_loaders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: support_tickets update_support_tickets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ad_checkpoints ad_checkpoints_script_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_checkpoints
    ADD CONSTRAINT ad_checkpoints_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;


--
-- Name: ad_key_sessions ad_key_sessions_pending_checkpoint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_key_sessions
    ADD CONSTRAINT ad_key_sessions_pending_checkpoint_id_fkey FOREIGN KEY (pending_checkpoint_id) REFERENCES public.ad_checkpoints(id);


--
-- Name: ad_key_sessions ad_key_sessions_script_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_key_sessions
    ADD CONSTRAINT ad_key_sessions_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;


--
-- Name: ad_key_settings ad_key_settings_script_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_key_settings
    ADD CONSTRAINT ad_key_settings_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;


--
-- Name: api_requests api_requests_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_requests
    ADD CONSTRAINT api_requests_key_id_fkey FOREIGN KEY (key_id) REFERENCES public.script_keys(id) ON DELETE SET NULL;


--
-- Name: api_requests api_requests_script_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_requests
    ADD CONSTRAINT api_requests_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE SET NULL;


--
-- Name: discord_servers discord_servers_script_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discord_servers
    ADD CONSTRAINT discord_servers_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE SET NULL;


--
-- Name: obfuscated_loaders obfuscated_loaders_script_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obfuscated_loaders
    ADD CONSTRAINT obfuscated_loaders_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: promo_code_uses promo_code_uses_promo_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_code_uses
    ADD CONSTRAINT promo_code_uses_promo_code_id_fkey FOREIGN KEY (promo_code_id) REFERENCES public.promo_codes(id) ON DELETE CASCADE;


--
-- Name: promo_codes promo_codes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: sales sales_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: script_executions script_executions_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.script_executions
    ADD CONSTRAINT script_executions_key_id_fkey FOREIGN KEY (key_id) REFERENCES public.script_keys(id) ON DELETE SET NULL;


--
-- Name: script_executions script_executions_script_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.script_executions
    ADD CONSTRAINT script_executions_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;


--
-- Name: script_keys script_keys_script_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.script_keys
    ADD CONSTRAINT script_keys_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;


--
-- Name: script_views script_views_script_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.script_views
    ADD CONSTRAINT script_views_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;


--
-- Name: scripts scripts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scripts
    ADD CONSTRAINT scripts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subscription_codes subscription_codes_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_codes
    ADD CONSTRAINT subscription_codes_used_by_fkey FOREIGN KEY (used_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: support_messages support_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: support_messages Admins can create messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create messages" ON public.support_messages FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (sender_type = 'admin'::text)));


--
-- Name: user_roles Admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: promo_codes Admins can manage promo codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage promo codes" ON public.promo_codes USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: support_tickets Admins can update any ticket; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update any ticket" ON public.support_tickets FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: support_messages Admins can view all messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all messages" ON public.support_messages FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: api_requests Admins can view all requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all requests" ON public.api_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sales Admins can view all sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all sales" ON public.sales FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: support_tickets Admins can view all tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all tickets" ON public.support_tickets FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: promo_code_uses Admins can view promo usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view promo usage" ON public.promo_code_uses FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: security_events Admins can view security events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view security events" ON public.security_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: subscription_codes Allow inserting subscription codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow inserting subscription codes" ON public.subscription_codes FOR INSERT WITH CHECK ((is_used = false));


--
-- Name: subscription_codes Allow using codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow using codes" ON public.subscription_codes FOR UPDATE USING ((is_used = false));


--
-- Name: promo_code_uses Anyone can record promo usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can record promo usage" ON public.promo_code_uses FOR INSERT WITH CHECK (((user_email IS NOT NULL) AND (promo_code_id IS NOT NULL)));


--
-- Name: promo_codes Anyone can view active promo codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active promo codes" ON public.promo_codes FOR SELECT USING ((is_active = true));


--
-- Name: ad_key_settings Anyone can view enabled ad settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view enabled ad settings" ON public.ad_key_settings FOR SELECT USING ((enabled = true));


--
-- Name: ad_key_sessions Anyone can view sessions by token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view sessions by token" ON public.ad_key_sessions FOR SELECT USING (true);


--
-- Name: rate_limits No direct access to rate_limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct access to rate_limits" ON public.rate_limits USING (false);


--
-- Name: used_nonces No direct access to used_nonces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct access to used_nonces" ON public.used_nonces USING (false);


--
-- Name: api_requests No direct client inserts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct client inserts" ON public.api_requests FOR INSERT WITH CHECK (false);


--
-- Name: security_events No direct client inserts to security_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct client inserts to security_events" ON public.security_events FOR INSERT WITH CHECK (false);


--
-- Name: ad_key_sessions Only service role can create ad sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only service role can create ad sessions" ON public.ad_key_sessions FOR INSERT WITH CHECK (false);


--
-- Name: sales Only service role can insert sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only service role can insert sales" ON public.sales FOR INSERT WITH CHECK (false);


--
-- Name: ad_key_sessions Only service role can update ad sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only service role can update ad sessions" ON public.ad_key_sessions FOR UPDATE USING (false);


--
-- Name: script_executions Public can insert executions for existing scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can insert executions for existing scripts" ON public.script_executions FOR INSERT WITH CHECK (((script_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.scripts s
  WHERE (s.id = script_executions.script_id)))));


--
-- Name: script_views Public can insert views for existing scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can insert views for existing scripts" ON public.script_views FOR INSERT WITH CHECK (((script_id IS NOT NULL) AND (viewer_ip IS NOT NULL) AND (length(viewer_ip) <= 64) AND (EXISTS ( SELECT 1
   FROM public.scripts s
  WHERE (s.id = script_views.script_id)))));


--
-- Name: ad_checkpoints Public can view checkpoint redirect info; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view checkpoint redirect info" ON public.ad_checkpoints FOR SELECT USING (true);


--
-- Name: ad_key_settings Script owners can manage ad settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Script owners can manage ad settings" ON public.ad_key_settings USING ((EXISTS ( SELECT 1
   FROM public.scripts
  WHERE ((scripts.id = ad_key_settings.script_id) AND (scripts.user_id = auth.uid())))));


--
-- Name: ad_checkpoints Script owners can manage checkpoints; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Script owners can manage checkpoints" ON public.ad_checkpoints USING ((EXISTS ( SELECT 1
   FROM public.scripts
  WHERE ((scripts.id = ad_checkpoints.script_id) AND (scripts.user_id = auth.uid())))));


--
-- Name: ad_key_sessions Script owners can view ad sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Script owners can view ad sessions" ON public.ad_key_sessions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.scripts
  WHERE ((scripts.id = ad_key_sessions.script_id) AND (scripts.user_id = auth.uid())))));


--
-- Name: script_keys Script owners can view keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Script owners can view keys" ON public.script_keys FOR SELECT USING ((script_id IN ( SELECT scripts.id
   FROM public.scripts
  WHERE (scripts.user_id = auth.uid()))));


--
-- Name: script_views Script owners can view their script views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Script owners can view their script views" ON public.script_views FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.scripts
  WHERE ((scripts.id = script_views.script_id) AND (scripts.user_id = auth.uid())))));


--
-- Name: obfuscated_loaders Service role only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role only" ON public.obfuscated_loaders USING (false) WITH CHECK (false);


--
-- Name: script_keys Users can create keys for their scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create keys for their scripts" ON public.script_keys FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.scripts
  WHERE ((scripts.id = script_keys.script_id) AND (scripts.user_id = auth.uid())))));


--
-- Name: support_messages Users can create messages in their tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create messages in their tickets" ON public.support_messages FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.support_tickets
  WHERE ((support_tickets.id = support_messages.ticket_id) AND (support_tickets.user_id = auth.uid())))) AND (sender_type = 'user'::text)));


--
-- Name: support_tickets Users can create their own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own tickets" ON public.support_tickets FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: script_keys Users can delete keys for their scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete keys for their scripts" ON public.script_keys FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.scripts
  WHERE ((scripts.id = script_keys.script_id) AND (scripts.user_id = auth.uid())))));


--
-- Name: discord_servers Users can delete own discord configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own discord configs" ON public.discord_servers FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: scripts Users can delete own scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own scripts" ON public.scripts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: discord_servers Users can insert own discord configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own discord configs" ON public.discord_servers FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: scripts Users can insert own scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own scripts" ON public.scripts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: subscription_codes Users can see own used codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can see own used codes" ON public.subscription_codes FOR SELECT USING ((auth.uid() = used_by));


--
-- Name: subscription_codes Users can see their used codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can see their used codes" ON public.subscription_codes FOR SELECT USING ((auth.uid() = used_by));


--
-- Name: script_keys Users can update keys for their scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update keys for their scripts" ON public.script_keys FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.scripts
  WHERE ((scripts.id = script_keys.script_id) AND (scripts.user_id = auth.uid())))));


--
-- Name: discord_servers Users can update own discord configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own discord configs" ON public.discord_servers FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: scripts Users can update own scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own scripts" ON public.scripts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: script_executions Users can view executions for their scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view executions for their scripts" ON public.script_executions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.scripts
  WHERE ((scripts.id = script_executions.script_id) AND (scripts.user_id = auth.uid())))));


--
-- Name: support_messages Users can view messages from their tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages from their tickets" ON public.support_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.support_tickets
  WHERE ((support_tickets.id = support_messages.ticket_id) AND (support_tickets.user_id = auth.uid())))));


--
-- Name: discord_servers Users can view own discord configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own discord configs" ON public.discord_servers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = discord_servers.user_id) AND (profiles.api_key = discord_servers.api_key)))));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: scripts Users can view own scripts metadata; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own scripts metadata" ON public.scripts FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: support_tickets Users can view their own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own tickets" ON public.support_tickets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ad_checkpoints; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_checkpoints ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_key_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_key_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_key_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_key_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: api_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: discord_servers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discord_servers ENABLE ROW LEVEL SECURITY;

--
-- Name: obfuscated_loaders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.obfuscated_loaders ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: promo_code_uses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.promo_code_uses ENABLE ROW LEVEL SECURITY;

--
-- Name: promo_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: sales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

--
-- Name: script_executions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.script_executions ENABLE ROW LEVEL SECURITY;

--
-- Name: script_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.script_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: script_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.script_views ENABLE ROW LEVEL SECURITY;

--
-- Name: scripts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

--
-- Name: security_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

--
-- Name: subscription_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscription_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: support_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: support_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: used_nonces; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.used_nonces ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;