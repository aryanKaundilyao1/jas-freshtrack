-- Create enum types
CREATE TYPE public.dietary_preference AS ENUM ('vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'nut_free', 'none');
CREATE TYPE public.location_type AS ENUM ('fridge', 'freezer', 'pantry', 'cabinet');
CREATE TYPE public.unit_type AS ENUM ('kg', 'g', 'lb', 'oz', 'l', 'ml', 'pieces', 'cans', 'bottles');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  dietary_preferences dietary_preference[] DEFAULT '{}',
  allergens TEXT[] DEFAULT '{}',
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  default_shelf_life_days INTEGER DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create batches table
CREATE TABLE public.batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit unit_type NOT NULL DEFAULT 'pieces',
  location location_type NOT NULL DEFAULT 'pantry',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pantry_items table
CREATE TABLE public.pantry_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  current_quantity DECIMAL(10,2) NOT NULL,
  is_consumed BOOLEAN NOT NULL DEFAULT false,
  consumed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recipes table
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prep_time_minutes INTEGER,
  servings INTEGER,
  ingredients JSONB NOT NULL,
  steps TEXT[] NOT NULL,
  created_by TEXT DEFAULT 'AI',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for products (public read, authenticated insert/update)
CREATE POLICY "Products are viewable by everyone" 
ON public.products 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create products" 
ON public.products 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update products" 
ON public.products 
FOR UPDATE 
TO authenticated
USING (true);

-- Create RLS policies for batches
CREATE POLICY "Users can view their own batches" 
ON public.batches 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own batches" 
ON public.batches 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own batches" 
ON public.batches 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own batches" 
ON public.batches 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for pantry_items
CREATE POLICY "Users can view pantry items from their batches" 
ON public.pantry_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.batches 
    WHERE batches.id = pantry_items.batch_id 
    AND batches.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create pantry items for their batches" 
ON public.pantry_items 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.batches 
    WHERE batches.id = pantry_items.batch_id 
    AND batches.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update pantry items from their batches" 
ON public.pantry_items 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.batches 
    WHERE batches.id = pantry_items.batch_id 
    AND batches.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete pantry items from their batches" 
ON public.pantry_items 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.batches 
    WHERE batches.id = pantry_items.batch_id 
    AND batches.user_id = auth.uid()
  )
);

-- Create RLS policies for recipes
CREATE POLICY "Users can view their own recipes" 
ON public.recipes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recipes" 
ON public.recipes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes" 
ON public.recipes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes" 
ON public.recipes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_batches_updated_at
  BEFORE UPDATE ON public.batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pantry_items_updated_at
  BEFORE UPDATE ON public.pantry_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_batches_user_id ON public.batches(user_id);
CREATE INDEX idx_batches_expiry_date ON public.batches(expiry_date);
CREATE INDEX idx_pantry_items_batch_id ON public.pantry_items(batch_id);
CREATE INDEX idx_recipes_user_id ON public.recipes(user_id);