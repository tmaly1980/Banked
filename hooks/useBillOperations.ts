import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { BillPayment } from '@/types';
import { Bill } from '@/models/BillModel';

export const useBillOperations = (userId: string | undefined, loadBills: () => Promise<void>) => {
  const loadBillPayments = useCallback(async (billId: string): Promise<BillPayment[]> => {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('bill_payments')
        .select('*')
        .eq('bill_id', billId)
        .eq('user_id', userId)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (err) {
      console.error('Error loading bill payments:', err);
      return [];
    }
  }, [userId]);

  const createBill = useCallback(async (
    bill: Omit<Bill, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    if (!userId) return { data: null, error: new Error('User not authenticated') };

    try {
      const { data, error } = await supabase
        .from('bills')
        .insert({
          ...bill,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh bills to include the new one
      await loadBills();

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }, [userId, loadBills]);

  const updateBill = useCallback(async (id: string, updates: Partial<Bill>) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('bills')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      // Refresh bills
      await loadBills();

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [userId, loadBills]);

  const deleteBill = useCallback(async (id: string) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      // Delete associated payments first
      await supabase
        .from('bill_payments')
        .delete()
        .eq('bill_id', id)
        .eq('user_id', userId);

      // Delete the bill
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      // Refresh bills
      await loadBills();

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [userId, loadBills]);

  return {
    loadBillPayments,
    createBill,
    updateBill,
    deleteBill,
  };
};
