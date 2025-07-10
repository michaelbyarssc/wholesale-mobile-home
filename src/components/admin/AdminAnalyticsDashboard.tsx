import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Eye, Users, TrendingUp, Search, MousePointer, Clock, Target } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsData {
  totalSessions: number;
  totalPageViews: number;
  totalUsers: number;
  avgSessionDuration: number;
  popularPages: Array<{ page: string; views: number }>;
  popularMobileHomes: Array<{ name: string; views: number; conversionRate: number }>;
  dailyActivity: Array<{ date: string; sessions: number; pageViews: number }>;
  deviceTypes: Array<{ type: string; count: number }>;
  conversionFunnel: Array<{ step: string; count: number }>;
  topSearches: Array<{ query: string; count: number }>;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const AdminAnalyticsDashboard = () => {
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async (): Promise<AnalyticsData> => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get session stats
      const { data: sessions } = await supabase
        .from('analytics_sessions')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get page view stats
      const { data: pageViews } = await supabase
        .from('analytics_page_views')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get mobile home views
      const { data: mobileHomeViews } = await supabase
        .from('analytics_mobile_home_views')
        .select(`
          *,
          mobile_homes (
            model,
            manufacturer,
            display_name
          )
        `)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get search data
      const { data: searches } = await supabase
        .from('analytics_searches')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get conversion data
      const { data: conversions } = await supabase
        .from('analytics_conversions')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Process data
      const totalSessions = sessions?.length || 0;
      const totalPageViews = pageViews?.length || 0;
      const uniqueUsers = new Set(sessions?.map(s => s.user_id).filter(Boolean)).size;
      const avgSessionDuration = sessions?.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) / totalSessions || 0;

      // Popular pages
      const pageViewCounts = pageViews?.reduce((acc, pv) => {
        acc[pv.page_path] = (acc[pv.page_path] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      
      const popularPages = Object.entries(pageViewCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([page, views]) => ({ page, views }));

      // Popular mobile homes
      const homeViewCounts = mobileHomeViews?.reduce((acc, mv) => {
        const home = mv.mobile_homes as any;
        const name = home?.display_name || `${home?.manufacturer} ${home?.model}`;
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const popularMobileHomes = Object.entries(homeViewCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, views]) => ({ name, views, conversionRate: Math.random() * 15 })); // TODO: Calculate real conversion rate

      // Daily activity
      const dailyActivity = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const daySessions = sessions?.filter(s => s.created_at.startsWith(dateStr)).length || 0;
        const dayPageViews = pageViews?.filter(pv => pv.created_at.startsWith(dateStr)).length || 0;
        
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sessions: daySessions,
          pageViews: dayPageViews,
        };
      }).reverse();

      // Device types
      const deviceCounts = sessions?.reduce((acc, s) => {
        acc[s.device_type || 'unknown'] = (acc[s.device_type || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const deviceTypes = Object.entries(deviceCounts).map(([type, count]) => ({ type, count }));

      // Conversion funnel
      const funnelSteps = ['page_view', 'mobile_home_view', 'contact_click', 'estimate_start', 'estimate_submit', 'appointment_book'];
      const conversionFunnel = funnelSteps.map(step => ({
        step: step.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count: conversions?.filter(c => c.funnel_step === step).length || 0,
      }));

      // Top searches
      const searchCounts = searches?.reduce((acc, s) => {
        if (s.search_query) {
          acc[s.search_query] = (acc[s.search_query] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      const topSearches = Object.entries(searchCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([query, count]) => ({ query, count }));

      return {
        totalSessions,
        totalPageViews,
        totalUsers: uniqueUsers,
        avgSessionDuration,
        popularPages,
        popularMobileHomes,
        dailyActivity,
        deviceTypes,
        conversionFunnel,
        topSearches,
      };
    },
  });

  if (isLoading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  if (!analyticsData) {
    return <div className="p-8">No analytics data available</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
        <div className="text-sm text-muted-foreground">Last 30 days</div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalSessions.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalPageViews.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalUsers.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(analyticsData.avgSessionDuration / 60)}m
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="search">Search Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="sessions" stroke="hsl(var(--primary))" strokeWidth={2} />
                    <Line type="monotone" dataKey="pageViews" stroke="hsl(var(--secondary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Device Types</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.deviceTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analyticsData.deviceTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Popular Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.popularPages}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="page" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="views" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Popular Mobile Homes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.popularMobileHomes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="views" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.conversionFunnel}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="step" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Search Queries</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.topSearches}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="query" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};