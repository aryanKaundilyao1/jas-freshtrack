-- Fix products table security - restrict to authenticated users only
DROP POLICY IF EXISTS "Everyone can view products" ON public.products;
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can create products" ON public.products;

CREATE POLICY "Authenticated users can view products" 
ON public.products 
FOR SELECT 
TO authenticated
USING (true);

-- Fix rate_limits table policies to allow system access
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "System functions can manage rate limits" ON public.rate_limits;

-- Allow edge functions to manage rate limits
CREATE POLICY "Edge functions can manage rate limits" 
ON public.rate_limits 
FOR ALL
USING (true)
WITH CHECK (true);