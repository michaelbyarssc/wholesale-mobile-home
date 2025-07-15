import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TransactionDashboardData } from '@/types/transaction';
import { useToast } from '@/hooks/use-toast';

export const useTransactionDashboard = (dateRangeDays: number = 30) => {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['transaction-dashboard', dateRangeDays],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_transaction_dashboard_data', {
        p_date_range_days: dateRangeDays
      });

      if (error) {
        toast({
          title: "Error loading dashboard",
          description: error.message,
          variant: "destructive"
        });
        throw error;
      }

      return data as unknown as TransactionDashboardData;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
  });
};