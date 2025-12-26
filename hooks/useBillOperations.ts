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

  const createBillStatement = useCallback(async (
    billId: string,
    balance: number,
    minimumDue?: number,
    statementDate?: string
  ) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('bill_statements')
        .insert({
          bill_id: billId,
          user_id: userId,
          balance,
          minimum_due: minimumDue || null,
          statement_date: statementDate || new Date().toISOString().split('T')[0],
        });

      if (error) throw error;

      // Refresh bills to update statement info
      await loadBills();

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [userId, loadBills]);

  const getLatestBillStatement = useCallback(async (billId: string) => {
    if (!userId) return null;

    try {
      // Get the latest statement
      const { data: statement, error: statementError } = await supabase
        .from('bill_statements')
        .select('*')
        .eq('bill_id', billId)
        .eq('user_id', userId)
        .order('statement_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (statementError || !statement) return null;

      // Calculate updated balance (statement balance - sum of payments since statement date)
      const { data: payments, error: paymentsError } = await supabase
        .from('bill_payments')
        .select('amount')
        .eq('bill_id', billId)
        .eq('user_id', userId)
        .gte('payment_date', statement.statement_date);

      if (paymentsError) throw paymentsError;

      const totalPaid = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const updatedBalance = statement.balance - totalPaid;

      return {
        statement_balance: statement.balance,
        statement_minimum_due: statement.minimum_due,
        statement_date: statement.statement_date,
        updated_balance: Math.max(0, updatedBalance), // Don't show negative balances
      };
    } catch (err) {
      console.error('Error getting latest bill statement:', err);
      return null;
    }
  }, [userId]);

  return {
    loadBillPayments,
    createBill,
    updateBill,
    deleteBill,
    createBillStatement,
    getLatestBillStatement,
  };
};
