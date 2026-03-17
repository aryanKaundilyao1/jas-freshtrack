import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  return (
    <div className={cn("animate-spin", sizeClasses[size], className)}>
      <div className="rounded-full border-2 border-primary border-t-transparent"></div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground animate-pulse">Loading FoodFriend...</p>
      </div>
    </div>
  );
}

export function CardLoader() {
  return (
    <div className="animate-pulse">
      <div className="bg-muted rounded-lg h-32 mb-4"></div>
      <div className="space-y-2">
        <div className="bg-muted h-4 rounded w-3/4"></div>
        <div className="bg-muted h-4 rounded w-1/2"></div>
      </div>
    </div>
  );
}