import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { RecurringDeposit } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export function useRecurringDeposits() {
  const { user } = useAuth();
  const [recurringDeposits, setRecurringDeposits] = useState<RecurringDeposit[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRecurringDeposits = useCallback(async () => {
    if (!user) {
      console.log('[useRecurringDeposits] No user, skipping load');
      return { data: null, error: new Error('User not authenticated') };
    }

    console.log('[useRecurringDeposits] Loading recurring deposits for user:', user.id);
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('recurring_deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('[useRecurringDeposits] Load error:', error);
        // If table doesn't exist, return empty array instead of throwing
        if (error.message?.includes('relation "recurring_deposits" does not exist')) {
          console.warn('[useRecurringDeposits] Table does not exist yet - run migration');
          setRecurringDeposits([]);
          return { data: [], error: null };
        }
        throw error;
      }

      console.log('[useRecurringDeposits] Loaded:', data?.length, 'recurring deposits');
      if (data && data.length > 0) {
        console.log('[useRecurringDeposits] First recurring deposit:', data[0]);
      }
      setRecurringDeposits(data || []);
      return { data, error: null };
    } catch (err) {
      console.error('[useRecurringDeposits] Exception:', err);
      setRecurringDeposits([]);
      return { data: null, error: err as Error };
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createRecurringDeposit = useCallback(async (data: {
    amount: number;
    start_date: string;
    end_date?: string;
    recurrence_unit: 'week' | 'month';
    interval: number;
    day_of_week?: string;
    day_of_month?: number;
    last_day_of_month: boolean;
    last_business_day_of_month: boolean;
  }) => {
    console.log('[useRecurringDeposits] Creating recurring deposit:', JSON.stringify(data, null, 2));
    
    if (!user) {
      console.error('[useRecurringDeposits] User not authenticated');
      return { data: null, error: new Error('User not authenticated') };
    }

    try {
      const insertData = {
        user_id: user.id,
        ...data,
      };

      console.log('[useRecurringDeposits] Inserting:', JSON.stringify(insertData, null, 2));

      const { data: recurringDeposit, error } = await supabase
        .from('recurring_deposits')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[useRecurringDeposits] Create error:', error);
        throw error;
      }

      console.log('[useRecurringDeposits] Created successfully:', recurringDeposit);
      await loadRecurringDeposits();
      return { data: recurringDeposit, error: null };
    } catch (err) {
      console.error('[useRecurringDeposits] Exception:', err);
      return { data: null, error: err as Error };
    }
  }, [user, loadRecurringDeposits]);

  const updateRecurringDeposit = useCallback(async (id: string, data: Partial<RecurringDeposit>) => {
    console.log('[useRecurringDeposits] Updating recurring deposit:', id, JSON.stringify(data, null, 2));

    if (!user) {
      console.error('[useRecurringDeposits] User not authenticated');
      return { data: null, error: new Error('User not authenticated') };
    }

    try {
      const { data: updated, error } = await supabase
        .from('recurring_deposits')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[useRecurringDeposits] Update error:', error);
        throw error;
      }

      console.log('[useRecurringDeposits] Updated successfully:', updated);
      await loadRecurringDeposits();
      return { data: updated, error: null };
    } catch (err) {
      console.error('[useRecurringDeposits] Exception:', err);
      return { data: null, error: err as Error };
    }
  }, [user, loadRecurringDeposits]);

  const deleteRecurringDeposit = useCallback(async (id: string) => {
    console.log('[useRecurringDeposits] Deleting recurring deposit:', id);

    if (!user) {
      console.error('[useRecurringDeposits] User not authenticated');
      return { error: new Error('User not authenticated') };
    }

    try {
      const { error } = await supabase
        .from('recurring_deposits')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[useRecurringDeposits] Delete error:', error);
        throw error;
      }

      console.log('[useRecurringDeposits] Deleted successfully');
      await loadRecurringDeposits();
      return { error: null };
    } catch (err) {
      console.error('[useRecurringDeposits] Exception:', err);
      return { error: err as Error };
    }
  }, [user, loadRecurringDeposits]);

  return {
    recurringDeposits,
    loading,
    loadRecurringDeposits,
    createRecurringDeposit,
    updateRecurringDeposit,
    deleteRecurringDeposit,
  };
}
