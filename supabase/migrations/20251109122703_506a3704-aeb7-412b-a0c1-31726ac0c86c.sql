-- Allow authenticated users to create products
-- Users need to be able to create products when scanning items
DROP POLICY IF EXISTS "Only admins can create products" ON public.products;

CREATE POLICY "Authenticated users can create products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Keep the admin-only update and delete policies
-- SELECT policy already allows all authenticated users