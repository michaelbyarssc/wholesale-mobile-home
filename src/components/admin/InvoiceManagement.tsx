import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  FileText, 
  DollarSign, 
  Calendar, 
  Send, 
  Eye,
  Plus,
  Search,
  Filter,
  CreditCard,
  AlertCircle,
  RotateCw,
  Settings
 } from 'lucide-react';
import { EstimateDocuSignButton } from '@/components/estimate-approval/EstimateDocuSignButton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { QuickBooksSettings } from './QuickBooksSettings';
import { InvoiceCreationForm } from './InvoiceCreationForm';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const InvoiceManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);

  // Fetch approved estimates that can become invoices
  const { data: approvedEstimates = [], isLoading } = useQuery({
    queryKey: ['approved-estimates'],
    queryFn: async () => {
      // First check if we have a session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('estimates')
        .select(`
          *,
          mobile_homes (
            manufacturer,
            model,
            width_feet,
            length_feet
          )
        `)
        .eq('status', 'approved')
        .is('invoice_id', null)
        .order('approved_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing invoices
  const { data: invoices = [], error: invoicesError } = useQuery({
    queryKey: ['invoices-basic'],
    queryFn: async () => {
      // First check if we have a session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        throw new Error('Not authenticated');
      }

      console.log('Fetching invoices for user:', session.user.id);

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Invoice query error:', error);
        throw error;
      }
      
      console.log('Invoices fetched successfully:', data?.length || 0, 'invoices');
      return data || [];
    },
    retry: false, // Don't retry failed queries
    enabled: true, // Always try to fetch
  });

  // Handle invoice loading error
  React.useEffect(() => {
    if (invoicesError) {
      console.error('Failed to fetch invoices:', invoicesError);
      toast({
        title: "Error",
        description: "Failed to load invoices. Please try refreshing.",
        variant: "destructive",
      });
    }
  }, [invoicesError, toast]);

  // Create invoice from estimate using the improved approve_estimate function
  const createInvoiceMutation = useMutation({
    mutationFn: async (estimateId: string) => {
      const { data, error } = await supabase.rpc('approve_estimate', {
        estimate_uuid: estimateId
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approved-estimates'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-basic'] });
      toast({
        title: "Invoice Created",
        description: "Invoice has been generated successfully from the approved estimate.",
      });
    },
    onError: (error) => {
      console.error('Invoice creation error:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
    },
  });

  // QuickBooks sync mutation
  const syncToQuickBooksMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase.functions.invoke('quickbooks-sync', {
        body: { invoiceId, action: 'sync' }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: ['invoices-basic'] });
      toast({
        title: "QuickBooks Sync",
        description: "Invoice synced to QuickBooks successfully.",
      });
    },
    onError: (error: any) => {
      console.error('QuickBooks sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync invoice to QuickBooks.",
        variant: "destructive",
      });
    },
  });

  
  const handleViewInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDialog(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: { variant: 'secondary' as const, label: 'Draft' },
      sent: { variant: 'outline' as const, label: 'Sent' },
      paid: { variant: 'default' as const, label: 'Paid' },
      overdue: { variant: 'destructive' as const, label: 'Overdue' },
    };
    
    const config = variants[status as keyof typeof variants] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-muted rounded-lg"></div>
          <div className="h-40 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invoice Management</h2>
          <p className="text-muted-foreground">
            Convert approved estimates to invoices and track payments
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="create">Create Invoice</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Ready for Invoice
                </p>
                <p className="text-2xl font-bold">{approvedEstimates.length}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Invoices
                </p>
                <p className="text-2xl font-bold">{invoices.length}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Value
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(invoices.reduce((sum, inv) => sum + inv.total_amount, 0))}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Payment
                </p>
                <p className="text-2xl font-bold">
                  {invoices.filter(inv => inv.status !== 'paid').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Approved Estimates Ready for Invoice */}
      {approvedEstimates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Approved Estimates Ready for Invoice ({approvedEstimates.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {approvedEstimates.map((estimate) => (
                <div
                  key={estimate.id}
                  className="border rounded-lg p-4 flex items-center justify-between hover:bg-muted/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{estimate.customer_name}</span>
                      <Badge variant="outline">
                        {estimate.mobile_homes?.manufacturer} {estimate.mobile_homes?.model}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {estimate.customer_email} • {formatCurrency(estimate.total_amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Approved: {new Date(estimate.approved_at || '').toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => createInvoiceMutation.mutate(estimate.id)}
                    disabled={createInvoiceMutation.isPending}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Invoice</span>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices ({invoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No invoices created yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Approve estimates to create invoices
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium">{invoice.invoice_number}</span>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {invoice.customer_name} • {invoice.customer_email}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Total: {formatCurrency(invoice.total_amount)}</span>
                        {invoice.due_date && (
                          <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleViewInvoice(invoice)}>
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      
                      {invoice.status === 'draft' && (
                        <Button size="sm">
                          <Send className="h-3 w-3 mr-1" />
                          Send
                        </Button>
                      )}

                      {invoice.status !== 'paid' && (
                        <Button size="sm" variant="outline">
                          <CreditCard className="h-3 w-3 mr-1" />
                          Payment
                        </Button>
                      )}

                      {!invoice.quickbooks_id && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => syncToQuickBooksMutation.mutate(invoice.id)}
                          disabled={syncToQuickBooksMutation.isPending}
                        >
                          <RotateCw className="h-3 w-3 mr-1" />
                          {syncToQuickBooksMutation.isPending ? 'Syncing...' : 'Sync to QB'}
                        </Button>
                       )}

                       <EstimateDocuSignButton
                         estimateId={invoice.estimate_id || ''}
                         customerEmail={invoice.customer_email}
                         customerName={invoice.customer_name}
                         estimateNumber={invoice.invoice_number}
                         documentType="invoice"
                         hasInvoice={true}
                       />

                       {invoice.quickbooks_id && (
                         <div className="text-xs text-muted-foreground">
                           QB: {invoice.quickbooks_id}
                         </div>
                       )}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <InvoiceCreationForm />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <QuickBooksSettings />
        </TabsContent>
      </Tabs>

      {/* Invoice Details Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details - {selectedInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Invoice Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Invoice Number:</span> {selectedInvoice.invoice_number}</div>
                    <div><span className="font-medium">Status:</span> {getStatusBadge(selectedInvoice.status)}</div>
                    <div><span className="font-medium">Created:</span> {new Date(selectedInvoice.created_at).toLocaleDateString()}</div>
                    {selectedInvoice.due_date && (
                      <div><span className="font-medium">Due Date:</span> {new Date(selectedInvoice.due_date).toLocaleDateString()}</div>
                    )}
                    {selectedInvoice.paid_at && (
                      <div><span className="font-medium">Paid Date:</span> {new Date(selectedInvoice.paid_at).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-2">Customer Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Name:</span> {selectedInvoice.customer_name}</div>
                    <div><span className="font-medium">Email:</span> {selectedInvoice.customer_email}</div>
                    <div><span className="font-medium">Phone:</span> {selectedInvoice.customer_phone}</div>
                    {selectedInvoice.delivery_address && (
                      <div><span className="font-medium">Delivery Address:</span> {selectedInvoice.delivery_address}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-lg mb-4">Financial Details</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total Amount:</span>
                    <span className="text-primary">{formatCurrency(selectedInvoice.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* QuickBooks Integration */}
              {selectedInvoice.quickbooks_id && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-2">QuickBooks Integration</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">QuickBooks ID:</span> {selectedInvoice.quickbooks_id}</div>
                    {selectedInvoice.quickbooks_synced_at && (
                      <div><span className="font-medium">Last Synced:</span> {new Date(selectedInvoice.quickbooks_synced_at).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="border-t pt-4 flex space-x-2">
                {selectedInvoice.status === 'draft' && (
                  <Button>
                    <Send className="h-4 w-4 mr-2" />
                    Send Invoice
                  </Button>
                )}
                
                {selectedInvoice.status !== 'paid' && (
                  <Button variant="outline">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Mark as Paid
                  </Button>
                )}

                {!selectedInvoice.quickbooks_id && (
                  <Button 
                    variant="outline"
                    onClick={() => syncToQuickBooksMutation.mutate(selectedInvoice.id)}
                    disabled={syncToQuickBooksMutation.isPending}
                  >
                    <RotateCw className="h-4 w-4 mr-2" />
                    {syncToQuickBooksMutation.isPending ? 'Syncing...' : 'Sync to QuickBooks'}
                  </Button>
                )}

                <EstimateDocuSignButton
                  estimateId={selectedInvoice.estimate_id || ''}
                  customerEmail={selectedInvoice.customer_email}
                  customerName={selectedInvoice.customer_name}
                  estimateNumber={selectedInvoice.invoice_number}
                  documentType="invoice"
                  hasInvoice={true}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
