-- Add some test items that expire within the next 7 days for recipe generation
-- First, let's add some products if they don't exist
INSERT INTO public.products (name, brand, category, default_shelf_life_days)
VALUES 
  ('bananas', 'Fresh Co', 'fruits', 7),
  ('tomatoes', 'Farm Fresh', 'vegetables', 5),
  ('bread', 'Wonder', 'bakery', 3),
  ('lettuce', 'Green Valley', 'vegetables', 4),
  ('carrots', 'Garden Fresh', 'vegetables', 14)
ON CONFLICT (name) DO NOTHING;

-- Now add batches with expiry dates within the next 7 days
INSERT INTO public.batches (user_id, product_id, purchase_date, expiry_date, quantity, unit, location)
SELECT 
  auth.uid(),
  p.id,
  CURRENT_DATE - INTERVAL '2 days',
  CURRENT_DATE + INTERVAL '2 days',
  3,
  'pieces',
  'kitchen'
FROM public.products p
WHERE p.name = 'bananas'
AND auth.uid() IS NOT NULL;

INSERT INTO public.batches (user_id, product_id, purchase_date, expiry_date, quantity, unit, location)
SELECT 
  auth.uid(),
  p.id,
  CURRENT_DATE - INTERVAL '1 day',
  CURRENT_DATE + INTERVAL '3 days',
  5,
  'pieces',
  'refrigerator'
FROM public.products p
WHERE p.name = 'tomatoes'
AND auth.uid() IS NOT NULL;

INSERT INTO public.batches (user_id, product_id, purchase_date, expiry_date, quantity, unit, location)
SELECT 
  auth.uid(),
  p.id,
  CURRENT_DATE - INTERVAL '1 day',
  CURRENT_DATE + INTERVAL '1 day',
  1,
  'loaf',
  'pantry'
FROM public.products p
WHERE p.name = 'bread'
AND auth.uid() IS NOT NULL;

INSERT INTO public.batches (user_id, product_id, purchase_date, expiry_date, quantity, unit, location)
SELECT 
  auth.uid(),
  p.id,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '4 days',
  1,
  'head',
  'refrigerator'
FROM public.products p
WHERE p.name = 'lettuce'
AND auth.uid() IS NOT NULL;

-- Add pantry items for these batches
INSERT INTO public.pantry_items (batch_id, current_quantity, is_consumed)
SELECT 
  b.id,
  b.quantity,
  false
FROM public.batches b
JOIN public.products p ON b.product_id = p.id
WHERE p.name IN ('bananas', 'tomatoes', 'bread', 'lettuce')
AND b.user_id = auth.uid()
AND b.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ON CONFLICT DO NOTHING;