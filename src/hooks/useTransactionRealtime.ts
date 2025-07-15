import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction } from '@/types/transaction';
import { useToast } from '@/hooks/use-toast';

export const useTransactionRealtime = (transactionId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    // Subscribe to transaction changes
    const transactionChannel = supabase
      .channel('transaction-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: transactionId ? `id=eq.${transactionId}` : undefined,
        },
        (payload) => {
          console.log('Transaction change:', payload);
          
          if (payload.eventType === 'INSERT') {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            toast({
              title: "New Transaction",
              description: "A new transaction has been created.",
            });
          } else if (payload.eventType === 'UPDATE') {
            // Update specific transaction cache
            if (transactionId) {
              queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] });
            }
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            
            const newTransaction = payload.new as Transaction;
            toast({
              title: "Transaction Updated",
              description: `Transaction ${newTransaction.transaction_number} status changed to ${newTransaction.status}`,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to stage history changes
    const historyChannel = supabase
      .channel('transaction-history-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transaction_stage_history',
          filter: transactionId ? `transaction_id=eq.${transactionId}` : undefined,
        },
        (payload) => {
          console.log('Transaction history change:', payload);
          
          if (transactionId) {
            queryClient.invalidateQueries({ queryKey: ['transaction-history', transactionId] });
          }
        }
      )
      .subscribe();

    // Subscribe to notes changes
    const notesChannel = supabase
      .channel('transaction-notes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transaction_notes',
          filter: transactionId ? `transaction_id=eq.${transactionId}` : undefined,
        },
        (payload) => {
          console.log('Transaction notes change:', payload);
          
          if (transactionId) {
            queryClient.invalidateQueries({ queryKey: ['transaction-notes', transactionId] });
          }
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Note",
              description: "A new note has been added to the transaction.",
            });
          }
        }
      )
      .subscribe();

    // Subscribe to payments changes
    const paymentsChannel = supabase
      .channel('transaction-payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transaction_payments',
          filter: transactionId ? `transaction_id=eq.${transactionId}` : undefined,
        },
        (payload) => {
          console.log('Transaction payments change:', payload);
          
          if (transactionId) {
            queryClient.invalidateQueries({ queryKey: ['transaction-payments', transactionId] });
            queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] });
          }
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: "Payment Recorded",
              description: "A new payment has been recorded for the transaction.",
            });
          }
        }
      )
      .subscribe();

    // Subscribe to notifications
    const notificationsChannel = supabase
      .channel('transaction-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transaction_notifications',
        },
        (payload) => {
          console.log('Transaction notification:', payload);
          
          const notification = payload.new as any;
          
          // Only show notifications for current user
          supabase.auth.getUser().then(({ data }) => {
            if (data.user?.id === notification.user_id) {
              toast({
                title: notification.title,
                description: notification.message,
              });
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(transactionChannel);
      supabase.removeChannel(historyChannel);
      supabase.removeChannel(notesChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [transactionId, queryClient, toast]);
};