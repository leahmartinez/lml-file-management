import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
}

export const DashboardCard = ({ title, value, icon: Icon, trend }: DashboardCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {trend && (
          <p className="text-xs text-muted-foreground mt-1">
            <span
              className={
                trend.direction === "up"
                  ? "text-accent"
                  : trend.direction === "down"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }
            >
              {trend.value}
            </span>{" "}
            from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
};