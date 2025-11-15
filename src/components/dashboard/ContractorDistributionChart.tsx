import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useMemo } from "react";

const contractorColors = {
  TKE: "#FFA500", // Orange
  Schindler: "#FF0000", // Red
  KONE: "#0000FF", // Blue
  Otis: "#000080", // Navy Blue
};

export const ContractorDistributionChart = ({ data }) => {
  // Memoize contractor data calculation to avoid expensive reduce operations on every render
  const contractorData = useMemo(() => {
    return data.reduce((acc, asset) => {
      if (!asset.contractor) return acc;
      const contractor = acc.find(c => c.name === asset.contractor);
      if (contractor) {
        contractor.value += 1;
      } else {
        acc.push({ name: asset.contractor, value: 1, color: contractorColors[asset.contractor] || `hsl(${Math.random() * 360}, 40%, 55%)` });
      }
      return acc;
    }, []);
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Contractor Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart margin={{ top: 0, right: 0, bottom: 40, left: 0 }}>
            <Pie
              data={contractorData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {contractorData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: "12px", marginTop: "20px" }}
              verticalAlign="bottom"
              height={36}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};