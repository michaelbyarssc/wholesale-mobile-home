import { useState } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useTransactionRealtime } from '@/hooks/useTransactionRealtime';
import { TransactionFilters, TransactionStatus } from '@/types/transaction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDateRangePicker } from '@/components/ui/calendar-date-range-picker';
import { Search, Filter, Plus, Download, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Link } from 'react-router-dom';

const statusColors: Record<TransactionStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  estimate_submitted: 'bg-blue-100 text-blue-800',
  estimate_approved: 'bg-green-100 text-green-800',
  invoice_generated: 'bg-purple-100 text-purple-800',
  payment_partial: 'bg-yellow-100 text-yellow-800',
  payment_complete: 'bg-green-100 text-green-800',
  delivery_scheduled: 'bg-orange-100 text-orange-800',
  delivery_in_progress: 'bg-orange-100 text-orange-800',
  delivery_complete: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  expired: 'bg-red-100 text-red-800',
};

const statusLabels: Record<TransactionStatus, string> = {
  draft: 'Draft',
  estimate_submitted: 'Estimate Submitted',
  estimate_approved: 'Estimate Approved',
  invoice_generated: 'Invoice Generated',
  payment_partial: 'Partial Payment',
  payment_complete: 'Payment Complete',
  delivery_scheduled: 'Delivery Scheduled',
  delivery_in_progress: 'Delivery In Progress',
  delivery_complete: 'Delivery Complete',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export default function TransactionHistory() {
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { transactions, isLoading, createTransaction } = useTransactions(filters);
  
  // Enable real-time updates for the transaction list
  useTransactionRealtime();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters(prev => ({ ...prev, searchQuery: query }));
  };

  const handleStatusFilter = (status: TransactionStatus | 'all') => {
    if (status === 'all') {
      setFilters(prev => ({ ...prev, status: undefined }));
    } else {
      setFilters(prev => ({ ...prev, status: [status] }));
    }
  };

  const exportTransactions = () => {
    // Create CSV export
    const csvData = transactions.map(t => ({
      'Transaction #': t.transaction_number,
      'Customer': t.customer_name,
      'Email': t.customer_email,
      'Status': statusLabels[t.status],
      'Total Amount': t.total_amount,
      'Balance Due': t.balance_due,
      'Created': new Date(t.created_at).toLocaleDateString(),
    }));
    
    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

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
          <p className="text-gray-600">Manage and track all your transactions</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button
            variant="outline"
            onClick={exportTransactions}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button asChild className="flex items-center gap-2">
            <Link to="/create-transaction">
              <Plus className="h-4 w-4" />
              New Transaction
            </Link>
          </Button>
        </div>
      </div>

      {/* Search and Quick Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select onValueChange={(value) => handleStatusFilter(value as TransactionStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="estimate_submitted">Pending Estimates</SelectItem>
            <SelectItem value="invoice_generated">Active Invoices</SelectItem>
            <SelectItem value="payment_partial">Partial Payments</SelectItem>
            <SelectItem value="delivery_scheduled">Scheduled Deliveries</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date Range</label>
                <CalendarDateRangePicker
                  onDateRangeChange={(range) => {
                    setFilters(prev => ({ ...prev, dateRange: range }));
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Min Amount</label>
                <Input
                  type="number"
                  placeholder="0"
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    minAmount: e.target.value ? Number(e.target.value) : undefined 
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Amount</label>
                <Input
                  type="number"
                  placeholder="999999"
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    maxAmount: e.target.value ? Number(e.target.value) : undefined 
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction List */}
      <div className="grid gap-4">
        {transactions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No transactions found.</p>
              <Button asChild className="mt-4">
                <Link to="/create-transaction">Create your first transaction</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          transactions.map((transaction) => (
            <Card key={transaction.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{transaction.transaction_number}</h3>
                      <Badge className={statusColors[transaction.status]}>
                        {statusLabels[transaction.status]}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <strong>Customer:</strong> {transaction.customer_name}
                      </div>
                      <div>
                        <strong>Email:</strong> {transaction.customer_email}
                      </div>
                      <div>
                        <strong>Total:</strong> {formatCurrency(transaction.total_amount)}
                      </div>
                      <div>
                        <strong>Balance:</strong> {formatCurrency(transaction.balance_due)}
                      </div>
                      <div>
                        <strong>Created:</strong> {new Date(transaction.created_at).toLocaleDateString()}
                      </div>
                      {transaction.mobile_home && (
                        <div>
                          <strong>Mobile Home:</strong> {transaction.mobile_home.manufacturer} {transaction.mobile_home.model}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/transaction/${transaction.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Load More Button (if needed for infinite scroll) */}
      {transactions.length >= 20 && (
        <div className="text-center">
          <Button variant="outline">Load More</Button>
        </div>
      )}
    </div>
  );
}