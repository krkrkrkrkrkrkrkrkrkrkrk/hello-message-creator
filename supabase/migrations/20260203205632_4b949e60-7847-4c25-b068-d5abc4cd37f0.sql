-- Criar tabela para rastrear pagamentos crypto pendentes
CREATE TABLE IF NOT EXISTS public.crypto_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL UNIQUE,
  invoice_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'pending',
  api_key TEXT UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  payment_currency TEXT,
  payment_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.crypto_payments ENABLE ROW LEVEL SECURITY;

-- Policies for crypto_payments
CREATE POLICY "Anyone can check payment status by order_id"
ON public.crypto_payments
FOR SELECT
USING (true);

CREATE POLICY "Only service role can insert payments"
ON public.crypto_payments
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Only service role can update payments"
ON public.crypto_payments
FOR UPDATE
USING (false);

CREATE POLICY "No one can delete payments"
ON public.crypto_payments
FOR DELETE
USING (false);

-- Create index for faster lookups
CREATE INDEX idx_crypto_payments_order_id ON public.crypto_payments(order_id);
CREATE INDEX idx_crypto_payments_status ON public.crypto_payments(status);

-- Add email validation function
CREATE OR REPLACE FUNCTION public.is_valid_email(email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  domain TEXT;
  disposable_domains TEXT[] := ARRAY[
    'tempmail.com', 'temp-mail.org', 'guerrillamail.com', '10minutemail.com',
    'mailinator.com', 'maildrop.cc', 'throwaway.email', 'trashmail.com',
    'yopmail.com', 'fakeinbox.com', 'getnada.com', 'sharklasers.com',
    'spam4.me', 'grr.la', 'tempail.com', 'mohmal.com', 'dispostable.com',
    'mailnesia.com', 'burnermail.io', 'tmpmail.org', 'email-fake.com',
    'mailsac.com', 'tempr.email', 'discard.email', 'spamgourmet.com',
    'mailexpire.com', 'nada.email', 'spambox.us', 'trashmail.me'
  ];
BEGIN
  -- Basic format validation
  IF email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN false;
  END IF;
  
  -- Extract domain
  domain := lower(split_part(email, '@', 2));
  
  -- Check against disposable domains
  IF domain = ANY(disposable_domains) THEN
    RETURN false;
  END IF;
  
  -- Check for suspicious patterns (random long strings)
  IF split_part(email, '@', 1) ~ '^[a-z0-9]{20,}$' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Update sales table RLS to be more restrictive
DROP POLICY IF EXISTS "Only service role can insert sales" ON public.sales;
CREATE POLICY "Service role only inserts sales"
ON public.sales
FOR INSERT
WITH CHECK (false);

-- Ensure admins can view but not modify sales inappropriately
DROP POLICY IF EXISTS "Admins can view all sales" ON public.sales;
CREATE POLICY "Admins can view sales"
ON public.sales
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create policy to prevent any updates to sales
CREATE POLICY "No updates to sales"
ON public.sales
FOR UPDATE
USING (false);

-- Create policy to prevent any deletes to sales  
CREATE POLICY "No deletes from sales"
ON public.sales
FOR DELETE
USING (false);