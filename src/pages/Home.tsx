import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scan, AlertTriangle, Calendar, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, parseISO } from 'date-fns';

interface PantryItem {
  id: string;
  current_quantity: number;
  batches: {
    expiry_date: string;
    quantity: number;
    unit: string;
    location: string;
    products: {
      name: string;
      brand: string;
      category: string;
    };
  };
}

export default function Home() {
  const navigate = useNavigate();

  const { data: expiringItems = [], isLoading } = useQuery({
    queryKey: ['expiring-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pantry_items')
        .select(`
          id,
          current_quantity,
          batches!inner(
            expiry_date,
            quantity,
            unit,
            location,
            products!inner(
              name,
              brand,
              category
            )
          )
        `)
        .eq('is_consumed', false)
        .gte('batches.expiry_date', new Date().toISOString().split('T')[0])
        .lte('batches.expiry_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('batches(expiry_date)', { ascending: true });

      if (error) throw error;
      return data as PantryItem[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['pantry-stats'],
    queryFn: async () => {
      const { count: totalItems, error: totalError } = await supabase
        .from('pantry_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_consumed', false);

      const { count: consumedItems, error: consumedError } = await supabase
        .from('pantry_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_consumed', true);

      if (totalError || consumedError) throw totalError || consumedError;
      
      return {
        totalItems: totalItems || 0,
        consumedItems: consumedItems || 0,
      };
    },
  });

  const getDaysUntilExpiry = (expiryDate: string) => {
    return differenceInDays(parseISO(expiryDate), new Date());
  };

  const getExpiryBadgeVariant = (days: number) => {
    if (days <= 1) return 'destructive';
    if (days <= 3) return 'default';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back!</CardTitle>
          <CardDescription>
            Track your groceries and reduce food waste with smart expiry monitoring.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" onClick={() => navigate('/scan')} className="w-full sm:w-auto">
            <Scan className="h-5 w-5 mr-2" />
            Scan New Item
          </Button>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalItems || 0}</div>
            <p className="text-xs text-muted-foreground">
              Items in your pantry
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {expiringItems.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Within 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Used</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.consumedItems || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Waste prevented
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Items Expiring Soon
              </CardTitle>
              <CardDescription>
                Items that expire within the next 7 days
              </CardDescription>
            </div>
            {expiringItems.length > 0 && (
              <Button variant="outline" onClick={() => navigate('/recipes')}>
                Get Recipe Ideas
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : expiringItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items expiring soon!</p>
              <p className="text-sm">Your pantry is looking good.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expiringItems.map((item) => {
                const days = getDaysUntilExpiry(item.batches.expiry_date);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">
                        {item.batches.products.name}
                        {item.batches.products.brand && (
                          <span className="text-sm text-muted-foreground ml-2">
                            ({item.batches.products.brand})
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {item.current_quantity} {item.batches.unit} • {item.batches.location}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={getExpiryBadgeVariant(days)}>
                        {days === 0
                          ? 'Expires today'
                          : days === 1
                          ? 'Expires tomorrow'
                          : `${days} days left`}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(item.batches.expiry_date), 'MMM dd')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Package({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
    >
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}