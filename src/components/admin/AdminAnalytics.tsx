import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Home,
  TrendingUp,
  TrendingDown,
  CalendarIcon,
  Download,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  totalRevenue: number;
  totalEstimates: number;
  conversionRate: number;
  activeCustomers: number;
  popularHomes: any[];
  revenueByMonth: any[];
  estimatesByStatus: any[];
  homesByManufacturer: any[];
  customersByState: any[];
  servicesPopularity: any[];
  avgEstimateValue: number;
  monthlyGrowth: number;
}

interface DatePreset {
  label: string;
  range: DateRange;
}

export const AdminAnalytics = () => {
  const { toast } = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [selectedPreset, setSelectedPreset] = useState<string>('current-month');

  const datePresets: DatePreset[] = [
    {
      label: 'Last 7 days',
      range: { from: subDays(new Date(), 7), to: new Date() }
    },
    {
      label: 'Last 30 days',
      range: { from: subDays(new Date(), 30), to: new Date() }
    },
    {
      label: 'Current month',
      range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) }
    },
    {
      label: 'Current year',
      range: { from: startOfYear(new Date()), to: endOfYear(new Date()) }
    }
  ];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const fromDate = dateRange.from?.toISOString();
      const toDate = dateRange.to?.toISOString();

      // Fetch estimates data
      const { data: estimates, error: estimatesError } = await supabase
        .from('estimates')
        .select(`
          *,
          mobile_home_id,
          mobile_homes(manufacturer, model, price)
        `)
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      if (estimatesError) throw estimatesError;

      // Fetch mobile homes data
      const { data: mobileHomes, error: homesError } = await supabase
        .from('mobile_homes')
        .select('*');

      if (homesError) throw homesError;

      // Fetch user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      if (profilesError) throw profilesError;

      // Calculate analytics
      const totalRevenue = estimates
        ?.filter(e => e.status === 'approved')
        .reduce((sum, e) => sum + (e.total_amount || 0), 0) || 0;

      const totalEstimates = estimates?.length || 0;
      const approvedEstimates = estimates?.filter(e => e.status === 'approved').length || 0;
      const conversionRate = totalEstimates > 0 ? (approvedEstimates / totalEstimates) * 100 : 0;

      // Revenue by month (last 12 months)
      const revenueByMonth = [];
      for (let i = 11; i >= 0; i--) {
        const monthStart = startOfMonth(subDays(new Date(), i * 30));
        const monthEnd = endOfMonth(subDays(new Date(), i * 30));
        const monthRevenue = estimates
          ?.filter(e => 
            e.status === 'approved' && 
            new Date(e.created_at) >= monthStart && 
            new Date(e.created_at) <= monthEnd
          )
          .reduce((sum, e) => sum + (e.total_amount || 0), 0) || 0;
        
        revenueByMonth.push({
          month: format(monthStart, 'MMM yyyy'),
          revenue: monthRevenue,
          estimates: estimates?.filter(e => 
            new Date(e.created_at) >= monthStart && 
            new Date(e.created_at) <= monthEnd
          ).length || 0
        });
      }

      // Estimates by status
      const statusCounts = estimates?.reduce((acc: any, est) => {
        acc[est.status] = (acc[est.status] || 0) + 1;
        return acc;
      }, {}) || {};

      const estimatesByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count,
        percentage: ((count as number) / totalEstimates * 100).toFixed(1)
      }));

      // Homes by manufacturer
      const manufacturerCounts = mobileHomes?.reduce((acc: any, home) => {
        acc[home.manufacturer] = (acc[home.manufacturer] || 0) + 1;
        return acc;
      }, {}) || {};

      const homesByManufacturer = Object.entries(manufacturerCounts).map(([manufacturer, count]) => ({
        manufacturer,
        count,
        percentage: ((count as number) / (mobileHomes?.length || 1) * 100).toFixed(1)
      }));

      // Popular homes (by estimates)
      const homeCounts = estimates?.reduce((acc: any, est) => {
        if (est.mobile_home_id) {
          acc[est.mobile_home_id] = (acc[est.mobile_home_id] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      const popularHomes = Object.entries(homeCounts)
        .map(([homeId, count]) => {
          const home = mobileHomes?.find(h => h.id === homeId);
          return {
            id: homeId,
            name: home ? `${home.manufacturer} ${home.model}` : 'Unknown',
            price: home?.price || 0,
            estimates: count,
            revenue: estimates
              ?.filter(e => e.mobile_home_id === homeId && e.status === 'approved')
              .reduce((sum, e) => sum + (e.total_amount || 0), 0) || 0
          };
        })
        .sort((a, b) => (b.estimates as number) - (a.estimates as number))
        .slice(0, 10);

      // Services popularity (mock data for now since services are stored as arrays)
      const servicesPopularity = [
        { service: 'Delivery & Setup', count: Math.floor(totalEstimates * 0.8), percentage: '80%' },
        { service: 'Skirting Installation', count: Math.floor(totalEstimates * 0.6), percentage: '60%' },
        { service: 'Electrical Hookup', count: Math.floor(totalEstimates * 0.7), percentage: '70%' },
        { service: 'Plumbing Setup', count: Math.floor(totalEstimates * 0.5), percentage: '50%' },
        { service: 'HVAC Installation', count: Math.floor(totalEstimates * 0.4), percentage: '40%' }
      ];

      const avgEstimateValue = totalEstimates > 0 ? totalRevenue / totalEstimates : 0;
      
      // Calculate monthly growth (simplified)
      const currentMonthRevenue = revenueByMonth[revenueByMonth.length - 1]?.revenue || 0;
      const previousMonthRevenue = revenueByMonth[revenueByMonth.length - 2]?.revenue || 0;
      const monthlyGrowth = previousMonthRevenue > 0 
        ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
        : 0;

      setData({
        totalRevenue,
        totalEstimates,
        conversionRate,
        activeCustomers: profiles?.length || 0,
        popularHomes,
        revenueByMonth,
        estimatesByStatus,
        homesByManufacturer,
        customersByState: [], // Would need address parsing
        servicesPopularity,
        avgEstimateValue,
        monthlyGrowth
      });

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const presetData = datePresets.find(p => p.label.toLowerCase().replace(/\s+/g, '-') === preset);
    if (presetData) {
      setDateRange(presetData.range);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with date picker */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your mobile home business
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-7-days">Last 7 days</SelectItem>
              <SelectItem value="last-30-days">Last 30 days</SelectItem>
              <SelectItem value="current-month">Current month</SelectItem>
              <SelectItem value="current-year">Current year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={fetchAnalyticsData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.totalRevenue.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {data.monthlyGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              {Math.abs(data.monthlyGrowth).toFixed(1)}% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Estimates</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalEstimates}</div>
            <p className="text-xs text-muted-foreground">
              Avg value: ${data.avgEstimateValue.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Estimates to sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeCustomers}</div>
            <p className="text-xs text-muted-foreground">
              New in period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Trends</TabsTrigger>
          <TabsTrigger value="estimates">Estimates Analysis</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Performance</TabsTrigger>
          <TabsTrigger value="services">Services & Options</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="estimates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Estimates by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.estimatesByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, percentage }) => `${status} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.estimatesByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Estimates</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="estimates" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Popular Mobile Homes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.popularHomes.slice(0, 5).map((home, index) => (
                    <div key={home.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{home.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ${home.price.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">{home.estimates} estimates</Badge>
                        <p className="text-sm text-muted-foreground">
                          ${home.revenue.toLocaleString()} revenue
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory by Manufacturer</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.homesByManufacturer} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="manufacturer" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Popular Services & Add-ons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.servicesPopularity.map((service, index) => (
                  <div key={service.service} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{service.service}</span>
                      <span className="text-sm text-muted-foreground">
                        {service.count} selections ({service.percentage})
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: service.percentage }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};