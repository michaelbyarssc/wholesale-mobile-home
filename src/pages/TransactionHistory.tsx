import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Download, Eye, FileText, Receipt, Truck, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface UnifiedRecord {
  id: string;
  type: 'estimate' | 'invoice' | 'delivery' | 'transaction' | 'payment';
  number: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  status: string;
  created_at: string;
  mobile_home?: {
    manufacturer: string;
    model: string;
    series: string;
  };
  delivery_address?: string;
  balance_due?: number;
  paid_amount?: number;
}

const typeIcons = {
  estimate: FileText,
  invoice: Receipt,
  delivery: Truck,
  transaction: DollarSign,
  payment: DollarSign,
};

const typeColors = {
  estimate: 'bg-blue-100 text-blue-800',
  invoice: 'bg-purple-100 text-purple-800',
  delivery: 'bg-orange-100 text-orange-800',
  transaction: 'bg-green-100 text-green-800',
  payment: 'bg-emerald-100 text-emerald-800',
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-orange-100 text-orange-800',
  in_transit: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
  draft: 'bg-gray-100 text-gray-800',
  estimate_submitted: 'bg-blue-100 text-blue-800',
  invoice_generated: 'bg-purple-100 text-purple-800',
  payment_complete: 'bg-green-100 text-green-800',
  delivery_scheduled: 'bg-orange-100 text-orange-800',
  delivery_complete: 'bg-green-100 text-green-800',
};

