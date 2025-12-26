import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export const usePaymentOperations = (userId: string | undefined, loadBills: () => Promise<void>) => {
  const addBillPayment = useCallback(async (
    billId: string,
    amount: number,
    paymentDate: string,
    appliedMonthYear?: string,
    isPaid: boolean = false
  ) => {
    console.log('[addBillPayment] Starting payment creation:', {
      billId,
      amount,
      paymentDate,
      appliedMonthYear,
      isPaid,
      userId,
    });

    if (!userId) {
      console.error('[addBillPayment] User not authenticated');
      return { data: null, error: new Error('User not authenticated') };
    }

    try {
      const { data, error } = await supabase
        .from('bill_payments')
        .insert({
          bill_id: billId,
          user_id: userId,
          amount,
          payment_date: paymentDate,
          applied_month_year: appliedMonthYear,
          is_paid: isPaid,
        })
        .select()
        .single();

      if (error) {
        console.error('[addBillPayment] Supabase error:', error);
        throw error;
      }

      console.log('[addBillPayment] Payment created successfully:', data);

      // Refresh bills to update payment totals
      await loadBills();

      return { data, error: null };
    } catch (err) {
      console.error('[addBillPayment] Exception caught:', err);
      return { data: null, error: err as Error };
    }
  }, [userId, loadBills]);

  const updateBillPayment = useCallback(async (
    paymentId: string,
    amount: number,
    paymentDate: string,
    appliedMonthYear?: string,
    isPaid?: boolean
  ) => {
    console.log('[updateBillPayment] Starting payment update:', {
      paymentId,
      amount,
      paymentDate,
      appliedMonthYear,
      isPaid,
      userId,
    });

    if (!userId) {
      console.error('[updateBillPayment] User not authenticated');
      return { data: null, error: new Error('User not authenticated') };
    }

    try {
      const updateData: any = {
        amount,
        payment_date: paymentDate,
      };
      if (appliedMonthYear !== undefined) updateData.applied_month_year = appliedMonthYear;
      if (isPaid !== undefined) updateData.is_paid = isPaid;

      const { data, error } = await supabase
        .from('bill_payments')
        .update(updateData)
        .eq('id', paymentId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('[updateBillPayment] Supabase error:', error);
        throw error;
      }

      console.log('[updateBillPayment] Payment updated successfully:', data);

      // Refresh bills to update payment totals
      await loadBills();

      return { data, error: null };
    } catch (err) {
      console.error('[updateBillPayment] Exception caught:', err);
      return { data: null, error: err as Error };
    }
  }, [userId, loadBills]);

  const deleteBillPayment = useCallback(async (paymentId: string) => {
    console.log('[deleteBillPayment] Starting payment deletion:', {
      paymentId,
      userId,
    });

    if (!userId) {
      console.error('[deleteBillPayment] User not authenticated');
      return { error: new Error('User not authenticated') };
    }

    try {
      const { error } = await supabase
        .from('bill_payments')
        .delete()
        .eq('id', paymentId)
        .eq('user_id', userId);

      if (error) {
        console.error('[deleteBillPayment] Supabase error:', error);
        throw error;
      }

      console.log('[deleteBillPayment] Payment deleted successfully');

      await loadBills();
      return { error: null };
    } catch (err) {
      console.error('[deleteBillPayment] Exception caught:', err);
      return { error: err as Error };
    }
  }, [userId, loadBills]);

  const markPaymentAsPaid = useCallback(async (paymentId: string) => {
    console.log('[markPaymentAsPaid] Marking payment as paid:', {
      paymentId,
      userId,
    });

    if (!userId) {
      console.error('[markPaymentAsPaid] User not authenticated');
      return { error: new Error('User not authenticated') };
    }

    try {
      const { error } = await supabase
        .from('bill_payments')
        .update({ is_paid: true })
        .eq('id', paymentId)
        .eq('user_id', userId);

      if (error) {
        console.error('[markPaymentAsPaid] Supabase error:', error);
        throw error;
      }

      console.log('[markPaymentAsPaid] Payment marked as paid successfully');

      await loadBills();
      return { error: null };
    } catch (err) {
      console.error('[markPaymentAsPaid] Exception caught:', err);
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
