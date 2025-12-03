import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Paycheck } from '@/types';

export const usePaycheckOperations = (userId: string | undefined, loadPaychecks: () => Promise<void>) => {
  const createPaycheck = useCallback(async (
    paycheck: Omit<Paycheck, 'id' | 'user_id' | 'created_at'>
  ) => {
    if (!userId) return { data: null, error: new Error('User not authenticated') };

    try {
      const { data, error } = await supabase
        .from('paychecks')
        .insert({
          ...paycheck,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh paychecks
      await loadPaychecks();

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }, [userId, loadPaychecks]);

  const updatePaycheck = useCallback(async (id: string, updates: Partial<Paycheck>) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('paychecks')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      // Refresh paychecks
      await loadPaychecks();

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [userId, loadPaychecks]);

  const deletePaycheck = useCallback(async (id: string) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('paychecks')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      // Refresh paychecks
      await loadPaychecks();

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [userId, loadPaychecks]);

  return {
    createPaycheck,
    updatePaycheck,
    deletePaycheck,
  };
};
