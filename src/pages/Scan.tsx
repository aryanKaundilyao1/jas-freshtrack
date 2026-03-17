import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Camera, Search, Calendar, Package, MapPin, Plus } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import CameraScanner from '@/components/CameraScanner';

const locations = [
  { value: 'pantry', label: 'Pantry' },
  { value: 'fridge', label: 'Refrigerator' },
  { value: 'freezer', label: 'Freezer' },
  { value: 'cabinet', label: 'Cabinet' },
];

const units = [
  { value: 'pieces', label: 'Pieces' },
  { value: 'kg', label: 'Kilograms' },
  { value: 'g', label: 'Grams' },
  { value: 'lb', label: 'Pounds' },
  { value: 'oz', label: 'Ounces' },
  { value: 'l', label: 'Liters' },
  { value: 'ml', label: 'Milliliters' },
  { value: 'cans', label: 'Cans' },
  { value: 'bottles', label: 'Bottles' },
];

interface ProductData {
  name: string;
  brand?: string;
  category?: string;
  barcode?: string;
}

export default function Scan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    brand: '',
    category: '',
    quantity: '1',
    unit: 'pieces',
    location: 'pantry',
    purchaseDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
  });

  const handleBarcodeSearch = async () => {
    if (!formData.barcode.trim()) {
      toast({
        title: "Enter a barcode",
        description: "Please enter a barcode to search for product information.",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    
    try {
      // First, check if we already have this product in our database
      const { data: existingProduct } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', formData.barcode)
        .single();

      if (existingProduct) {
        setProductData({
          name: existingProduct.name,
          brand: existingProduct.brand || '',
          category: existingProduct.category || '',
          barcode: existingProduct.barcode || '',
        });
        setFormData(prev => ({
          ...prev,
          name: existingProduct.name,
          brand: existingProduct.brand || '',
          category: existingProduct.category || '',
        }));
        toast({
          title: "Product found!",
          description: `Found ${existingProduct.name} in our database.`,
        });
        return;
      }

      // If not found locally, try Open Food Facts API
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${formData.barcode}.json`);
      const data = await response.json();

      if (data.status === 1 && data.product) {
        const product = data.product;
        const productInfo = {
          name: product.product_name || product.generic_name || `Product ${formData.barcode}`,
          brand: product.brands || '',
          category: product.categories_tags?.[0]?.replace(/^en:/, '') || '',
          barcode: formData.barcode,
        };

        setProductData(productInfo);
        setFormData(prev => ({
          ...prev,
          name: productInfo.name,
          brand: productInfo.brand,
          category: productInfo.category,
        }));

        toast({
          title: "Product found!",
          description: `Found ${productInfo.name} via barcode lookup.`,
        });
      } else {
        toast({
          title: "Product not found",
          description: "Please enter product details manually.",
        });
        setFormData(prev => ({
          ...prev,
          name: `Product ${formData.barcode}`,
        }));
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
      toast({
        title: "Lookup failed",
        description: "Could not lookup product. Please enter details manually.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to add items.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name.trim() || !formData.expiryDate) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      // First, create or get the product
      let productId: string;

      if (productData || formData.barcode) {
        // Try to find existing product or create new one
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('barcode', formData.barcode)
          .single();

        if (existingProduct) {
          productId = existingProduct.id;
        } else {
          const { data: newProduct, error: productError } = await supabase
            .from('products')
            .insert({
              barcode: formData.barcode || null,
              name: formData.name,
              brand: formData.brand || null,
              category: formData.category || null,
            })
            .select('id')
            .single();

          if (productError) throw productError;
          productId = newProduct.id;
        }
      } else {
        // Create product without barcode
        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert({
            name: formData.name,
            brand: formData.brand || null,
            category: formData.category || null,
          })
          .select('id')
          .single();

        if (productError) throw productError;
        productId = newProduct.id;
      }

      // Create batch
      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .insert({
          user_id: user.id,
          product_id: productId,
          purchase_date: formData.purchaseDate,
          expiry_date: formData.expiryDate,
          quantity: parseFloat(formData.quantity),
          unit: formData.unit as any,
          location: formData.location as any,
        })
        .select('id')
        .single();

      if (batchError) throw batchError;

      // Create pantry item
      const { error: pantryError } = await supabase
        .from('pantry_items')
        .insert({
          batch_id: batch.id,
          current_quantity: parseFloat(formData.quantity),
        });

      if (pantryError) throw pantryError;

      toast({
        title: "Item added!",
        description: `${formData.name} has been added to your pantry.`,
      });

      navigate('/pantry');
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Failed to add item",
        description: "There was an error adding your item. Please try again.",
        variant: "destructive",
      });
    }
  };

  const estimateExpiryDate = () => {
    const days = formData.category === 'dairy' ? 7 : 
                 formData.category === 'meat' ? 3 :
                 formData.category === 'produce' ? 5 :
                 formData.category === 'canned' ? 365 : 14;
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    
    setFormData(prev => ({
      ...prev,
      expiryDate: expiryDate.toISOString().split('T')[0]
    }));
    
    toast({
      title: "Expiry date estimated",
      description: `Set to ${days} days from now based on category.`,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Add New Item
          </CardTitle>
          <CardDescription>
            Scan a barcode or manually enter product details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Barcode Section */}
          <div className="space-y-3">
            <Label htmlFor="barcode">Barcode (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="barcode"
                placeholder="Enter barcode number"
                value={formData.barcode}
                onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleBarcodeSearch}
                disabled={isScanning}
              >
                {isScanning ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
              <CameraScanner 
                onBarcodeDetected={(barcode) => {
                  setFormData(prev => ({ ...prev, barcode }));
                  handleBarcodeSearch();
                }}
                disabled={isScanning}
              />
            </div>
            {productData && (
              <Badge variant="secondary" className="mt-2">
                Product found: {productData.name}
              </Badge>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Product Details */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Organic Milk"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="e.g., Organic Valley"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., dairy, produce, meat"
              />
            </div>

            {/* Quantity and Unit */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select value={formData.unit} onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Storage Location</Label>
              <Select value={formData.location} onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.value} value={location.value}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {location.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryDate" className="flex items-center justify-between">
                  <span>Expiry Date *</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={estimateExpiryDate}
                    className="h-6 px-2 text-xs"
                  >
                    Estimate
                  </Button>
                </Label>
                <Input
                  id="expiryDate"
                  type="date"
                  required
                  value={formData.expiryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Add to Pantry
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}