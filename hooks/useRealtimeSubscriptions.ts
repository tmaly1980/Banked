import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useRealtimeSubscriptions = (userId: string | undefined, loadBills: () => Promise<void>) => {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('bills-and-payments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bills',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadBills();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bill_payments',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadBills();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadBills]);
};
