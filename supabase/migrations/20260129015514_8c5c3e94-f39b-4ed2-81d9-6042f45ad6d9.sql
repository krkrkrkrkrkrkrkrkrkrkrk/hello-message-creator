-- Create marketplace_purchases table to track user purchases
CREATE TABLE public.marketplace_purchases (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    product_id UUID NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
    license_key TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
    purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed',
    script_content TEXT,
    CONSTRAINT marketplace_purchases_user_id_product_id_key UNIQUE (user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.marketplace_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases"
ON public.marketplace_purchases
FOR SELECT
USING (user_id = auth.uid());

-- Only service role can insert purchases (will be done via edge function)
CREATE POLICY "Service role only insert purchases"
ON public.marketplace_purchases
FOR INSERT
WITH CHECK (false);

-- Add script_content column to marketplace_products if not exists
ALTER TABLE public.marketplace_products 
ADD COLUMN IF NOT EXISTS script_content TEXT;

-- Allow any authenticated user to insert purchases (for now, will refine later)
DROP POLICY IF EXISTS "Service role only insert purchases" ON public.marketplace_purchases;
CREATE POLICY "Authenticated users can purchase"
ON public.marketplace_purchases
FOR INSERT
WITH CHECK (auth.uid() = user_id);