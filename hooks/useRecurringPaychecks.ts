import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { RecurringPaycheck } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export function useRecurringPaychecks() {
  const { user } = useAuth();
  const [recurringPaychecks, setRecurringPaychecks] = useState<RecurringPaycheck[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRecurringPaychecks = useCallback(async () => {
    if (!user) {
      console.log('[useRecurringPaychecks] No user, skipping load');
      return { data: null, error: new Error('User not authenticated') };
    }

    console.log('[useRecurringPaychecks] Loading recurring paychecks for user:', user.id);
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('recurring_paychecks')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('[useRecurringPaychecks] Load error:', error);
        // If table doesn't exist, return empty array instead of throwing
        if (error.message?.includes('relation "recurring_paychecks" does not exist')) {
          console.warn('[useRecurringPaychecks] Table does not exist yet - run migration');
          setRecurringPaychecks([]);
          return { data: [], error: null };
        }
        throw error;
      }

      console.log('[useRecurringPaychecks] Loaded:', data?.length, 'recurring paychecks');
      if (data && data.length > 0) {
        console.log('[useRecurringPaychecks] First recurring paycheck:', data[0]);
      }
      setRecurringPaychecks(data || []);
      return { data, error: null };
    } catch (err) {
      console.error('[useRecurringPaychecks] Exception:', err);
      setRecurringPaychecks([]);
      return { data: null, error: err as Error };
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createRecurringPaycheck = useCallback(async (data: {
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
    console.log('[useRecurringPaychecks] Creating recurring paycheck:', JSON.stringify(data, null, 2));
    
    if (!user) {
      console.error('[useRecurringPaychecks] User not authenticated');
      return { data: null, error: new Error('User not authenticated') };
    }

    try {
      const insertData = {
        user_id: user.id,
        ...data,
      };

      console.log('[useRecurringPaychecks] Inserting:', JSON.stringify(insertData, null, 2));

      const { data: recurringPaycheck, error } = await supabase
        .from('recurring_paychecks')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[useRecurringPaychecks] Create error:', error);
        throw error;
      }

      console.log('[useRecurringPaychecks] Created successfully:', recurringPaycheck);
      await loadRecurringPaychecks();
      return { data: recurringPaycheck, error: null };
    } catch (err) {
      console.error('[useRecurringPaychecks] Exception:', err);
      return { data: null, error: err as Error };
    }
  }, [user, loadRecurringPaychecks]);

  const updateRecurringPaycheck = useCallback(async (id: string, data: Partial<RecurringPaycheck>) => {
    console.log('[useRecurringPaychecks] Updating recurring paycheck:', id, JSON.stringify(data, null, 2));

    if (!user) {
      console.error('[useRecurringPaychecks] User not authenticated');
      return { data: null, error: new Error('User not authenticated') };
    }

    try {
      const { data: updated, error } = await supabase
        .from('recurring_paychecks')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[useRecurringPaychecks] Update error:', error);
        throw error;
      }

      console.log('[useRecurringPaychecks] Updated successfully:', updated);
      await loadRecurringPaychecks();
      return { data: updated, error: null };
    } catch (err) {
      console.error('[useRecurringPaychecks] Exception:', err);
      return { data: null, error: err as Error };
    }
  }, [user, loadRecurringPaychecks]);

  const deleteRecurringPaycheck = useCallback(async (id: string) => {
    console.log('[useRecurringPaychecks] Deleting recurring paycheck:', id);

    if (!user) {
      console.error('[useRecurringPaychecks] User not authenticated');
      return { error: new Error('User not authenticated') };
    }

    try {
      const { error } = await supabase
        .from('recurring_paychecks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[useRecurringPaychecks] Delete error:', error);
        throw error;
      }

      console.log('[useRecurringPaychecks] Deleted successfully');
      await loadRecurringPaychecks();
      return { error: null };
    } catch (err) {
      console.error('[useRecurringPaychecks] Exception:', err);
      return { error: err as Error };
    }
  }, [user, loadRecurringPaychecks]);

  return {
    recurringPaychecks,
    loading,
    loadRecurringPaychecks,
    createRecurringPaycheck,
    updateRecurringPaycheck,
    deleteRecurringPaycheck,
  };
}
