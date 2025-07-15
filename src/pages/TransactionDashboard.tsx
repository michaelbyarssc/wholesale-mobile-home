import { useState } from 'react';
import { useTransactionDashboard } from '@/hooks/useTransactionDashboard';
import { useTransactionRealtime } from '@/hooks/useTransactionRealtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TransactionNotifications } from '@/components/TransactionNotifications';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Users,
  Calendar,
  Activity,
  BarChart3
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Link } from 'react-router-dom';

export default function TransactionDashboard() {
  const [dateRange, setDateRange] = useState<number>(30);
  const { data: dashboardData, isLoading } = useTransactionDashboard(dateRange);
  
  // Enable real-time updates for dashboard
  useTransactionRealtime();

  // Mock notifications for demonstration
  const mockNotifications = [
    {
      id: '1',
      type: 'warning' as const,
      title: 'Payment Overdue',
      message: 'Transaction WMH-001234 has an overdue payment of $5,250',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      read: false,
      transactionNumber: 'WMH-001234',
      actionRequired: true
    },
    {
      id: '2',
      type: 'success' as const,
      title: 'Payment Received',
      message: 'Full payment received for transaction WMH-001235',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: false,
      transactionNumber: 'WMH-001235',
      actionRequired: false
    },
    {
      id: '3',
      type: 'info' as const,
      title: 'New Estimate Submitted',
      message: 'Customer John Doe submitted a new estimate request',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      read: true,
      transactionNumber: 'WMH-001236',
      actionRequired: true
    }
  ];

  const handleMarkAsRead = (notificationId: string) => {
    console.log('Mark as read:', notificationId);
  };

  const handleMarkAllAsRead = () => {
    console.log('Mark all as read');
  };

  const handleDismiss = (notificationId: string) => {
    console.log('Dismiss:', notificationId);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const statusCounts = dashboardData?.status_counts || {};
  const totalRevenue = dashboardData?.total_revenue || 0;
  const pendingAmount = dashboardData?.pending_amount || 0;
  const avgTransactionValue = dashboardData?.avg_transaction_value || 0;
  const transactionCount = dashboardData?.transaction_count || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transaction Dashboard</h1>
          <p className="text-gray-600">Monitor and manage all your transactions</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={dateRange.toString()} onValueChange={(value) => setDateRange(Number(value))}>
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
          <Button asChild>
            <Link to="/create-transaction">
              <FileText className="h-4 w-4 mr-2" />
              New Transaction
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-green-600">+12.5%</span>
              <span className="text-gray-500 ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(pendingAmount)}</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
              <span className="text-red-600">-3.2%</span>
              <span className="text-gray-500 ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Transaction</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(avgTransactionValue)}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-green-600">+8.1%</span>
              <span className="text-gray-500 ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{transactionCount}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-green-600">+24.3%</span>
              <span className="text-gray-500 ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {(statusCounts as any)?.estimate_submitted || 0}
                      </div>
                      <div className="text-sm text-gray-600">Pending Estimates</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {(statusCounts as any)?.invoice_generated || 0}
                      </div>
                      <div className="text-sm text-gray-600">Active Invoices</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {(statusCounts as any)?.payment_partial || 0}
                      </div>
                      <div className="text-sm text-gray-600">Partial Payments</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {(statusCounts as any)?.completed || 0}
                      </div>
                      <div className="text-sm text-gray-600">Completed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Payment received for WMH-001234</p>
                        <p className="text-xs text-gray-500">2 hours ago</p>
                      </div>
                      <Badge variant="outline">Payment</Badge>
                    </div>
                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">New estimate submitted by John Doe</p>
                        <p className="text-xs text-gray-500">4 hours ago</p>
                      </div>
                      <Badge variant="outline">Estimate</Badge>
                    </div>
                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Invoice WMH-001235 is due in 2 days</p>
                        <p className="text-xs text-gray-500">6 hours ago</p>
                      </div>
                      <Badge variant="outline">Due Date</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pipeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Pipeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                        <span className="font-medium">Estimates</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          {(statusCounts as any)?.estimate_submitted || 0} pending
                        </span>
                        <Badge variant="outline">
                          ${(((statusCounts as any)?.estimate_submitted || 0) * avgTransactionValue).toFixed(0)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 bg-purple-500 rounded-full"></div>
                        <span className="font-medium">Invoices</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          {(statusCounts as any)?.invoice_generated || 0} active
                        </span>
                        <Badge variant="outline">
                          ${(((statusCounts as any)?.invoice_generated || 0) * avgTransactionValue).toFixed(0)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
                        <span className="font-medium">Payments</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          {(statusCounts as any)?.payment_partial || 0} partial
                        </span>
                        <Badge variant="outline">
                          ${(((statusCounts as any)?.payment_partial || 0) * avgTransactionValue * 0.5).toFixed(0)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Analytics charts coming soon...</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <TransactionNotifications
            notifications={mockNotifications}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onDismiss={handleDismiss}
          />
        </div>
      </div>
    </div>
  );
}