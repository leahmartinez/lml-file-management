import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { CalendarIcon, Download, FileText, TrendingUp, DollarSign, Clock, Wrench } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useMasterData } from "@/hooks/useMasterData";
import { toast } from "@/hooks/use-toast";

const Reports = () => {
  const masterData = useMasterData();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reportType, setReportType] = useState("maintenance");

  // Filter data by date range if dates are selected
  const filteredData = useMemo(() => {
    if (!startDate && !endDate) return masterData;
    
    return masterData.filter(asset => {
      // Filter by lastService date or serviceTickets dates
      if (asset.lastService) {
        const serviceDate = new Date(asset.lastService);
        if (startDate && serviceDate < startDate) return false;
        if (endDate && serviceDate > endDate) return false;
      }
      
      // Also check service tickets
      if (asset.serviceTickets) {
        const tickets = asset.serviceTickets.split(",").map(t => t.trim()).filter(Boolean);
        const hasTicketInRange = tickets.some(ticket => {
          const ticketDate = new Date(ticket);
          if (startDate && ticketDate < startDate) return false;
          if (endDate && ticketDate > endDate) return false;
          return true;
        });
        if (hasTicketInRange) return true;
      }
      
      return true;
    });
  }, [masterData, startDate, endDate]);

  const reportTypes = [
    { value: "maintenance", label: "Maintenance Reports" },
    { value: "performance", label: "Performance Analytics" },
    { value: "cost", label: "Cost Analysis" },
    { value: "contractor", label: "Contractor Performance" },
  ];

  // Show loading state if data is empty (after all hooks are called)
  if (masterData.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading report data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Export report to CSV
  const handleExportReport = () => {
    try {
      let csvContent = '';
      let filename = '';
      
      switch (reportType) {
        case 'maintenance': {
          const maintenanceData = filteredData.reduce((acc, asset) => {
            if (!asset.serviceTickets) return acc;
            const tickets = asset.serviceTickets.split(",").map(t => t.trim()).filter(Boolean);
            tickets.forEach(ticket => {
              const date = new Date(ticket);
              if (isNaN(date.getTime())) return;
              if (startDate && date < startDate) return;
              if (endDate && date > endDate) return;
              
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
          }, [] as Array<{ month: string; tickets: number }>);
          
          csvContent = 'Month,Service Tickets\n';
          maintenanceData.forEach(item => {
            csvContent += `${item.month},${item.tickets}\n`;
          });
          filename = `maintenance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
        }
        
        case 'performance': {
          csvContent = 'Metric,Value\n';
          const validUptime = filteredData.filter(a => a.uptime && !isNaN(parseFloat(a.uptime)));
          const validMTTR = filteredData.filter(a => a.timeToRepair && !isNaN(parseFloat(a.timeToRepair)));
          const operationalAssets = filteredData.filter(a => 
            a.status === 'Active' || a.status === 'Operational' || a.status === 'Warranty Active'
          );
          
          const avgUptime = validUptime.length > 0 
            ? (validUptime.reduce((acc, asset) => acc + parseFloat(asset.uptime || '0'), 0) / validUptime.length).toFixed(1) + '%'
            : 'N/A';
          
          const avgMTTR = validMTTR.length > 0
            ? (validMTTR.reduce((acc, asset) => acc + parseFloat(asset.timeToRepair || '0'), 0) / validMTTR.length).toFixed(1) + ' hrs'
            : 'N/A';
          
          const completionRate = filteredData.length > 0
            ? ((operationalAssets.length / filteredData.length) * 100).toFixed(1) + '%'
            : 'N/A';
          
          csvContent += `Average Uptime,${avgUptime}\n`;
          csvContent += `Mean Time to Repair,${avgMTTR}\n`;
          csvContent += `Operational Rate,${completionRate}\n`;
          filename = `performance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
        }
        
        case 'cost': {
          const costData = filteredData.reduce((acc, asset) => {
            if (!asset.cost) return acc;
            const cost = parseFloat(asset.cost);
            if (isNaN(cost)) return acc;
            
            const existingCategory = acc.find(c => c.category === asset.type);
            if (existingCategory) {
              existingCategory.amount += cost;
            } else {
              acc.push({ category: asset.type, amount: cost, percentage: 0 });
            }
            return acc;
          }, [] as Array<{ category: string; amount: number; percentage: number }>);
          
          const totalCost = costData.reduce((acc, item) => acc + item.amount, 0);
          costData.forEach(item => item.percentage = Math.round((item.amount / totalCost) * 100));
          
          csvContent = 'Category,Amount,Percentage\n';
          costData.forEach(item => {
            csvContent += `${item.category},${item.amount.toFixed(2)},${item.percentage}%\n`;
          });
          csvContent += `Total,${totalCost.toFixed(2)},\n`;
          filename = `cost_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
        }
        
        case 'contractor': {
          const contractorGroups = filteredData.reduce((acc, asset) => {
            if (!asset.contractor) return acc;
            if (!acc[asset.contractor]) {
              acc[asset.contractor] = [];
            }
            acc[asset.contractor].push(asset);
            return acc;
          }, {} as Record<string, typeof filteredData>);
          
          csvContent = 'Contractor,Response Time (hrs),Completion Rate (%),Total Assets,Operational Assets\n';
          Object.entries(contractorGroups).forEach(([contractor, assets]) => {
            const validResponseTimes = assets
              .filter(a => a.avgResponseTime && !isNaN(parseFloat(a.avgResponseTime)))
              .map(a => parseFloat(a.avgResponseTime || '0'));
            
            const avgResponseTime = validResponseTimes.length > 0
              ? validResponseTimes.reduce((sum, rt) => sum + rt, 0) / validResponseTimes.length
              : 0;
            
            const operationalCount = assets.filter(a => 
              a.status === 'Active' || a.status === 'Operational' || a.status === 'Warranty Active'
            ).length;
            
            const completionRate = assets.length > 0
              ? (operationalCount / assets.length) * 100
              : 0;
            
            csvContent += `${contractor},${avgResponseTime.toFixed(1)},${completionRate.toFixed(1)},${assets.length},${operationalCount}\n`;
          });
          filename = `contractor_performance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
        }
        
        default:
          toast({
            title: "Error",
            description: "Unknown report type",
            variant: "destructive",
          });
          return;
      }
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: `Report exported as ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export report",
        variant: "destructive",
      });
    }
  };

  // Memoize maintenance data calculation to avoid expensive reduce operations on every render
  const maintenanceData = useMemo(() => {
    return filteredData.reduce((acc, asset) => {
      if (!asset.serviceTickets) return acc;
      const tickets = asset.serviceTickets.split(",").map(t => t.trim()).filter(Boolean);
      tickets.forEach(ticket => {
        const date = new Date(ticket);
        if (isNaN(date.getTime())) return; // Skip invalid dates

        // Apply date filter if set
        if (startDate && date < startDate) return;
        if (endDate && date > endDate) return;

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
    }, []).sort((a, b) => {
      // Sort by date
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });
  }, [filteredData, startDate, endDate]);

  const renderMaintenanceReport = () => {

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Activity Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={maintenanceData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Bar dataKey="tickets" name="Service Tickets" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPerformanceReport = () => {
    const validUptime = filteredData.filter(a => a.uptime && !isNaN(parseFloat(a.uptime)));
    const validMTTR = filteredData.filter(a => a.timeToRepair && !isNaN(parseFloat(a.timeToRepair)));
    const operationalAssets = filteredData.filter(a => 
      a.status === 'Active' || a.status === 'Operational' || a.status === 'Warranty Active'
    );
    
    const avgUptime = validUptime.length > 0 
      ? (validUptime.reduce((acc, asset) => acc + parseFloat(asset.uptime || '0'), 0) / validUptime.length).toFixed(1) + '%'
      : 'N/A';
    
    const avgMTTR = validMTTR.length > 0
      ? (validMTTR.reduce((acc, asset) => acc + parseFloat(asset.timeToRepair || '0'), 0) / validMTTR.length).toFixed(1) + ' hrs'
      : 'N/A';
    
    const completionRate = filteredData.length > 0
      ? ((operationalAssets.length / filteredData.length) * 100).toFixed(1) + '%'
      : 'N/A';
    
    const performanceData = [
      {
        metric: "Average Uptime",
        value: avgUptime,
        trend: "+0.3%"
      },
      {
        metric: "Mean Time to Repair",
        value: avgMTTR,
        trend: "-0.4 hrs"
      },
      {
        metric: "Operational Rate",
        value: completionRate,
        trend: "+2.1%"
      },
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {performanceData.map((item, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-sm font-medium">{item.metric}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{item.value}</div>
                <p className="text-sm text-accent">
                  {item.trend} vs last period
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderContractorPerformanceReport = () => {
    // Group assets by contractor
    const contractorGroups = filteredData.reduce((acc, asset) => {
      if (!asset.contractor) return acc;
      if (!acc[asset.contractor]) {
        acc[asset.contractor] = [];
      }
      acc[asset.contractor].push(asset);
      return acc;
    }, {} as Record<string, typeof filteredData>);

    // Calculate metrics for each contractor
    const contractorPerformance = Object.entries(contractorGroups).map(([contractor, assets]) => {
      const validResponseTimes = assets
        .filter(a => a.avgResponseTime && !isNaN(parseFloat(a.avgResponseTime)))
        .map(a => parseFloat(a.avgResponseTime || '0'));
      
      const avgResponseTime = validResponseTimes.length > 0
        ? validResponseTimes.reduce((sum, rt) => sum + rt, 0) / validResponseTimes.length
        : 0;
      
      const operationalCount = assets.filter(a => 
        a.status === 'Active' || a.status === 'Operational' || a.status === 'Warranty Active'
      ).length;
      
      const completionRate = assets.length > 0
        ? (operationalCount / assets.length) * 100
        : 0;
      
      return {
        contractor,
        responseTime: avgResponseTime,
        completionRate,
        totalAssets: assets.length,
        operationalAssets: operationalCount,
      };
    });

    return (
      <Card>
        <CardHeader>
          <CardTitle>Contractor Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contractorPerformance.map((contractor) => (
              <div key={contractor.contractor} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Badge variant="outline">{contractor.contractor}</Badge>
                  <div className="grid grid-cols-4 gap-8 text-sm">
                    <div>
                      <p className="text-muted-foreground">Response Time</p>
                      <p className="font-medium">{contractor.responseTime.toFixed(1)}h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Completion Rate</p>
                      <p className="font-medium">{contractor.completionRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Assets</p>
                      <p className="font-medium">{contractor.totalAssets}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Operational</p>
                      <p className="font-medium">{contractor.operationalAssets}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCostReport = () => {
    const costData = filteredData.reduce((acc, asset) => {
      if (!asset.cost) return acc;
      const cost = parseFloat(asset.cost);
      if (isNaN(cost)) return acc;
      
      const existingCategory = acc.find(c => c.category === asset.type);
      if (existingCategory) {
        existingCategory.amount += cost;
      } else {
        acc.push({ category: asset.type, amount: cost, percentage: 0 });
      }
      return acc;
    }, [] as Array<{ category: string; amount: number; percentage: number }>);

    const totalCost = costData.reduce((acc, item) => acc + item.amount, 0);
    costData.forEach(item => item.percentage = Math.round((item.amount / totalCost) * 100));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="amount"
                  >
                    {costData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value.toLocaleString()}`, "Amount"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {costData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{item.category}</p>
                      <p className="text-sm text-muted-foreground">{item.percentage}% of total</p>
                    </div>
                    <div className="text-lg font-bold text-primary">
                      ${item.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Quarterly Spend:</span>
                  <span className="text-primary">${totalCost.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground">Comprehensive reporting and data analysis</p>
          </div>
        </div>

        {/* Report Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Report Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Button 
                className="gap-2"
                onClick={() => handleExportReport()}
              >
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Content */}
        {reportType === "maintenance" && renderMaintenanceReport()}
        {reportType === "performance" && renderPerformanceReport()}
        {reportType === "cost" && renderCostReport()}
        {reportType === "contractor" && renderContractorPerformanceReport()}
      </div>
    </div>
  );
};

export default Reports;