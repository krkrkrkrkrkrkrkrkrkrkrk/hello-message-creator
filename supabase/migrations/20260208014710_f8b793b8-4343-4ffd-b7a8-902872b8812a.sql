
-- Fix overly permissive RLS policies

-- 1. user_roles: Replace "FOR ALL USING (true)" with proper admin-only policy
DROP POLICY IF EXISTS "Service role can manage roles" ON public.user_roles;
-- Only service role key (used in edge functions) can manage roles - no policy needed for regular users
-- The existing "Users can view their own roles" policy is sufficient for SELECT

-- 2. subscription_codes: Replace "anyone can insert" with proper policy
DROP POLICY IF EXISTS "Anyone can insert codes" ON public.subscription_codes;
CREATE POLICY "Admins can manage subscription codes" ON public.subscription_codes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- 3. script_views: Replace "anyone can insert" with a more restrictive policy
DROP POLICY IF EXISTS "Anyone can insert script views" ON public.script_views;
CREATE POLICY "Authenticated users can insert script views" ON public.script_views FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
