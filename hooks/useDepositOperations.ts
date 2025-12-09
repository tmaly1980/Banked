import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Deposit } from '@/types';

export const useDepositOperations = (userId: string | undefined, loadDeposits: () => Promise<void>) => {
  const createDeposit = useCallback(async (
    deposit: Omit<Deposit, 'id' | 'user_id' | 'created_at'>
  ) => {
    if (!userId) return { data: null, error: new Error('User not authenticated') };

    try {
      const { data, error } = await supabase
        .from('deposits')
        .insert({
          ...deposit,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh deposits
      await loadDeposits();

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }, [userId, loadDeposits]);

  const updateDeposit = useCallback(async (id: string, updates: Partial<Deposit>) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('deposits')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      // Refresh deposits
      await loadDeposits();

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [userId, loadDeposits]);

  const deleteDeposit = useCallback(async (id: string) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('deposits')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      // Refresh deposits
      await loadDeposits();

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [userId, loadDeposits]);

  return {
    createDeposit,
    updateDeposit,
    deleteDeposit,
  };
};
