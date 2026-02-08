-- Create marketplace products table
CREATE TABLE public.marketplace_products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    image_url TEXT,
    category TEXT DEFAULT 'general',
    is_advertised BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    downloads INTEGER DEFAULT 0,
    rating NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;

-- Policies for marketplace products
CREATE POLICY "Anyone can view active advertised products"
ON public.marketplace_products FOR SELECT
USING (is_active = true AND is_advertised = true);

CREATE POLICY "Users can manage own products"
ON public.marketplace_products FOR ALL
USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_marketplace_products_updated_at
BEFORE UPDATE ON public.marketplace_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();