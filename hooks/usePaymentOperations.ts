import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export const usePaymentOperations = (userId: string | undefined, loadBills: () => Promise<void>) => {
  const addBillPayment = useCallback(async (
    billId: string,
    amount: number,
    paymentDate: string,
    appliedDate?: string,
    isPaid: boolean = false
  ) => {
    if (!userId) return { data: null, error: new Error('User not authenticated') };

    try {
      const { data, error } = await supabase
        .from('bill_payments')
        .insert({
          bill_id: billId,
          user_id: userId,
          amount,
          payment_date: paymentDate,
          applied_date: appliedDate,
          is_paid: isPaid,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh bills to update payment totals
      await loadBills();

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }, [userId, loadBills]);

  const updateBillPayment = useCallback(async (
    paymentId: string,
    amount: number,
    paymentDate: string,
    appliedDate?: string,
    isPaid?: boolean
  ) => {
    if (!userId) return { data: null, error: new Error('User not authenticated') };

    try {
      const updateData: any = {
        amount,
        payment_date: paymentDate,
      };
      if (appliedDate !== undefined) updateData.applied_date = appliedDate;
      if (isPaid !== undefined) updateData.is_paid = isPaid;

      const { data, error } = await supabase
        .from('bill_payments')
        .update(updateData)
        .eq('id', paymentId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Refresh bills to update payment totals
      await loadBills();

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }, [userId, loadBills]);

  const deleteBillPayment = useCallback(async (paymentId: string) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('bill_payments')
        .delete()
        .eq('id', paymentId)
        .eq('user_id', userId);

      if (error) throw error;

      await loadBills();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [userId, loadBills]);

  const markPaymentAsPaid = useCallback(async (paymentId: string) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('bill_payments')
        .update({ is_paid: true })
        .eq('id', paymentId)
        .eq('user_id', userId);

      if (error) throw error;

      await loadBills();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [userId, loadBills]);

  return {
    addBillPayment,
    updateBillPayment,
    deleteBillPayment,
    markPaymentAsPaid,
  };
};
