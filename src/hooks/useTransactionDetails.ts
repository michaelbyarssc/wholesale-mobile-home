import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, TransactionStageHistory, TransactionNote, TransactionPayment, TransactionStatus } from '@/types/transaction';
import { useToast } from '@/hooks/use-toast';

export const useTransactionDetails = (idParam: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // First, check if the ID is a transaction ID or estimate ID
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

      return data as Transaction | null;
    },
    enabled: !!idParam,
  });

  const stageHistoryQuery = useQuery({
    queryKey: ['transaction-history', idParam],
    queryFn: async () => {
      // Only fetch if we have a transaction
      if (!transactionQuery.data?.id) return [];
      
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
      
      const { data, error } = await supabase
        .from('transaction_notes')
        .select('*')
        .eq('transaction_id', transactionQuery.data.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TransactionNote[];
    },
    enabled: !!idParam && !!transactionQuery.data?.id,
  });

  const paymentsQuery = useQuery({
    queryKey: ['transaction-payments', idParam],
    queryFn: async () => {
      // Only fetch if we have a transaction
      if (!transactionQuery.data?.id) return [];
      
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