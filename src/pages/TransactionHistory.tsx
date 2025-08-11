import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Search, Download, FileText, Receipt, Truck, DollarSign, Calendar, User, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CustomerAvatar } from '@/components/CustomerAvatar';
import { TransactionGroup } from '@/components/TransactionGroup';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SEO } from '@/components/SEO';

interface UnifiedRecord {
  id: string;
  type: 'estimate' | 'invoice' | 'delivery' | 'payment';
  number: string;
  customer_name: string;
  amount: number;
  status: string;
  created_at: string;
  transaction_number?: string;
  customer_email?: string;
  user_id?: string | null;
  assigned_admin_id?: string | null;
  assigned_admin_name?: string | null;
}


interface CustomerGroup {
  customerName: string;
  customerEmail: string;
  records: UnifiedRecord[];
  totalAmount: number;
  recordCount: number;
  avatarUrl?: string;
  color: string;
}

// Type icons mapping
const typeIcons = {
  estimate: FileText,
  invoice: Receipt,
  delivery: Truck,
  payment: DollarSign,
};

// Type color classes
const typeColors = {
  estimate: 'bg-blue-100 text-blue-800',
  invoice: 'bg-purple-100 text-purple-800', 
  delivery: 'bg-orange-100 text-orange-800',
  payment: 'bg-green-100 text-green-800',
};

// Status color classes
const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  scheduled: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  paid: 'bg-green-100 text-green-800',
};

