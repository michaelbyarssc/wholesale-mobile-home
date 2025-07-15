import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, TransactionStageHistory, TransactionNote, TransactionPayment, TransactionStatus } from '@/types/transaction';
import { useToast } from '@/hooks/use-toast';

export const useTransactionDetails = (transactionId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const transactionQuery = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          mobile_home:mobile_homes(id, model, manufacturer, series, display_name, price)
        `)
        .eq('id', transactionId)
        .single();

      if (error) throw error;
      return data as Transaction;
    },
    enabled: !!transactionId,
  });

  const stageHistoryQuery = useQuery({
    queryKey: ['transaction-history', transactionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transaction_stage_history')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return data as TransactionStageHistory[];
    },
    enabled: !!transactionId,
  });

  const notesQuery = useQuery({
    queryKey: ['transaction-notes', transactionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transaction_notes')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TransactionNote[];
    },
    enabled: !!transactionId,
  });

  const paymentsQuery = useQuery({
    queryKey: ['transaction-payments', transactionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transaction_payments')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data as TransactionPayment[];
    },
    enabled: !!transactionId,
  });

  const approveTransaction = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('approve_transaction', {
        p_transaction_id: transactionId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['transaction-history', transactionId] });
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
      const { data, error } = await supabase.rpc('transition_transaction_stage', {
        p_transaction_id: transactionId,
        p_new_status: newStatus,
        p_notes: notes
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['transaction-history', transactionId] });
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
      const { data, error } = await supabase.rpc('add_transaction_payment', {
        p_transaction_id: transactionId,
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_payment_reference: paymentReference,
        p_notes: notes
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['transaction-payments', transactionId] });
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
      const { data, error } = await supabase
        .from('transaction_notes')
        .insert([{
          transaction_id: transactionId,
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
      queryClient.invalidateQueries({ queryKey: ['transaction-notes', transactionId] });
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
    isLoading: transactionQuery.isLoading || stageHistoryQuery.isLoading || notesQuery.isLoading || paymentsQuery.isLoading,
    error: transactionQuery.error || stageHistoryQuery.error || notesQuery.error || paymentsQuery.error,
    approveTransaction,
    transitionStage,
    addPayment,
    addNote,
  };
};