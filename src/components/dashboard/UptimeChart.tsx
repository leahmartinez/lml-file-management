import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, BarChart, Bar } from "recharts";
import { useMemo } from "react";

/**
 * Custom Y-axis tick renderer to prevent label overlap
 * Shows only integer values from 98 to 100
 */
const CustomYAxisTick = ({ x, y, payload }) => {
  // Only show integer ticks (98, 99, 100) to prevent overlap
  if (Number.isInteger(payload.value)) {
    return (
      <text
        x={x}
        y={y}
        textAnchor="end"
        dominantBaseline="middle"
        className="text-muted-foreground text-xs"
      >
        {`${payload.value}%`}
      </text>
    );
  }
  return null;
};

export const UptimeChart = ({ data }) => {
  // Count unique buildings
  const uniqueBuildings = useMemo(() => {
    const buildings = new Set(data.map(asset => asset.building).filter(Boolean));
    return buildings.size;
  }, [data]);

  const uptimeData = useMemo(() => {
    // If only one building, show by asset type instead
    if (uniqueBuildings === 1) {
      const typeData = data.reduce((acc, asset) => {
        if (!asset.type || !asset.uptime) return acc;
        const type = asset.type;
        const existing = acc.find(t => t.type === type);
        if (existing) {
          existing.count += 1;
          existing.totalUptime += parseFloat(asset.uptime);
          existing.uptime = existing.totalUptime / existing.count;
        } else {
          acc.push({ 
            type, 
            uptime: parseFloat(asset.uptime),
            totalUptime: parseFloat(asset.uptime),
            count: 1
          });
        }
        return acc;
      }, []);
      return typeData;
    }

    // Multiple buildings: show by building
    return data.reduce((acc, asset) => {
      if (!asset.building || !asset.uptime) return acc;
      const building = acc.find(b => b.building === asset.building);
      if (building) {
        building.count += 1;
        building.totalUptime += parseFloat(asset.uptime);
        building.uptime = building.totalUptime / building.count;
      } else {
        acc.push({ 
          building: asset.building, 
          uptime: parseFloat(asset.uptime),
          totalUptime: parseFloat(asset.uptime),
          count: 1
        });
      }
      return acc;
    }, []);
  }, [data, uniqueBuildings]);

  const isSingleSite = uniqueBuildings === 1;
  const dataKey = isSingleSite ? "type" : "building";
  const title = isSingleSite ? "Uptime by Asset Type" : "System Uptime Trend";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          {isSingleSite ? (
            <BarChart data={uptimeData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey={dataKey} 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                domain={[98, 100]}
                tick={<CustomYAxisTick />}
                width={35}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
                formatter={(value) => [`${value.toFixed(2)}%`, "Uptime"]}
              />
              <Bar
                dataKey="uptime"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : (
            <AreaChart data={uptimeData}>
              <defs>
                <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey={dataKey} 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                domain={[98, 100]}
                tick={<CustomYAxisTick />}
                width={35}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
                formatter={(value) => [`${value.toFixed(2)}%`, "Uptime"]}
              />
              <Area
                type="monotone"
                dataKey="uptime"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#uptimeGradient)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};