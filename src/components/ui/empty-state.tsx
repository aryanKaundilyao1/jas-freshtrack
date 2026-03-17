import { LucideIcon } from "lucide-react";
import { Button } from "./button";
import { Card } from "./card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className
}: EmptyStateProps) {
  return (
    <Card className={`flex flex-col items-center justify-center py-12 px-8 text-center glass-card ${className || ''}`}>
      <div className="rounded-full bg-primary/10 p-6 mb-6 animate-float">
        <Icon className="w-12 h-12 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          className="btn-gradient-primary"
        >
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}