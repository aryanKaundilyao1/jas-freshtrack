import { Badge } from "./badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "fresh" | "expiring" | "expired";
  daysLeft?: number;
  className?: string;
}

export function StatusBadge({ status, daysLeft, className }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "fresh":
        return {
          variant: "secondary" as const,
          className: "bg-success text-success-foreground border-success/20",
          label: daysLeft ? `${daysLeft} days left` : "Fresh"
        };
      case "expiring":
        return {
          variant: "secondary" as const,
          className: "bg-warning text-warning-foreground border-warning/20 animate-pulse-glow",
          label: daysLeft ? `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left` : "Expiring Soon"
        };
      case "expired":
        return {
          variant: "destructive" as const,
          className: "bg-destructive text-destructive-foreground",
          label: "Expired"
        };
      default:
        return {
          variant: "secondary" as const,
          className: "",
          label: "Unknown"
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge 
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}