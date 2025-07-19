import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Settings,
  Edit,
  Save,
  MoreHorizontal,
  X
 } from 'lucide-react';
import { EstimateDocuSignButton } from '@/components/estimate-approval/EstimateDocuSignButton';
import { EmailInvoiceButton } from '@/components/estimate-approval/EmailInvoiceButton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { QuickBooksSettings } from './QuickBooksSettings';
import { InvoiceCreationForm } from './InvoiceCreationForm';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

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

  // Fetch existing invoices with related data
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
        .select(`
          *,
          estimates!invoices_estimate_id_fkey (
            *,
            mobile_homes (
              manufacturer,
              model,
              series,
              bedrooms,
              bathrooms,
              square_footage,
              width_feet,
              length_feet,
              price
            ),
            estimate_line_items (
              *
            )
          ),
          payments (
            *
          )
        `)
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

  // Create invoice from approved estimate
  const createInvoiceMutation = useMutation({
    mutationFn: async (estimateId: string) => {
      // Get the estimate details first
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .select('*')
        .eq('id', estimateId)
        .single();
      
      if (estimateError) throw estimateError;
      
      // Generate proper invoice number using the database function
      const { data: invoiceNumber, error: numberError } = await supabase.rpc('generate_invoice_number');
      
      if (numberError || !invoiceNumber) {
        throw new Error('Failed to generate invoice number');
      }
      
      console.log('🔍 About to create invoice with data:', {
        estimate_id: estimate.id,
        estimate_total_amount: estimate.total_amount,
        estimate_total_type: typeof estimate.total_amount,
        invoice_number: invoiceNumber
      });
      
      // Create invoice from the approved estimate
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          estimate_id: estimate.id,
          invoice_number: invoiceNumber,
          transaction_number: estimate.transaction_number, // Keep original estimate transaction number for tracking
          customer_name: estimate.customer_name,
          customer_email: estimate.customer_email,
          customer_phone: estimate.customer_phone,
          delivery_address: estimate.delivery_address,
          total_amount: estimate.total_amount,
          balance_due: Number(estimate.total_amount), // Explicitly convert to number to ensure it's not null
          user_id: estimate.user_id,
          mobile_home_id: estimate.mobile_home_id,
          selected_services: estimate.selected_services,
          selected_home_options: estimate.selected_home_options,
          preferred_contact: estimate.preferred_contact,
          timeline: estimate.timeline,
          additional_requirements: estimate.additional_requirements,
          status: 'sent',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
        })
        .select()
        .single();
      
      if (invoiceError) throw invoiceError;
      
      console.log('🔍 Invoice created with balance_due:', {
        invoice_id: invoice.id,
        estimate_total: estimate.total_amount,
        invoice_data: invoice
      });
      
      // Explicitly update the balance_due to ensure it's set correctly
      const { error: balanceUpdateError } = await supabase
        .from('invoices')
        .update({ balance_due: estimate.total_amount })
        .eq('id', invoice.id);
      
      if (balanceUpdateError) {
        console.error('Failed to update balance_due:', balanceUpdateError);
        // Continue anyway as this is not critical
      }
      
      // Verify the balance_due was set correctly
      const { data: verifyInvoice, error: verifyError } = await supabase
        .from('invoices')
        .select('id, total_amount, balance_due')
        .eq('id', invoice.id)
        .single();
      
      console.log('🔍 Verified invoice balance_due:', {
        invoice_id: invoice.id,
        total_amount: verifyInvoice?.total_amount,
        balance_due: verifyInvoice?.balance_due,
        verifyError
      });
      
      // Update estimate to link to the invoice
      const { error: updateError } = await supabase
        .from('estimates')
        .update({ invoice_id: invoice.id })
        .eq('id', estimateId);
      
      if (updateError) throw updateError;
      
      return invoice;
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

  // Cancel invoice mutation
  const cancelInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices-basic'] });
      toast({
        title: "Invoice Cancelled",
        description: "Invoice has been cancelled successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Invoice cancellation error:', error);
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel invoice. Please try again.",
        variant: "destructive",
      });
    },
  });
  const handleViewInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDialog(true);
  };

  const handleEditInvoice = (invoice: any) => {
    setEditingInvoice({ ...invoice });
    setShowEditDialog(true);
  };

  const handlePaymentClick = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentNotes('');
    setShowPaymentDialog(true);
  };

  // Update invoice mutation
  const updateInvoiceMutation = useMutation({
    mutationFn: async (updatedInvoice: any) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          customer_name: updatedInvoice.customer_name,
          customer_email: updatedInvoice.customer_email,
          customer_phone: updatedInvoice.customer_phone,
          delivery_address: updatedInvoice.delivery_address,
          total_amount: updatedInvoice.total_amount,
          due_date: updatedInvoice.due_date,
          notes: updatedInvoice.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedInvoice.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices-basic'] });
      setShowEditDialog(false);
      setEditingInvoice(null);
      toast({
        title: "Invoice Updated",
        description: "Invoice has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Invoice update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update invoice. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async (paymentData: { 
      invoice_id: string; 
      amount: number; 
      payment_method: string; 
      notes?: string; 
    }) => {
      console.log('Starting payment processing...', paymentData);
      
      // Get current session and user
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session?.user) {
        console.error('Authentication error:', sessionError);
        throw new Error('Authentication required. Please log in again.');
      }

      const user = sessionData.session.user;

      // Check if user is admin
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        throw new Error('Failed to verify user permissions.');
      }

      const isAdmin = userRoles?.some(r => r.role === 'admin' || r.role === 'super_admin');
      if (!isAdmin) {
        console.error('User is not admin. Roles:', userRoles);
        throw new Error('Admin privileges required to record payments.');
      }

      console.log('User is admin, proceeding with optimized payment recording...');
      
      // Use the optimized database function for faster processing
      const { data: result, error } = await supabase.rpc('record_invoice_payment_optimized', {
        p_invoice_id: paymentData.invoice_id,
        p_amount: paymentData.amount,
        p_payment_method: paymentData.payment_method,
        p_notes: paymentData.notes
      });

      if (error) {
        console.error('Payment processing error:', error);
        throw new Error(`Failed to record payment: ${error.message}`);
      }

      // Type the result properly
      const paymentResult = result as any;
      
      if (!paymentResult?.success) {
        console.error('Payment function returned error:', paymentResult);
        throw new Error(paymentResult?.error || 'Failed to record payment');
      }

      console.log('Payment recorded successfully:', paymentResult);
      return { 
        success: true, 
        payment_id: paymentResult.payment_id, 
        new_balance: paymentResult.new_balance,
        invoice_status: paymentResult.invoice_status
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices-basic'] });
      setShowPaymentDialog(false);
      setSelectedInvoice(null);
      toast({
        title: "Payment Recorded",
        description: "Payment has been successfully recorded and invoice balance updated.",
      });
    },
    onError: (error) => {
      console.error('Payment processing error:', error);
      toast({
        title: "Payment Failed",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    },
  });

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
      cancelled: { variant: 'destructive' as const, label: 'Cancelled' },
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
                          <span>Balance Due: {formatCurrency(invoice.balance_due ?? invoice.total_amount)}</span>
                          {invoice.due_date && (
                            <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
                          )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* First Row: Primary Actions */}
                      <div className="flex items-center gap-2">
                        <EmailInvoiceButton
                          invoiceId={invoice.id}
                          customerEmail={invoice.customer_email}
                          customerName={invoice.customer_name}
                          invoiceNumber={invoice.invoice_number}
                        />
                        <Button size="sm" variant="outline" onClick={() => handleViewInvoice(invoice)}>
                          <Eye className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                        
                        <Button size="sm" variant="outline" onClick={() => handleEditInvoice(invoice)}>
                          <Edit className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                      </div>

                      {/* Second Row: Secondary Actions */}
                      <div className="flex items-center gap-2">
                        {/* Mobile: Dropdown for Secondary Actions */}
                        {isMobile ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {invoice.status === 'draft' && (
                                <DropdownMenuItem>
                                  <Send className="h-4 w-4 mr-2" />
                                  Send Invoice
                                </DropdownMenuItem>
                              )}
                              
                              {invoice.status !== 'paid' && (invoice.balance_due ?? invoice.total_amount) > 0 && (
                                <DropdownMenuItem onClick={() => handlePaymentClick(invoice)}>
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Record Payment
                                </DropdownMenuItem>
                              )}
                              
                              {!invoice.quickbooks_id && (
                                <DropdownMenuItem 
                                  onClick={() => syncToQuickBooksMutation.mutate(invoice.id)}
                                  disabled={syncToQuickBooksMutation.isPending}
                                >
                                  <RotateCw className="h-4 w-4 mr-2" />
                                  {syncToQuickBooksMutation.isPending ? 'Syncing...' : 'Sync to QuickBooks'}
                                 </DropdownMenuItem>
                               )}
                               
                               {invoice.status !== 'cancelled' && (
                                 <DropdownMenuItem 
                                   onClick={() => cancelInvoiceMutation.mutate(invoice.id)}
                                   disabled={cancelInvoiceMutation.isPending}
                                 >
                                   <X className="h-4 w-4 mr-2" />
                                   {cancelInvoiceMutation.isPending ? 'Cancelling...' : 'Cancel Invoice'}
                                 </DropdownMenuItem>
                               )}
                               
                               <DropdownMenuItem asChild>
                                 <div className="cursor-pointer">
                                   <EstimateDocuSignButton
                                     estimateId={invoice.estimate_id || ''}
                                     customerEmail={invoice.customer_email}
                                     customerName={invoice.customer_name}
                                     estimateNumber={invoice.invoice_number}
                                     documentType="invoice"
                                     hasInvoice={true}
                                   />
                                 </div>
                               </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          /* Desktop: Show All Actions */
                          <>
                            {invoice.status === 'draft' && (
                              <Button size="sm">
                                <Send className="h-3 w-3 mr-1" />
                                Send
                              </Button>
                            )}

                            {invoice.status !== 'paid' && (invoice.balance_due ?? invoice.total_amount) > 0 && (
                              <Button size="sm" variant="outline" onClick={() => handlePaymentClick(invoice)}>
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
                                {syncToQuickBooksMutation.isPending ? 'Syncing...' : 'Sync QB'}
                              </Button>
                            )}

                            {invoice.status !== 'cancelled' && (
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => cancelInvoiceMutation.mutate(invoice.id)}
                                disabled={cancelInvoiceMutation.isPending}
                              >
                                <X className="h-3 w-3 mr-1" />
                                {cancelInvoiceMutation.isPending ? 'Cancelling...' : 'Cancel'}
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
                          </>
                        )}

                        {/* QuickBooks ID Display */}
                        {invoice.quickbooks_id && (
                          <div className="text-xs text-muted-foreground">
                            QB: {invoice.quickbooks_id}
                          </div>
                        )}
                      </div>
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Invoice Details - {selectedInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-blue-900">Invoice Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium text-gray-600">Invoice Number:</span> <span className="font-bold">{selectedInvoice.invoice_number}</span></div>
                      <div><span className="font-medium text-gray-600">Status:</span> {getStatusBadge(selectedInvoice.status)}</div>
                      <div><span className="font-medium text-gray-600">Created:</span> {new Date(selectedInvoice.created_at).toLocaleDateString()}</div>
                      {selectedInvoice.due_date && (
                        <div><span className="font-medium text-gray-600">Due Date:</span> {new Date(selectedInvoice.due_date).toLocaleDateString()}</div>
                      )}
                      {selectedInvoice.paid_at && (
                        <div><span className="font-medium text-gray-600">Paid Date:</span> {new Date(selectedInvoice.paid_at).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-green-900">Customer Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium text-gray-600">Name:</span> {selectedInvoice.customer_name}</div>
                      <div><span className="font-medium text-gray-600">Email:</span> {selectedInvoice.customer_email}</div>
                      <div><span className="font-medium text-gray-600">Phone:</span> {selectedInvoice.customer_phone}</div>
                      {selectedInvoice.delivery_address && (
                        <div><span className="font-medium text-gray-600">Delivery Address:</span> {selectedInvoice.delivery_address}</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-purple-900">Financial Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium text-gray-600">Total Amount:</span> <span className="font-bold text-lg">{formatCurrency(selectedInvoice.total_amount)}</span></div>
                      <div><span className="font-medium text-gray-600">Balance Due:</span> <span className="font-bold text-lg text-red-600">{formatCurrency(selectedInvoice.balance_due ?? selectedInvoice.total_amount)}</span></div>
                      {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                        <div><span className="font-medium text-gray-600">Payments Made:</span> <span className="font-bold text-green-600">{formatCurrency(selectedInvoice.payments.reduce((sum: number, p: any) => sum + p.amount, 0))}</span></div>
                      )}
                      {/* Add Payment Button */}
                      <div className="pt-2">
                        <Button 
                          onClick={() => {
                            setSelectedInvoice(selectedInvoice);
                            setShowPaymentDialog(true);
                          }}
                          size="sm"
                          className="w-full"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Add Payment
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Home Details */}
              {selectedInvoice.estimates?.mobile_homes && (
                <div className="bg-green-50 rounded-lg p-6 border">
                  <h3 className="font-semibold text-lg mb-4 text-green-900">Mobile Home Specifications & Line Items</h3>
                  <div className="space-y-6">
                    {/* Mobile Home Basic Info */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="font-medium text-gray-600">Manufacturer:</span>
                            <span className="text-gray-900">{selectedInvoice.estimates.mobile_homes.manufacturer}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="font-medium text-gray-600">Series:</span>
                            <span className="text-gray-900">{selectedInvoice.estimates.mobile_homes.series}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="font-medium text-gray-600">Model:</span>
                            <span className="text-gray-900">{selectedInvoice.estimates.mobile_homes.model}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="space-y-3">
                          {selectedInvoice.estimates.mobile_homes.bedrooms && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                              <span className="font-medium text-gray-600">Bedrooms:</span>
                              <span className="text-gray-900">{selectedInvoice.estimates.mobile_homes.bedrooms}</span>
                            </div>
                          )}
                          {selectedInvoice.estimates.mobile_homes.bathrooms && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                              <span className="font-medium text-gray-600">Bathrooms:</span>
                              <span className="text-gray-900">{selectedInvoice.estimates.mobile_homes.bathrooms}</span>
                            </div>
                          )}
                          {selectedInvoice.estimates.mobile_homes.square_footage && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                              <span className="font-medium text-gray-600">Square Footage:</span>
                              <span className="text-gray-900">{selectedInvoice.estimates.mobile_homes.square_footage} sq ft</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Line Items */}
                    {selectedInvoice.estimates?.estimate_line_items && selectedInvoice.estimates.estimate_line_items.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-md mb-3 text-green-800">Itemized Add-ons</h4>
                        <div className="space-y-2">
                          {selectedInvoice.estimates.estimate_line_items.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between items-center py-3 px-4 bg-white rounded border">
                              <div>
                                <div className="font-medium">{item.name}</div>
                                {item.description && <div className="text-sm text-gray-600">{item.description}</div>}
                                <div className="text-sm text-gray-500">Qty: {item.quantity} × {formatCurrency(item.unit_price)}</div>
                              </div>
                              <div className="text-lg font-semibold text-green-600">{formatCurrency(item.total_price)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* Payment History */}
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div className="bg-purple-50 rounded-lg p-6 border">
                  <h3 className="font-semibold text-lg mb-4 text-purple-900">Payment History</h3>
                  <div className="space-y-3">
                    {selectedInvoice.payments.map((payment: any, index: number) => (
                      <div key={index} className="flex justify-between items-center py-3 px-4 bg-white rounded border">
                        <div>
                          <div className="font-medium">{formatCurrency(payment.amount)}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(payment.payment_date).toLocaleDateString()} • {payment.payment_method.replace('_', ' ').toUpperCase()}
                          </div>
                          {payment.notes && <div className="text-sm text-gray-500">{payment.notes}</div>}
                        </div>
                        <div className="text-green-600 font-semibold">Paid</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Information */}
              {(selectedInvoice.estimates?.additional_requirements || selectedInvoice.notes) && (
                <div className="bg-gray-50 rounded-lg p-6 border">
                  <h3 className="font-semibold text-lg mb-4 text-gray-900">Additional Information</h3>
                  {selectedInvoice.estimates?.additional_requirements && (
                    <div className="mb-4">
                      <div className="font-medium text-gray-600 mb-2">Additional Requirements:</div>
                      <div className="text-gray-900 bg-white p-3 rounded border">{selectedInvoice.estimates.additional_requirements}</div>
                    </div>
                  )}
                  {selectedInvoice.notes && (
                    <div>
                      <div className="font-medium text-gray-600 mb-2">Invoice Notes:</div>
                      <div className="text-gray-900 bg-white p-3 rounded border">{selectedInvoice.notes}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Total Summary */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-6 border-2">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Total Invoice Amount:</span>
                  <span className="text-primary text-2xl">{formatCurrency(selectedInvoice.total_amount)}</span>
                </div>
                {selectedInvoice.balance_due !== undefined && selectedInvoice.balance_due > 0 && (
                  <div className="flex justify-between items-center text-lg font-semibold mt-2 text-red-600">
                    <span>Outstanding Balance:</span>
                    <span>{formatCurrency(selectedInvoice.balance_due)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice - {editingInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          
          {editingInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input
                    id="customer_name"
                    value={editingInvoice.customer_name || ''}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, customer_name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customer_email">Customer Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={editingInvoice.customer_email || ''}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, customer_email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_phone">Customer Phone</Label>
                  <Input
                    id="customer_phone"
                    value={editingInvoice.customer_phone || ''}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, customer_phone: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="total_amount">Total Amount</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    value={editingInvoice.total_amount || ''}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, total_amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_address">Delivery Address</Label>
                <Textarea
                  id="delivery_address"
                  value={editingInvoice.delivery_address || ''}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, delivery_address: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={editingInvoice.due_date ? new Date(editingInvoice.due_date).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, due_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={editingInvoice.notes || ''}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => updateInvoiceMutation.mutate(editingInvoice)}
                  disabled={updateInvoiceMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateInvoiceMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment - {selectedInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-sm">
                  <div><span className="font-medium">Customer:</span> {selectedInvoice.customer_name}</div>
                  <div><span className="font-medium">Total Amount:</span> {formatCurrency(selectedInvoice.total_amount)}</div>
                  <div><span className="font-medium">Balance Due:</span> {formatCurrency(selectedInvoice.balance_due || selectedInvoice.total_amount)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_amount">Payment Amount</Label>
                <Input
                  id="payment_amount"
                  type="number"
                  step="0.01"
                  placeholder="Enter payment amount"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_notes">Notes (Optional)</Label>
                <Textarea
                  id="payment_notes"
                  placeholder="Payment notes..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
                      toast({
                        title: "Invalid Amount",
                        description: "Please enter a valid payment amount.",
                        variant: "destructive",
                      });
                      return;
                    }
                    processPaymentMutation.mutate({
                      invoice_id: selectedInvoice.id,
                      amount: parseFloat(paymentAmount),
                      payment_method: paymentMethod,
                      notes: paymentNotes.trim() || null,
                    });
                  }}
                  disabled={processPaymentMutation.isPending || !paymentAmount}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {processPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
