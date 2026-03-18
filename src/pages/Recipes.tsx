import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChefHat, Clock, Users, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

interface ExpiringItem {
  name: string;
  brand?: string;
  quantity: number;
  unit: string;
  daysUntilExpiry: number;
}

interface Recipe {
  title: string;
  prepTimeMinutes: number;
  servings: number;
  ingredients: string[];
  instructions: string[];
}

interface RecipeResponse {
  recipes: Recipe[];
}

export default function Recipes() {
  const [generatedRecipes, setGeneratedRecipes] = useState<Recipe[]>([]);

  const { data: expiringItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['expiring-items-for-recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pantry_items')
        .select(`
          current_quantity,
          batches!inner(
            expiry_date,
            quantity,
            unit,
            products!inner(
              name,
              brand
            )
          )
        `)
        .eq('is_consumed', false)
        .gte('batches.expiry_date', new Date().toISOString().split('T')[0])
        .lte('batches.expiry_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (error) throw error;

      return data.map(item => ({
        name: item.batches.products.name,
        brand: item.batches.products.brand,
        quantity: item.current_quantity,
        unit: item.batches.unit,
        daysUntilExpiry: differenceInDays(parseISO(item.batches.expiry_date), new Date()),
      })) as ExpiringItem[];
    },
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('dietary_preferences, allergens')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const generateRecipesMutation = useMutation({
    mutationFn: async () => {
      if (expiringItems.length === 0) {
        throw new Error('No expiring items to generate recipes for');
      }

      const { data, error } = await supabase.functions.invoke('generate-recipes', {
        body: {
          expiringItems,
          dietaryPreferences: userProfile?.dietary_preferences || [],
          allergens: userProfile?.allergens || [],
        },
      });

      if (error) throw error;
      return data as RecipeResponse;
    },
    onSuccess: (data) => {
      if (data?.recipes) {
        setGeneratedRecipes(data.recipes);
        toast({
          title: "Recipes generated!",
          description: `Found ${data.recipes.length} recipes to help use your expiring items.`,
        });
      } else {
        throw new Error('Invalid response format');
      }
    },
    onError: (error) => {
      toast({
        title: "Recipe generation failed",
        description: "There was an error generating recipes. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveRecipe = async (recipe: Recipe) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          title: recipe.title,
          prep_time_minutes: recipe.prepTimeMinutes,
          servings: recipe.servings,
          ingredients: recipe.ingredients,
          steps: recipe.instructions,
          created_by: 'AI',
        });

      if (error) throw error;

      toast({
        title: "Recipe saved!",
        description: `${recipe.title} has been added to your saved recipes.`,
      });
    } catch (error) {
      toast({
        title: "Failed to save recipe",
        description: "There was an error saving the recipe.",
        variant: "destructive",
      });
    }
  };

  if (loadingItems) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ChefHat className="h-8 w-8" />
          AI Recipe Generator
        </h1>
        <p className="text-muted-foreground">
          Generate recipes using your expiring ingredients to reduce food waste
        </p>
      </div>

      {/* Expiring Items Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Items Expiring Soon</CardTitle>
          <CardDescription>
            These items will be used to generate personalized recipes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expiringItems.length === 0 ? (
            <div className="text-center py-8">
              <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">No items expiring soon</p>
              <p className="text-sm text-muted-foreground">
                Add some items to your pantry to get recipe suggestions
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {expiringItems.map((item, index) => (
                  <Badge key={index} variant="outline" className="flex items-center gap-2">
                    <span>
                      {item.name}
                      {item.brand && ` (${item.brand})`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.quantity} {item.unit}
                    </span>
                    <span className="text-xs font-medium">
                      {item.daysUntilExpiry} day{item.daysUntilExpiry !== 1 ? 's' : ''} left
                    </span>
                  </Badge>
                ))}
              </div>
              
                
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Recipes */}
      {generatedRecipes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Generated Recipes</h2>
            <Button
              variant="outline"
              onClick={() => generateRecipesMutation.mutate()}
              disabled={generateRecipesMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Generate New Recipes
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
            {generatedRecipes.map((recipe, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{recipe.title}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {recipe.prepTimeMinutes} minutes
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => saveRecipe(recipe)}
                      className="ml-4"
                    >
                      Save Recipe
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Ingredients */}
                  <div>
                    <h4 className="font-semibold mb-3">Ingredients</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {recipe.ingredients.map((ingredient, idx) => (
                        <div key={idx} className="flex items-center text-sm">
                          <span className="w-2 h-2 rounded-full bg-primary mr-3 flex-shrink-0"></span>
                          {ingredient}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Instructions */}
                  <div>
                    <h4 className="font-semibold mb-3">Instructions</h4>
                    <div className="space-y-3">
                      {recipe.instructions.map((step, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                            {idx + 1}
                          </div>
                          <p className="text-sm leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}