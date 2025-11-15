import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useMemo } from "react";

/**
 * Custom X-axis tick renderer to prevent label overlap
 * Shows labels with 45° angle for better readability of long names
 */
const CustomXAxisTick = ({ x, y, payload }) => {
  const maxLength = 15; // Max chars before truncating
  const label = payload.value?.length > maxLength
    ? `${payload.value.substring(0, maxLength)}...`
    : payload.value;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill="hsl(var(--muted-foreground))"
        className="text-xs"
        style={{ transform: "rotate(-45deg)" }}
        transformOrigin="0 0"
      >
        {label}
      </text>
    </g>
  );
};

export const ResponseTimeChart = ({ data }) => {
  // Count unique buildings
  const uniqueBuildings = useMemo(() => {
    const buildings = new Set(data.map(asset => asset.building).filter(Boolean));
    return buildings.size;
  }, [data]);

  const responseData = useMemo(() => {
    // If only one building, show by contractor instead
    if (uniqueBuildings === 1) {
      const contractorData = data.reduce((acc, asset) => {
        if (!asset.contractor || !asset.avgResponseTime) return acc;
        const contractor = asset.contractor;
        const existing = acc.find(c => c.contractor === contractor);
        if (existing) {
          existing.count += 1;
          existing.totalResponse += parseFloat(asset.avgResponseTime);
          existing.avgResponse = existing.totalResponse / existing.count;
        } else {
          acc.push({ 
            contractor, 
            avgResponse: parseFloat(asset.avgResponseTime),
            totalResponse: parseFloat(asset.avgResponseTime),
            count: 1,
            target: 2.0
          });
        }
        return acc;
      }, []);
      return contractorData;
    }

    // Multiple buildings: show by building
    return data.reduce((acc, asset) => {
      if (!asset.building || !asset.avgResponseTime) return acc;
      const building = acc.find(b => b.building === asset.building);
      if (building) {
        building.count += 1;
        building.totalResponse += parseFloat(asset.avgResponseTime);
        building.avgResponse = building.totalResponse / building.count;
      } else {
        acc.push({ 
          building: asset.building, 
          avgResponse: parseFloat(asset.avgResponseTime),
          totalResponse: parseFloat(asset.avgResponseTime),
          count: 1,
          target: 2.0 
        });
      }
      return acc;
    }, []);
  }, [data, uniqueBuildings]);

  const isSingleSite = uniqueBuildings === 1;
  const dataKey = isSingleSite ? "contractor" : "building";
  const title = isSingleSite ? "Response Time by Contractor" : "Average Response Time (Hours)";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          {isSingleSite ? (
            <BarChart data={responseData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey={dataKey}
                tick={<CustomXAxisTick />}
                height={60}
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
                formatter={(value, name) => [
                  `${value.toFixed(2)} hrs`, 
                  name === "avgResponse" ? "Actual" : "Target"
                ]}
              />
              <Bar 
                dataKey="avgResponse" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : (
            <LineChart data={responseData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey={dataKey}
                tick={<CustomXAxisTick />}
                height={60}
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
                formatter={(value, name) => [
                  `${value.toFixed(2)} hrs`, 
                  name === "avgResponse" ? "Actual" : "Target"
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="avgResponse" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="target" 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: "hsl(var(--muted-foreground))", strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};