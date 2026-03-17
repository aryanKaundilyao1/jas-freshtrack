import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Calendar, MapPin, Package, Plus, Search, Trash2, Edit } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, parseISO } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

interface PantryItem {
  id: string;
  current_quantity: number;
  is_consumed: boolean;
  batches: {
    id: string;
    expiry_date: string;
    purchase_date: string;
    quantity: number;
    unit: string;
    location: string;
    products: {
      id: string;
      name: string;
      brand: string;
      category: string;
    };
  };
}

export default function Pantry() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [sortBy, setSortBy] = useState('expiry');

  const { data: pantryItems = [], isLoading, refetch } = useQuery({
    queryKey: ['pantry-items', searchTerm, locationFilter],
    queryFn: async () => {
      let query = supabase
        .from('pantry_items')
        .select(`
          id,
          current_quantity,
          is_consumed,
          batches!inner(
            id,
            expiry_date,
            purchase_date,
            quantity,
            unit,
            location,
            products!inner(
              id,
              name,
              brand,
              category
            )
          )
        `)
        .eq('is_consumed', false);

      if (locationFilter !== 'all') {
        query = query.eq('batches.location', locationFilter as any);
      }

      if (searchTerm) {
        query = query.ilike('batches.products.name', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let items = data as PantryItem[];

      // Sort items
      if (sortBy === 'expiry') {
        items = items.sort((a, b) => 
          new Date(a.batches.expiry_date).getTime() - new Date(b.batches.expiry_date).getTime()
        );
      } else if (sortBy === 'name') {
        items = items.sort((a, b) => 
          a.batches.products.name.localeCompare(b.batches.products.name)
        );
      } else if (sortBy === 'category') {
        items = items.sort((a, b) => 
          (a.batches.products.category || '').localeCompare(b.batches.products.category || '')
        );
      }

      return items;
    },
  });

  const getDaysUntilExpiry = (expiryDate: string) => {
    return differenceInDays(parseISO(expiryDate), new Date());
  };

  const getExpiryBadgeVariant = (days: number) => {
    if (days < 0) return 'destructive';
    if (days <= 1) return 'destructive';
    if (days <= 3) return 'default';
    if (days <= 7) return 'secondary';
    return 'outline';
  };

  const getLocationIcon = (location: string) => {
    switch (location) {
      case 'fridge':
        return '❄️';
      case 'freezer':
        return '🧊';
      case 'pantry':
        return '📦';
      case 'cabinet':
        return '🗄️';
      default:
        return '📦';
    }
  };

  const markAsConsumed = async (itemId: string, itemName: string) => {
    try {
      const { error } = await supabase
        .from('pantry_items')
        .update({
          is_consumed: true,
          consumed_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Item consumed!",
        description: `${itemName} has been marked as consumed.`,
      });

      refetch();
    } catch (error) {
      toast({
        title: "Failed to update item",
        description: "There was an error updating your item.",
        variant: "destructive",
      });
    }
  };

  const deleteItem = async (itemId: string, itemName: string) => {
    try {
      const { error } = await supabase
        .from('pantry_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Item deleted!",
        description: `${itemName} has been removed from your pantry.`,
      });

      refetch();
    } catch (error) {
      toast({
        title: "Failed to delete item",
        description: "There was an error deleting your item.",
        variant: "destructive",
      });
    }
  };

  const groupedItems = pantryItems.reduce((acc, item) => {
    const days = getDaysUntilExpiry(item.batches.expiry_date);
    let category: string;
    
    if (days < 0) {
      category = 'Expired';
    } else if (days <= 1) {
      category = 'Expires Today/Tomorrow';
    } else if (days <= 3) {
      category = 'Expires Soon (2-3 days)';
    } else if (days <= 7) {
      category = 'Expires This Week';
    } else {
      category = 'Fresh (>7 days)';
    }

    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, PantryItem[]>);

  const expiredCount = groupedItems['Expired']?.length || 0;
  const expiringSoonCount = (groupedItems['Expires Today/Tomorrow']?.length || 0) + 
                          (groupedItems['Expires Soon (2-3 days)']?.length || 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Pantry</h1>
          <p className="text-muted-foreground">
            {pantryItems.length} items • {expiredCount} expired • {expiringSoonCount} expiring soon
          </p>
        </div>
        <Button onClick={() => navigate('/scan')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="fridge">Fridge</SelectItem>
                <SelectItem value="freezer">Freezer</SelectItem>
                <SelectItem value="pantry">Pantry</SelectItem>
                <SelectItem value="cabinet">Cabinet</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expiry">Sort by Expiry</SelectItem>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="category">Sort by Category</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      {pantryItems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Your pantry is empty</h3>
            <p className="text-muted-foreground mb-4">
              Start by adding some items to track their expiry dates
            </p>
            <Button onClick={() => navigate('/scan')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="grouped" className="w-full">
          <TabsList>
            <TabsTrigger value="grouped">Grouped by Expiry</TabsTrigger>
            <TabsTrigger value="list">Full List</TabsTrigger>
          </TabsList>

          <TabsContent value="grouped" className="space-y-4">
            {Object.entries(groupedItems).map(([category, items]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {category.includes('Expired') && <AlertTriangle className="h-5 w-5 text-destructive" />}
                    {category.includes('Today') && <Calendar className="h-5 w-5 text-destructive" />}
                    {category.includes('Soon') && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                    {category.includes('Week') && <Calendar className="h-5 w-5 text-blue-600" />}
                    {category.includes('Fresh') && <Calendar className="h-5 w-5 text-green-600" />}
                    {category}
                    <Badge variant="secondary" className="ml-2">
                      {items.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {items.map((item) => {
                      const days = getDaysUntilExpiry(item.batches.expiry_date);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="text-2xl">
                              {getLocationIcon(item.batches.location)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">
                                {item.batches.products.name}
                                {item.batches.products.brand && (
                                  <span className="text-sm text-muted-foreground ml-2">
                                    ({item.batches.products.brand})
                                  </span>
                                )}
                              </h4>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>{item.current_quantity} {item.batches.unit}</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {item.batches.location}
                                </span>
                                {item.batches.products.category && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.batches.products.category}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <Badge variant={getExpiryBadgeVariant(days)} className="mb-1">
                                {days < 0
                                  ? `Expired ${Math.abs(days)} days ago`
                                  : days === 0
                                  ? 'Expires today'
                                  : days === 1
                                  ? 'Expires tomorrow'
                                  : `${days} days left`}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {format(parseISO(item.batches.expiry_date), 'MMM dd, yyyy')}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => markAsConsumed(item.id, item.batches.products.name)}
                                className="text-green-600 hover:text-green-700"
                              >
                                ✓ Used
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteItem(item.id, item.batches.products.name)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {pantryItems.map((item) => {
                    const days = getDaysUntilExpiry(item.batches.expiry_date);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="text-2xl">
                            {getLocationIcon(item.batches.location)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">
                              {item.batches.products.name}
                              {item.batches.products.brand && (
                                <span className="text-sm text-muted-foreground ml-2">
                                  ({item.batches.products.brand})
                                </span>
                              )}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{item.current_quantity} {item.batches.unit}</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {item.batches.location}
                              </span>
                              {item.batches.products.category && (
                                <Badge variant="outline" className="text-xs">
                                  {item.batches.products.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <Badge variant={getExpiryBadgeVariant(days)} className="mb-1">
                              {days < 0
                                ? `Expired ${Math.abs(days)} days ago`
                                : days === 0
                                ? 'Expires today'
                                : days === 1
                                ? 'Expires tomorrow'
                                : `${days} days left`}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(item.batches.expiry_date), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markAsConsumed(item.id, item.batches.products.name)}
                              className="text-green-600 hover:text-green-700"
                            >
                              ✓ Used
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteItem(item.id, item.batches.products.name)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}