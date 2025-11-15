import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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

export const AssetStatusChartComponent = ({ data }) => {
  // Count unique buildings
  const uniqueBuildings = useMemo(() => {
    const buildings = new Set(data.map(asset => asset.building).filter(Boolean));
    return buildings.size;
  }, [data]);

  const chartData = useMemo(() => {
    // If only one building, show by asset type instead
    if (uniqueBuildings === 1) {
      const typeData = data.reduce((acc, asset) => {
        if (!asset.type) return acc;
        const type = asset.type;
        const existing = acc.find(t => t.type === type);
        if (existing) {
          const status = asset.status?.toLowerCase() || 'unknown';
          if (status === 'active' || status === 'operational' || status === 'warranty active') {
            existing.active += 1;
          } else if (status === 'maintenance') {
            existing.maintenance += 1;
          } else if (status === 'offline') {
            existing.offline += 1;
          }
        } else {
          const status = asset.status?.toLowerCase() || 'unknown';
          acc.push({
            type,
            active: status === 'active' || status === 'operational' || status === 'warranty active' ? 1 : 0,
            maintenance: status === 'maintenance' ? 1 : 0,
            offline: status === 'offline' ? 1 : 0,
          });
        }
        return acc;
      }, []);
      return typeData;
    }

    // Multiple buildings: show by building
    return data.reduce((acc, asset) => {
      if (!asset.building) return acc;
      const building = acc.find(b => b.building === asset.building);
      if (building) {
        const status = asset.status?.toLowerCase() || 'unknown';
        if (status === 'active' || status === 'operational' || status === 'warranty active') {
          building.active += 1;
        } else if (status === 'maintenance') {
          building.maintenance += 1;
        } else if (status === 'offline') {
          building.offline += 1;
        }
      } else {
        const status = asset.status?.toLowerCase() || 'unknown';
        acc.push({
          building: asset.building,
          active: status === 'active' || status === 'operational' || status === 'warranty active' ? 1 : 0,
          maintenance: status === 'maintenance' ? 1 : 0,
          offline: status === 'offline' ? 1 : 0,
        });
      }
      return acc;
    }, []);
  }, [data, uniqueBuildings]);

  const isSingleSite = uniqueBuildings === 1;
  const dataKey = isSingleSite ? "type" : "building";
  const title = isSingleSite ? "Asset Status by Type" : "Asset Status by Building";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
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
            />
            <Bar dataKey="active" stackId="a" fill="hsl(var(--accent))" radius={[0, 0, 0, 0]} />
            <Bar dataKey="maintenance" stackId="a" fill="hsl(var(--warning))" radius={[0, 0, 0, 0]} />
            <Bar dataKey="offline" stackId="a" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};