export default function TransactionHistory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const { toast } = useToast();

  // Fetch all user transaction data
  const { data: allRecords = [], isLoading, error } = useQuery({
    queryKey: ['transaction-history', searchQuery, selectedType, selectedStatus, sortBy],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if user is admin or super admin
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isAdmin = userRoles?.some(r => r.role === 'admin');
      const isSuperAdmin = userRoles?.some(r => r.role === 'super_admin');

      // Set user roles state
      setUserRoles(userRoles?.map(r => r.role) || []);

      const records: UnifiedRecord[] = [];

      // Fetch estimates
      let estimatesQuery = supabase
        .from('estimates')
        .select(`
          id,
          customer_name,
          customer_email,
          total_amount,
          status,
          created_at,
          delivery_address,
          mobile_homes (
            manufacturer,
            model,
            series
          )
        `);

      if (!isSuperAdmin) {
        if (isAdmin) {
          // Admins see their own estimates and those of users they created
          estimatesQuery = estimatesQuery.or(`user_id.eq.${user.id},created_by.eq.${user.id}`);
        } else {
          // Regular users see only their own estimates
          estimatesQuery = estimatesQuery.eq('user_id', user.id);
        }
      }

      const { data: estimates } = await estimatesQuery;

      if (estimates) {
        records.push(...estimates.map(est => ({
          id: est.id,
          type: 'estimate' as const,
          number: `EST-${est.id.slice(-8)}`,
          customer_name: est.customer_name,
          customer_email: est.customer_email,
          amount: est.total_amount,
          status: est.status,
          created_at: est.created_at,
          mobile_home: est.mobile_homes,
          delivery_address: est.delivery_address,
        })));
      }

      // Fetch invoices
      let invoicesQuery = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          customer_name,
          customer_email,
          total_amount,
          status,
          created_at,
          delivery_address,
          balance_due,
          mobile_homes (
            manufacturer,
            model,
            series
          )
        `);

      if (!isSuperAdmin) {
        if (isAdmin) {
          // Admins see their own invoices and those of users they created
          invoicesQuery = invoicesQuery.or(`user_id.eq.${user.id},created_by.eq.${user.id}`);
        } else {
          // Regular users see only their own invoices
          invoicesQuery = invoicesQuery.eq('user_id', user.id);
        }
      }

      const { data: invoices } = await invoicesQuery;

      if (invoices) {
        records.push(...invoices.map(inv => ({
          id: inv.id,
          type: 'invoice' as const,
          number: inv.invoice_number,
          customer_name: inv.customer_name,
          customer_email: inv.customer_email,
          amount: inv.total_amount,
          status: inv.status,
          created_at: inv.created_at,
          mobile_home: inv.mobile_homes,
          delivery_address: inv.delivery_address,
          balance_due: inv.balance_due,
        })));
      }

      // Fetch deliveries
      let deliveriesQuery = supabase
        .from('deliveries')
        .select(`
          id,
          delivery_number,
          customer_name,
          customer_email,
          total_delivery_cost,
          status,
          created_at,
          delivery_address,
          mobile_homes (
            manufacturer,
            model,
            series
          )
        `);

      if (!isSuperAdmin) {
        if (isAdmin) {
          // Admins see deliveries they created or are assigned to
          deliveriesQuery = deliveriesQuery.or(`created_by.eq.${user.id}`);
        } else {
          // Regular users see deliveries where they are the customer
          deliveriesQuery = deliveriesQuery.eq('customer_email', user.email);
        }
      }

      const { data: deliveries } = await deliveriesQuery;

      if (deliveries) {
        records.push(...deliveries.map(del => ({
          id: del.id,
          type: 'delivery' as const,
          number: del.delivery_number,
          customer_name: del.customer_name,
          customer_email: del.customer_email,
          amount: del.total_delivery_cost || 0,
          status: del.status,
          created_at: del.created_at,
          mobile_home: del.mobile_homes,
          delivery_address: del.delivery_address,
        })));
      }

      // Fetch transactions
      let transactionsQuery = supabase
        .from('transactions')
        .select(`
          id,
          transaction_number,
          customer_name,
          customer_email,
          total_amount,
          status,
          created_at,
          delivery_address,
          balance_due,
          paid_amount,
          mobile_homes (
            manufacturer,
            model,
            series
          )
        `);

      if (!isSuperAdmin) {
        if (isAdmin) {
          // Admins see transactions they created or are assigned to
          transactionsQuery = transactionsQuery.or(`user_id.eq.${user.id},assigned_admin_id.eq.${user.id},created_by.eq.${user.id}`);
        } else {
          // Regular users see only their own transactions
          transactionsQuery = transactionsQuery.eq('user_id', user.id);
        }
      }

      const { data: transactions } = await transactionsQuery;

      if (transactions) {
        records.push(...transactions.map(trans => ({
          id: trans.id,
          type: 'transaction' as const,
          number: trans.transaction_number,
          customer_name: trans.customer_name,
          customer_email: trans.customer_email,
          amount: trans.total_amount,
          status: trans.status,
          created_at: trans.created_at,
          mobile_home: trans.mobile_homes,
          delivery_address: trans.delivery_address,
          balance_due: trans.balance_due,
          paid_amount: trans.paid_amount,
        })));
      }

      // Fetch payments
      let paymentsQuery = supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_method,
          payment_date,
          created_at,
          invoices (
            customer_name,
            customer_email,
            invoice_number
          )
        `);

      if (!isSuperAdmin && !isAdmin) {
        // Regular users see payments for their invoices
        paymentsQuery = paymentsQuery.eq('invoices.user_id', user.id);
      }

      const { data: payments } = await paymentsQuery;

      if (payments) {
        records.push(...payments.map(pay => ({
          id: pay.id,
          type: 'payment' as const,
          number: `PAY-${pay.id.slice(-8)}`,
          customer_name: pay.invoices?.customer_name || 'Unknown',
          customer_email: pay.invoices?.customer_email || 'Unknown',
          amount: pay.amount,
          status: 'paid',
          created_at: pay.created_at,
        })));
      }

      // Filter records based on search and filters
      let filteredRecords = records;

      if (searchQuery) {
        filteredRecords = filteredRecords.filter(record =>
          record.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          record.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          record.number.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      if (selectedType !== 'all') {
        filteredRecords = filteredRecords.filter(record => record.type === selectedType);
      }

      if (selectedStatus !== 'all') {
        filteredRecords = filteredRecords.filter(record => record.status === selectedStatus);
      }

      // Sort records based on sortBy selection
      if (sortBy === 'user') {
        filteredRecords.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
      } else {
        // Default sort by created_at desc
        filteredRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }

      return filteredRecords;
    },
  });

  const filteredRecords = allRecords.filter(record => {
    if (activeTab === 'all') return true;
    return record.type === activeTab;
  });

  const exportRecords = () => {
    const csvData = filteredRecords.map(record => ({
      'Type': record.type,
      'Number': record.number,
      'Customer': record.customer_name,
      'Email': record.customer_email,
      'Amount': record.amount,
      'Status': record.status,
      'Date': format(new Date(record.created_at), 'yyyy-MM-dd'),
    }));

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transaction-history.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    toast({
      title: "Error",
      description: "Failed to load transaction history",
      variant: "destructive",
    });
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
          <p className="text-gray-600">View all your estimates, invoices, deliveries, transactions, and payments</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportRecords}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by customer name, email, or number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="estimate">Estimates</SelectItem>
            <SelectItem value="invoice">Invoices</SelectItem>
            <SelectItem value="delivery">Deliveries</SelectItem>
            <SelectItem value="transaction">Transactions</SelectItem>
            <SelectItem value="payment">Payments</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {(userRoles.includes('admin') || userRoles.includes('super_admin')) && (
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="user">Sort by User</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All ({allRecords.length})</TabsTrigger>
          <TabsTrigger value="estimate">Estimates ({allRecords.filter(r => r.type === 'estimate').length})</TabsTrigger>
          <TabsTrigger value="invoice">Invoices ({allRecords.filter(r => r.type === 'invoice').length})</TabsTrigger>
          <TabsTrigger value="delivery">Deliveries ({allRecords.filter(r => r.type === 'delivery').length})</TabsTrigger>
          <TabsTrigger value="transaction">Transactions ({allRecords.filter(r => r.type === 'transaction').length})</TabsTrigger>
          <TabsTrigger value="payment">Payments ({allRecords.filter(r => r.type === 'payment').length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredRecords.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No records found.</p>
              </CardContent>
            </Card>
          ) : (
            filteredRecords.map((record) => {
              const Icon = typeIcons[record.type];
              return (
                <Card key={`${record.type}-${record.id}`} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className="h-5 w-5 text-gray-500" />
                          <h3 className="font-semibold text-lg">{record.number}</h3>
                          <Badge className={typeColors[record.type]}>
                            {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                          </Badge>
                          <Badge className={statusColors[record.status] || 'bg-gray-100 text-gray-800'}>
                            {record.status.replace('_', ' ').charAt(0).toUpperCase() + record.status.slice(1).replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-600">
                          <div>
                            <strong>Customer:</strong> {record.customer_name}
                          </div>
                          <div>
                            <strong>Email:</strong> {record.customer_email}
                          </div>
                          <div>
                            <strong>Amount:</strong> {formatCurrency(record.amount)}
                          </div>
                          {record.balance_due !== undefined && (
                            <div>
                              <strong>Balance Due:</strong> {formatCurrency(record.balance_due)}
                            </div>
                          )}
                          {record.paid_amount !== undefined && (
                            <div>
                              <strong>Paid Amount:</strong> {formatCurrency(record.paid_amount)}
                            </div>
                          )}
                          <div>
                            <strong>Date:</strong> {format(new Date(record.created_at), 'MMM dd, yyyy')}
                          </div>
                          {record.mobile_home && (
                            <div>
                              <strong>Mobile Home:</strong> {record.mobile_home.manufacturer} {record.mobile_home.model}
                            </div>
                          )}
                          {record.delivery_address && (
                            <div>
                              <strong>Delivery Address:</strong> {record.delivery_address}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}