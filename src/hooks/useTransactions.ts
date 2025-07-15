import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, TransactionFilters } from '@/types/transaction';
import { useToast } from '@/hooks/use-toast';

export const useTransactions = (filters?: TransactionFilters) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          mobile_home:mobile_homes(id, model, manufacturer, series, display_name, price)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters?.type?.length) {
        query = query.in('transaction_type', filters.type);
      }
      if (filters?.priority?.length) {
        query = query.in('priority', filters.priority);
      }
      if (filters?.assignedAdmin) {
        query = query.eq('assigned_admin_id', filters.assignedAdmin);
      }
      if (filters?.minAmount) {
        query = query.gte('total_amount', filters.minAmount);
      }
      if (filters?.maxAmount) {
        query = query.lte('total_amount', filters.maxAmount);
      }
      if (filters?.dateRange?.from) {
        query = query.gte('created_at', filters.dateRange.from.toISOString());
      }
      if (filters?.dateRange?.to) {
        query = query.lte('created_at', filters.dateRange.to.toISOString());
      }
      if (filters?.searchQuery) {
        query = query.or(
          `customer_name.ilike.%${filters.searchQuery}%,` +
          `customer_email.ilike.%${filters.searchQuery}%,` +
          `transaction_number.ilike.%${filters.searchQuery}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        toast({
          title: "Error loading transactions",
          description: error.message,
          variant: "destructive"
        });
        throw error;
      }

      return data as Transaction[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createTransaction = useMutation({
    mutationFn: async (transactionData: {
      customer_name: string;
      customer_email: string;
      [key: string]: any;
    }) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: "Transaction created",
        description: "Your transaction has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating transaction",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Transaction> & { id: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: "Transaction updated",
        description: "Your transaction has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating transaction",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: "Transaction deleted",
        description: "Transaction has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting transaction",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return {
    ...query,
    transactions: query.data || [],
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
};