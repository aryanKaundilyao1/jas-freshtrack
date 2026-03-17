-- Fix rate_limits table RLS policy to be more restrictive
DROP POLICY IF EXISTS "Edge functions can manage rate limits" ON public.rate_limits;

-- Create more restrictive policy for rate_limits
CREATE POLICY "Service role can manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Grant necessary permissions to service role for rate_limits table
GRANT ALL ON public.rate_limits TO service_role;