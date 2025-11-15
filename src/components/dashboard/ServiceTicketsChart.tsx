import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useMemo } from "react";

/**
 * Custom X-axis tick renderer to prevent label overlap
 * Shows compact month format for better readability
 */
const CustomXAxisTick = ({ x, y, payload }) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="middle"
        fill="hsl(var(--muted-foreground))"
        className="text-xs"
      >
        {payload.value}
      </text>
    </g>
  );
};

export const ServiceTicketsChart = ({ data }) => {
  // Memoize chart data calculation to avoid expensive reduce operations on every render
  const chartData = useMemo(() => {
    return data.reduce((acc, asset) => {
      if (!asset.serviceTickets) return acc;
      const tickets = asset.serviceTickets.split(",");
      tickets.forEach(ticket => {
        const date = new Date(ticket);
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        const monthYear = `${month} ${year}`;

        const existingMonth = acc.find(m => m.month === monthYear);
        if (existingMonth) {
          existingMonth.tickets += 1;
        } else {
          acc.push({ month: monthYear, tickets: 1 });
        }
      });
      return acc;
    }, []);
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Service Tickets - 6 Month Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="month"
              tick={<CustomXAxisTick />}
              height={35}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Bar dataKey="tickets" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};