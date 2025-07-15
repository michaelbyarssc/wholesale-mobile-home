import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Users, 
  Target,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface TransactionAnalyticsProps {
  data: any;
  dateRange: number;
  onDateRangeChange: (days: number) => void;
}

interface MetricCard {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
}

export function TransactionAnalytics({ data, dateRange, onDateRangeChange }: TransactionAnalyticsProps) {
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  const metrics: MetricCard[] = [
    {
      title: 'Total Revenue',
      value: formatCurrency(data?.total_revenue || 0),
      change: 12.5,
      icon: <DollarSign className="h-5 w-5" />,
      color: 'text-green-600'
    },
    {
      title: 'Conversion Rate',
      value: '68%',
      change: 5.2,
      icon: <Target className="h-5 w-5" />,
      color: 'text-blue-600'
    },
    {
      title: 'Avg Deal Size',
      value: formatCurrency(data?.avg_transaction_value || 0),
      change: 8.1,
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'text-purple-600'
    },
    {
      title: 'Time to Close',
      value: '12.3 days',
      change: -3.2,
      icon: <Clock className="h-5 w-5" />,
      color: 'text-yellow-600'
    }
  ];

  const getStatusDistribution = () => {
    const statusCounts = data?.status_counts || {};
    const entries = Object.entries(statusCounts);
    const total = entries.reduce((sum: number, [, count]) => sum + (Number(count) || 0), 0);
    
    return entries.map(([status, count]) => {
      const numericCount = Number(count) || 0;
      return {
        status,
        count: numericCount,
        percentage: total > 0 ? (numericCount / total * 100) : 0
      };
    });
  };

  const getTopBottlenecks = () => [
    { stage: 'Estimate Approval', avgTime: '3.2 days', count: 8 },
    { stage: 'Payment Processing', avgTime: '5.1 days', count: 12 },
    { stage: 'Delivery Scheduling', avgTime: '2.8 days', count: 6 }
  ];

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Transaction Analytics</h2>
        <Select value={dateRange.toString()} onValueChange={(value) => onDateRangeChange(Number(value))}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.title} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-full bg-gray-100 ${metric.color}`}>
                    {metric.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                    <p className="text-xl font-bold">{metric.value}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`flex items-center gap-1 ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <TrendingUp className={`h-4 w-4 ${metric.change < 0 ? 'rotate-180' : ''}`} />
                    <span className="text-sm font-medium">{Math.abs(metric.change)}%</span>
                  </div>
                  <p className="text-xs text-gray-500">vs last period</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Pipeline Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getStatusDistribution().map((item) => (
                  <div key={item.status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-blue-500 rounded-full" />
                      <span className="font-medium capitalize">{item.status.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{item.count} transactions</p>
                        <p className="text-xs text-gray-500">{item.percentage.toFixed(1)}% of total</p>
                      </div>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Completed Transactions</span>
                    <span className="font-medium">{formatCurrency(data?.total_revenue || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending Payments</span>
                    <span className="font-medium">{formatCurrency(data?.pending_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Total Pipeline</span>
                    <span className="font-bold">{formatCurrency((data?.total_revenue || 0) + (data?.pending_amount || 0))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transaction Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Transactions</span>
                    <span className="font-medium">{data?.transaction_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg per Day</span>
                    <span className="font-medium">{((data?.transaction_count || 0) / dateRange).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Success Rate</span>
                    <span className="font-medium">87%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bottlenecks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                Process Bottlenecks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getTopBottlenecks().map((bottleneck, index) => (
                  <div key={bottleneck.stage} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-yellow-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{bottleneck.stage}</p>
                        <p className="text-sm text-gray-600">{bottleneck.count} transactions affected</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{bottleneck.avgTime}</p>
                      <p className="text-sm text-gray-600">avg time</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Advanced trend analysis coming soon</p>
                <p className="text-sm text-gray-400">This will include revenue trends, seasonal patterns, and predictive analytics</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}