export const TransactionHistory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const { isAdmin, isSuperAdmin, userRoles } = useUserRoles();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleRecordClick = (record: UnifiedRecord) => {
    switch (record.type) {
      case 'estimate':
        navigate(`/estimates/${record.id}`);
        break;
      case 'invoice':
        navigate(`/invoices/${record.id}`);
        break;
      case 'delivery':
        navigate(`/deliveries/${record.id}`);
        break;
      case 'payment':
        navigate(`/payments/${record.id}`);
        break;
      default:
        break;
    }
  };

  // Fetch all user transaction data
  const { data: allRecords = [], isLoading, error } = useQuery({
    queryKey: ['transaction-history', searchQuery, selectedType, selectedStatus, selectedCustomer],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Admin status is handled by useUserRoles hook

      const records: UnifiedRecord[] = [];

      // Fetch estimates
      if (isAdmin || isSuperAdmin) {
        const { data: estimates } = await supabase
          .from('estimates')
          .select('*')
          .order('created_at', { ascending: false });
        estimates?.forEach((estimate: any) => {
          records.push({
            id: estimate.id,
            type: 'estimate',
            number: estimate.transaction_number || estimate.id.substring(0, 8),
            customer_name: estimate.customer_name,
            amount: estimate.total_amount,
            status: estimate.status,
            created_at: estimate.created_at,
            transaction_number: estimate.transaction_number,
            customer_email: estimate.customer_email,
            user_id: estimate.user_id || null,
          });
        });
      } else {
        const { data: estimates } = await supabase
          .from('estimates')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        estimates?.forEach((estimate: any) => {
          records.push({
            id: estimate.id,
            type: 'estimate',
            number: estimate.transaction_number || estimate.id.substring(0, 8),
            customer_name: estimate.customer_name,
            amount: estimate.total_amount,
            status: estimate.status,
            created_at: estimate.created_at,
            transaction_number: estimate.transaction_number,
            customer_email: estimate.customer_email,
            user_id: user.id,
          });
        });
      }

      // Fetch invoices
      if (isAdmin || isSuperAdmin) {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('*')
          .order('created_at', { ascending: false });
        invoices?.forEach((invoice: any) => {
          records.push({
            id: invoice.id,
            type: 'invoice',
            number: invoice.transaction_number || invoice.invoice_number,
            customer_name: invoice.customer_name,
            amount: invoice.total_amount,
            status: invoice.status,
            created_at: invoice.created_at,
            transaction_number: invoice.transaction_number,
            customer_email: invoice.customer_email,
            user_id: invoice.user_id || null,
          });
        });
      } else {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        invoices?.forEach((invoice: any) => {
          records.push({
            id: invoice.id,
            type: 'invoice',
            number: invoice.transaction_number || invoice.invoice_number,
            customer_name: invoice.customer_name,
            amount: invoice.total_amount,
            status: invoice.status,
            created_at: invoice.created_at,
            transaction_number: invoice.transaction_number,
            customer_email: invoice.customer_email,
            user_id: user.id,
          });
        });
      }

      // Fetch deliveries
      if (isAdmin || isSuperAdmin) {
        const { data: deliveries } = await supabase
          .from('deliveries')
          .select(`
            *,
            invoices:invoices!left(id, user_id, customer_name, customer_email)
          `)
          .order('created_at', { ascending: false });
        deliveries?.forEach((delivery: any) => {
          records.push({
            id: delivery.id,
            type: 'delivery',
            number: delivery.transaction_number || delivery.delivery_number,
            customer_name: delivery.customer_name || delivery.invoices?.customer_name,
            amount: delivery.total_delivery_cost || 0,
            status: delivery.status,
            created_at: delivery.created_at,
            transaction_number: delivery.transaction_number,
            customer_email: delivery.customer_email || delivery.invoices?.customer_email,
            user_id: delivery.invoices?.user_id || delivery.user_id || null,
          });
        });
      } else {
        const { data: deliveries } = await supabase
          .from('deliveries')
          .select(`
            *,
            invoices:invoices!inner(user_id, customer_name, customer_email)
          `)
          .eq('invoices.user_id', user.id)
          .order('created_at', { ascending: false });
        deliveries?.forEach((delivery: any) => {
          records.push({
            id: delivery.id,
            type: 'delivery',
            number: delivery.transaction_number || delivery.delivery_number,
            customer_name: delivery.customer_name || delivery.invoices?.customer_name,
            amount: delivery.total_delivery_cost || 0,
            status: delivery.status,
            created_at: delivery.created_at,
            transaction_number: delivery.transaction_number,
            customer_email: delivery.customer_email || delivery.invoices?.customer_email,
            user_id: user.id,
          });
        });
      }

      // Fetch payments
      if (isAdmin || isSuperAdmin) {
        const { data: payments } = await supabase
          .from('payments')
          .select(`
            *,
            invoices!inner(customer_name, customer_email, user_id)
          `)
          .order('created_at', { ascending: false });
        payments?.forEach((payment: any) => {
          records.push({
            id: payment.id,
            type: 'payment',
            number: payment.transaction_number || payment.id.substring(0, 8),
            customer_name: payment.invoices.customer_name,
            amount: payment.amount,
            status: 'completed',
            created_at: payment.created_at,
            transaction_number: payment.transaction_number,
            customer_email: payment.invoices.customer_email,
            user_id: payment.invoices.user_id || null,
          });
        });
      } else {
        const { data: payments } = await supabase
          .from('payments')
          .select(`
            *,
            invoices!inner(customer_name, customer_email, user_id)
          `)
          .eq('invoices.user_id', user.id)
          .order('created_at', { ascending: false });
        payments?.forEach((payment: any) => {
          records.push({
            id: payment.id,
            type: 'payment',
            number: payment.transaction_number || payment.id.substring(0, 8),
            customer_name: payment.invoices.customer_name,
            amount: payment.amount,
            status: 'completed',
            created_at: payment.created_at,
            transaction_number: payment.transaction_number,
            customer_email: payment.invoices.customer_email,
            user_id: user.id,
          });
        });
      }

      // Enrich with profiles to determine assigned admins for grouping
      const userIds = Array.from(new Set(records.map(r => r.user_id).filter(Boolean))) as string[];
      let userProfiles: any[] = [];
      if (userIds.length) {
        const { data: up } = await supabase
          .from('profiles')
          .select('user_id, assigned_admin_id')
          .in('user_id', userIds);
        userProfiles = up || [];
      }
      const adminIds = Array.from(new Set(userProfiles.map(p => p.assigned_admin_id).filter(Boolean))) as string[];
      let adminProfiles: any[] = [];
      if (adminIds.length) {
        const { data: ap } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email')
          .in('user_id', adminIds);
        adminProfiles = ap || [];
      }
      const userProfileMap = new Map(userProfiles.map(p => [p.user_id, p]));
      const adminProfileMap = new Map(adminProfiles.map(p => [p.user_id, p]));

      const annotatedRecords: UnifiedRecord[] = records.map(r => {
        const p = r.user_id ? userProfileMap.get(r.user_id) : null;
        const assignedId = p?.assigned_admin_id || null;
        let adminName: string | null = null;
        if (assignedId) {
          const ap = adminProfileMap.get(assignedId);
          adminName = ap ? ([ap.first_name, ap.last_name].filter(Boolean).join(' ') || ap.email || assignedId) : 'Unassigned';
        } else {
          adminName = 'Unassigned';
        }
        return { ...r, assigned_admin_id: assignedId, assigned_admin_name: adminName };
      });

      // Apply filters
      let filteredRecords = annotatedRecords;

      // Apply type filter
      if (selectedType !== 'all') {
        filteredRecords = filteredRecords.filter(record => record.type === selectedType);
      }

      // Apply search filter
      if (searchQuery) {
        filteredRecords = filteredRecords.filter(record =>
          record.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          record.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          record.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (record.transaction_number && record.transaction_number.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }

      // Apply status filter
      if (selectedStatus !== 'all') {
        filteredRecords = filteredRecords.filter(record => record.status === selectedStatus);
      }

      // Apply customer filter
      if (selectedCustomer !== 'all') {
        filteredRecords = filteredRecords.filter(record => record.customer_name === selectedCustomer);
      }

      // Sort by date (we'll handle customer grouping separately)
      filteredRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return filteredRecords;
    },
  });

  // Get filtered records based on active tab and search
  const filteredRecords = allRecords.filter(record => {
    // Apply tab filter
    if (activeTab !== 'all' && record.type !== activeTab) {
      return false;
    }
    return true;
  });

  // Generate customer color helper
  const generateCustomerColor = (customerName: string) => {
    const colors = [
      'hsl(210, 100%, 45%)',  // Blue
      'hsl(168, 100%, 35%)',  // Teal
      'hsl(142, 100%, 35%)',  // Green
      'hsl(45, 100%, 45%)',   // Yellow
      'hsl(25, 100%, 50%)',   // Orange
      'hsl(0, 100%, 50%)',    // Red
      'hsl(280, 100%, 45%)',  // Purple
      'hsl(320, 100%, 45%)',  // Pink
      'hsl(200, 100%, 35%)',  // Light Blue
      'hsl(160, 100%, 40%)'   // Mint
    ];
    
    let hash = 0;
    for (let i = 0; i < customerName.length; i++) {
      hash = customerName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  };

  // Group records by customer
  const customerGroups = useMemo(() => {
    const groups = new Map<string, CustomerGroup>();
    
    filteredRecords.forEach(record => {
      const key = record.customer_name;
      if (!groups.has(key)) {
        groups.set(key, {
          customerName: record.customer_name,
          customerEmail: record.customer_email || '',
          records: [],
          totalAmount: 0,
          recordCount: 0,
          color: generateCustomerColor(record.customer_name)
        });
      }
      
      const group = groups.get(key)!;
      group.records.push(record);
      group.totalAmount += record.amount;
      group.recordCount += 1;
    });
    
    // Sort groups by customer name and limit records per group initially
    return Array.from(groups.values())
      .sort((a, b) => a.customerName.localeCompare(b.customerName))
      .map(group => ({
        ...group,
        records: group.records.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      }));
  }, [filteredRecords]);

  // Get unique customers for dropdown
  const uniqueCustomers = useMemo(() => {
    const customers = new Set(allRecords.map(record => record.customer_name));
    return Array.from(customers).sort();
  }, [allRecords]);

  // Group records by transaction number within each customer
  const groupByTransactionNumber = (records: UnifiedRecord[]) => {
    const groups = new Map<string, UnifiedRecord[]>();
    
    records.forEach(record => {
      const baseNumber = record.transaction_number ? 
        record.transaction_number.split('-')[2] : 
        record.id;
      
      if (!groups.has(baseNumber)) {
        groups.set(baseNumber, []);
      }
      groups.get(baseNumber)!.push(record);
    });
    
    return Array.from(groups.entries()).map(([baseNumber, records]) => ({
      baseTransactionNumber: baseNumber,
      records: records.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }));
  };

  const toggleCustomerExpansion = (customerName: string) => {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(customerName)) {
      newExpanded.delete(customerName);
    } else {
      newExpanded.add(customerName);
    }
    setExpandedCustomers(newExpanded);
  };

  const exportRecords = () => {
    if (filteredRecords.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no records to export.",
        variant: "destructive",
      });
      return;
    }

    const csvContent = [
      ['Type', 'Transaction Number', 'Number', 'Customer', 'Amount', 'Status', 'Date'].join(','),
      ...filteredRecords.map(record => [
        record.type,
        record.transaction_number || 'N/A',
        record.number,
        record.customer_name,
        record.amount,
        record.status,
        new Date(record.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = selectedCustomer !== 'all' ? 
      `transaction_history_${selectedCustomer.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv` :
      `transaction_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Transaction history has been exported to CSV.",
    });
  };

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <p className="text-destructive">Error loading transaction history. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Transaction History</h1>
          <p className="text-muted-foreground">
            View and manage all your transaction records
          </p>
        </div>
        <Button onClick={exportRecords} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers, numbers, or transaction numbers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="estimate">Estimates</SelectItem>
            <SelectItem value="invoice">Invoices</SelectItem>
            <SelectItem value="delivery">Deliveries</SelectItem>
            <SelectItem value="payment">Payments</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {uniqueCustomers.map(customer => (
              <SelectItem key={customer} value={customer}>{customer}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({allRecords.length})</TabsTrigger>
          <TabsTrigger value="estimate">Estimates ({allRecords.filter(r => r.type === 'estimate').length})</TabsTrigger>
          <TabsTrigger value="invoice">Invoices ({allRecords.filter(r => r.type === 'invoice').length})</TabsTrigger>
          <TabsTrigger value="delivery">Deliveries ({allRecords.filter(r => r.type === 'delivery').length})</TabsTrigger>
          <TabsTrigger value="payment">Payments ({allRecords.filter(r => r.type === 'payment').length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="space-y-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading records...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-sm text-destructive">Error loading records. Please try again.</p>
              </div>
            ) : customerGroups.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No records found.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {customerGroups.map((group) => {
                  const isExpanded = expandedCustomers.has(group.customerName);
                  const visibleRecords = isExpanded ? group.records : group.records.slice(0, 20);
                  const hasMore = group.records.length > 20;
                  const transactionGroups = groupByTransactionNumber(visibleRecords);
                  
                  return (
                    <div key={group.customerName} className="border rounded-lg overflow-hidden" style={{ borderColor: group.color + '40' }}>
                      {/* Customer Header */}
                      <div className="bg-muted/50 p-4 border-b" style={{ borderBottomColor: group.color + '40' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CustomerAvatar 
                              customerName={group.customerName}
                              avatarUrl={group.avatarUrl}
                              color={group.color}
                              size="md"
                            />
                            <div>
                              <h3 className="font-semibold text-lg">{group.customerName}</h3>
                              <p className="text-sm text-muted-foreground">{group.customerEmail}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold">${group.totalAmount.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">{group.recordCount} records</p>
                            {hasMore && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleCustomerExpansion(group.customerName)}
                                className="mt-1"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-4 w-4 mr-1" />
                                    Show Less
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-4 w-4 mr-1" />
                                    Show More ({group.records.length - 20})
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Customer Records */}
                      <div className="p-4">
                        <div className="space-y-6">
                          {transactionGroups.map((transactionGroup) => (
                            <div key={transactionGroup.baseTransactionNumber}>
                              {transactionGroup.records.length > 1 ? (
                                <TransactionGroup 
                                  records={transactionGroup.records}
                                  baseTransactionNumber={transactionGroup.baseTransactionNumber}
                                  onRecordClick={handleRecordClick}
                                />
                              ) : (
                                // Single record - display normally
                                <div 
                                  className="flex items-center justify-between p-3 border rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
                                  onClick={() => handleRecordClick(transactionGroup.records[0])}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${typeColors[transactionGroup.records[0].type]}`}>
                                      {React.createElement(typeIcons[transactionGroup.records[0].type], { className: "h-4 w-4" })}
                                    </div>
                                    <div>
                                      <h4 className="font-medium">{transactionGroup.records[0].transaction_number || transactionGroup.records[0].number}</h4>
                                      <p className="text-sm text-muted-foreground">{transactionGroup.records[0].type}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">${transactionGroup.records[0].amount.toFixed(2)}</p>
                                    <p className={`text-xs px-2 py-1 rounded-full ${statusColors[transactionGroup.records[0].status] || 'bg-gray-100 text-gray-800'}`}>
                                      {transactionGroup.records[0].status}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {new Date(transactionGroup.records[0].created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TransactionHistory;