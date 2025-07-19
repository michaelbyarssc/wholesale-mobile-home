import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, TransactionStageHistory, TransactionNote, TransactionPayment, TransactionStatus } from '@/types/transaction';
import { useToast } from '@/hooks/use-toast';

export const useTransactionDetails = (idParam: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // First, check if the ID is a transaction ID, estimate ID, or invoice ID
  const transactionQuery = useQuery({
    queryKey: ['transaction', idParam],
    queryFn: async () => {
      // First try to find by transaction ID
      let { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          mobile_home:mobile_homes(id, model, manufacturer, series, display_name, price)
        `)
        .eq('id', idParam)
        .maybeSingle();

      if (error) throw error;
      
      // If not found by transaction ID, try to find by estimate ID
      if (!data) {
        const { data: transactionData, error: transactionError } = await supabase
          .from('transactions')
          .select(`
            *,
            mobile_home:mobile_homes(id, model, manufacturer, series, display_name, price)
          `)
          .eq('estimate_id', idParam)
          .maybeSingle();

        if (transactionError) throw transactionError;
        data = transactionData;
      }

      // If still not found, try to find by invoice ID
      if (!data) {
        const { data: transactionData, error: transactionError } = await supabase
          .from('transactions')
          .select(`
            *,
            mobile_home:mobile_homes(id, model, manufacturer, series, display_name, price)
          `)
          .eq('invoice_id', idParam)
          .maybeSingle();

        if (transactionError) throw transactionError;
        data = transactionData;
      }

      // If still no transaction found, check if this is an invoice
      if (!data) {
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select(`
            *,
            mobile_home:mobile_homes(id, model, manufacturer, series, display_name, price)
          `)
          .eq('id', idParam)
          .maybeSingle();

        if (invoiceError) throw invoiceError;
        
        if (invoiceData) {
          // Convert invoice data to transaction-like format for display
          return {
            id: invoiceData.id,
            transaction_number: invoiceData.transaction_number || invoiceData.invoice_number,
            display_number: undefined,
            transaction_type: 'sale',
            status: invoiceData.status === 'paid' ? 'payment_complete' : 'invoice_generated',
            priority: 'medium',
            customer_name: invoiceData.customer_name,
            customer_email: invoiceData.customer_email,
            customer_phone: invoiceData.customer_phone || '',
            delivery_address: invoiceData.delivery_address || '',
            mobile_home_id: invoiceData.mobile_home_id,
            mobile_home: invoiceData.mobile_home,
            selected_services: invoiceData.selected_services || [],
            selected_home_options: invoiceData.selected_home_options || [],
            base_amount: 0,
            service_amount: 0,
            tax_amount: 0,
            total_amount: invoiceData.total_amount,
            paid_amount: invoiceData.total_amount - (invoiceData.balance_due || 0),
            balance_due: invoiceData.balance_due || 0,
            user_id: invoiceData.user_id,
            assigned_admin_id: undefined,
            created_by: undefined,
            created_at: invoiceData.created_at,
            updated_at: invoiceData.updated_at,
            estimate_expires_at: undefined,
            invoice_expires_at: undefined,
            scheduled_delivery_date: undefined,
            completed_at: invoiceData.paid_at,
            estimate_id: invoiceData.estimate_id,
            invoice_id: invoiceData.id,
            preferred_contact: invoiceData.preferred_contact || '',
            timeline: invoiceData.timeline || '',
            additional_requirements: invoiceData.additional_requirements || '',
            internal_notes: undefined,
            user_notes: undefined,
            quickbooks_id: invoiceData.quickbooks_id,
            quickbooks_synced_at: invoiceData.quickbooks_synced_at,
            repair_description: undefined,
            repair_category: undefined,
            repair_urgency: undefined,
            repair_completed_at: undefined,
            attachment_urls: []
          } as Transaction;
        }
      }

      // If still not found, check if this is an estimate
      if (!data) {
        const { data: estimateData, error: estimateError } = await supabase
          .from('estimates')
          .select(`
            *,
            mobile_home:mobile_homes(id, model, manufacturer, series, display_name, price)
          `)
          .eq('id', idParam)
          .maybeSingle();

        if (estimateError) throw estimateError;
        
        if (estimateData) {
          // Convert estimate data to transaction-like format for display
          return {
            id: estimateData.id,
            transaction_number: estimateData.transaction_number || `EST-${estimateData.id.slice(0, 8)}`,
            display_number: undefined,
            transaction_type: 'sale',
            status: estimateData.status === 'approved' ? 'estimate_approved' : 'estimate_submitted',
            priority: 'medium',
            customer_name: estimateData.customer_name,
            customer_email: estimateData.customer_email,
            customer_phone: estimateData.customer_phone || '',
            delivery_address: estimateData.delivery_address || '',
            mobile_home_id: estimateData.mobile_home_id,
            mobile_home: estimateData.mobile_home,
            selected_services: estimateData.selected_services || [],
            selected_home_options: estimateData.selected_home_options || [],
            base_amount: 0,
            service_amount: 0,
            tax_amount: 0,
            total_amount: estimateData.total_amount,
            paid_amount: 0,
            balance_due: estimateData.total_amount,
            user_id: estimateData.user_id,
            assigned_admin_id: undefined,
            created_by: undefined,
            created_at: estimateData.created_at,
            updated_at: estimateData.updated_at,
            estimate_expires_at: undefined,
            invoice_expires_at: undefined,
            scheduled_delivery_date: undefined,
            completed_at: estimateData.approved_at,
            estimate_id: estimateData.id,
            invoice_id: estimateData.invoice_id,
            preferred_contact: estimateData.preferred_contact || '',
            timeline: estimateData.timeline || '',
            additional_requirements: estimateData.additional_requirements || '',
            internal_notes: undefined,
            user_notes: undefined,
            quickbooks_id: undefined,
            quickbooks_synced_at: undefined,
            repair_description: undefined,
            repair_category: undefined,
            repair_urgency: undefined,
            repair_completed_at: undefined,
            attachment_urls: []
          } as Transaction;
        }
      }

      return data as Transaction | null;
    },
    enabled: !!idParam,
  });

  const stageHistoryQuery = useQuery({
    queryKey: ['transaction-history', idParam],
    queryFn: async () => {
      // Only fetch if we have a transaction
      if (!transactionQuery.data?.id) return [];
      
      // If this is an invoice-based transaction, we won't have stage history
      if (transactionQuery.data.invoice_id === transactionQuery.data.id) {
        // Create a basic history entry for invoice creation
        return [{
          id: `history-${transactionQuery.data.id}`,
          transaction_id: transactionQuery.data.id,
          from_status: undefined,
          to_status: transactionQuery.data.status,
          changed_by: undefined,
          changed_at: transactionQuery.data.created_at,
          notes: 'Invoice created',
          metadata: {}
        }] as TransactionStageHistory[];
      }
      
      const { data, error } = await supabase
        .from('transaction_stage_history')
        .select('*')
        .eq('transaction_id', transactionQuery.data.id)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return data as TransactionStageHistory[];
    },
    enabled: !!idParam && !!transactionQuery.data?.id,
  });

  const notesQuery = useQuery({
    queryKey: ['transaction-notes', idParam],
    queryFn: async () => {
      // Only fetch if we have a transaction
      if (!transactionQuery.data?.id) return [];
      
      // For invoices and estimates, we might not have transaction notes yet
      // but we should still allow viewing notes if they exist
      const { data, error } = await supabase
        .from('transaction_notes')
        .select('*')
        .eq('transaction_id', transactionQuery.data.id)
        .order('created_at', { ascending: false });

      if (error) {
        // If error is that the transaction doesn't exist in notes table, return empty array
        console.log('Notes query error:', error);
        return [];
      }
      return data as TransactionNote[];
    },
    enabled: !!idParam && !!transactionQuery.data?.id,
  });

  const paymentsQuery = useQuery({
    queryKey: ['transaction-payments', idParam],
    queryFn: async () => {
      // Only fetch if we have a transaction
      if (!transactionQuery.data?.id) return [];
      
      // If this is an invoice-based transaction, fetch from payments table
      if (transactionQuery.data.invoice_id === transactionQuery.data.id) {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('invoice_id', transactionQuery.data.id)
          .order('payment_date', { ascending: false });

        if (error) throw error;
        
        // Convert payments to transaction payment format
        return (data || []).map(payment => ({
          id: payment.id,
          transaction_id: transactionQuery.data!.id,
          amount: payment.amount,
          payment_method: payment.payment_method || 'unknown',
          payment_date: payment.payment_date,
          payment_reference: payment.notes,
          recorded_by: payment.created_by,
          notes: payment.notes,
          created_at: payment.created_at
        })) as TransactionPayment[];
      }
      
      const { data, error } = await supabase
        .from('transaction_payments')
        .select('*')
        .eq('transaction_id', transactionQuery.data.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data as TransactionPayment[];
    },
    enabled: !!idParam && !!transactionQuery.data?.id,
  });

  // ⚠️ WARNING: Transaction approval logic is WORKING - DO NOT MODIFY ⚠️
  const approveTransaction = useMutation({
    mutationFn: async () => {
      if (!transactionQuery.data?.id) throw new Error('No transaction found');
      
      const { data, error } = await supabase.rpc('approve_transaction', {
        p_transaction_id: transactionQuery.data.id
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', idParam] });
      queryClient.invalidateQueries({ queryKey: ['transaction-history', idParam] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: "Transaction approved",
        description: "The transaction has been approved and converted to invoice.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error approving transaction",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const transitionStage = useMutation({
    mutationFn: async ({ newStatus, notes }: { newStatus: TransactionStatus; notes?: string }) => {
      if (!transactionQuery.data?.id) throw new Error('No transaction found');
      
      const { data, error } = await supabase.rpc('transition_transaction_stage', {
        p_transaction_id: transactionQuery.data.id,
        p_new_status: newStatus,
        p_notes: notes
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', idParam] });
      queryClient.invalidateQueries({ queryKey: ['transaction-history', idParam] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: "Status updated",
        description: "Transaction status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const addPayment = useMutation({
    mutationFn: async ({ amount, paymentMethod, paymentReference, notes }: {
      amount: number;
      paymentMethod: string;
      paymentReference?: string;
      notes?: string;
    }) => {
      if (!transactionQuery.data?.id) throw new Error('No transaction found');
      
      const { data, error } = await supabase.rpc('add_transaction_payment', {
        p_transaction_id: transactionQuery.data.id,
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_payment_reference: paymentReference,
        p_notes: notes
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', idParam] });
      queryClient.invalidateQueries({ queryKey: ['transaction-payments', idParam] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: "Payment added",
        description: "Payment has been recorded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error recording payment",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const addNote = useMutation({
    mutationFn: async ({ content, isInternal }: { content: string; isInternal: boolean }) => {
      if (!transactionQuery.data?.id) throw new Error('No transaction found');
      
      const { data, error } = await supabase
        .from('transaction_notes')
        .insert([{
          transaction_id: transactionQuery.data.id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          content,
          is_internal: isInternal
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-notes', idParam] });
      toast({
        title: "Note added",
        description: "Your note has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding note",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return {
    transaction: transactionQuery.data,
    stageHistory: stageHistoryQuery.data || [],
    notes: notesQuery.data || [],
    payments: paymentsQuery.data || [],
    isLoading: transactionQuery.isLoading,
    error: transactionQuery.error,
    approveTransaction,
    transitionStage,
    addPayment,
    addNote,
  };
};