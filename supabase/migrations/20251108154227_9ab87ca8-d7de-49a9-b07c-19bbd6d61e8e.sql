-- Fix rate_limits RLS policy to restrict SELECT access
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;

-- Create separate policies with proper restrictions
-- Only service role can read rate limits (for backend validation)
CREATE POLICY "Service role can view rate limits"
ON public.rate_limits
FOR SELECT
TO service_role
USING (true);

-- Only service role can insert rate limits (for backend tracking)
CREATE POLICY "Service role can insert rate limits"
ON public.rate_limits
FOR INSERT
TO service_role
WITH CHECK (true);

-- Only service role can update rate limits (for backend tracking)
CREATE POLICY "Service role can update rate limits"
ON public.rate_limits
FOR UPDATE
TO service_role
USING (true);

-- Only service role can delete rate limits (for cleanup)
CREATE POLICY "Service role can delete rate limits"
ON public.rate_limits
FOR DELETE
TO service_role
USING (true);

-- Add DELETE policy for profiles table
-- Users should be able to delete their own profile
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = user_id);