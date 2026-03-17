-- Add RLS policy to allow authenticated users to create products
-- This addresses the security finding about users needing to add custom products
CREATE POLICY "Authenticated users can create products" 
ON public.products 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Add rate limiting table for edge functions
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  ip_address inet,
  function_name text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for rate limits (only accessible by the system)
CREATE POLICY "System can manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (false) 
WITH CHECK (false);

-- Create index for efficient rate limiting queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
ON public.rate_limits (user_id, ip_address, function_name, window_start);

-- Add trigger to clean up old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - interval '1 hour';
$$;