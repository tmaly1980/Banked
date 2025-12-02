import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Bill, BillPayment, Paycheck } from '@/types';
import { BillModel } from '@/models/BillModel';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface BillsContextType {
  bills: BillModel[];
  paychecks: Paycheck[];
  loading: boolean;
  error: string | null;
  loadBills: () => Promise<void>;
  loadPaychecks: () => Promise<void>;
  loadBillPayments: (billId: string) => Promise<BillPayment[]>;
  createBill: (bill: Omit<Bill, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ data: Bill | null; error: Error | null }>;
  updateBill: (id: string, updates: Partial<Bill>) => Promise<{ error: Error | null }>;
  deleteBill: (id: string) => Promise<{ error: Error | null }>;
  createPaycheck: (paycheck: Omit<Paycheck, 'id' | 'user_id' | 'created_at'>) => Promise<{ data: Paycheck | null; error: Error | null }>;
  updatePaycheck: (id: string, updates: Partial<Paycheck>) => Promise<{ error: Error | null }>;
  deletePaycheck: (id: string) => Promise<{ error: Error | null }>;
  addBillPayment: (billId: string, amount: number, appliedDate: string) => Promise<{ data: BillPayment | null; error: Error | null }>;
  refreshData: () => Promise<void>;
}

const BillsContext = createContext<BillsContextType | undefined>(undefined);

export const BillsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [bills, setBills] = useState<BillModel[]>([]);
  const [paychecks, setPaychecks] = useState<Paycheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBills = useCallback(async () => {
    if (!user) {
      setBills([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch bills
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (billsError) throw billsError;

      // Fetch all payments for these bills
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('bill_payments')
        .select('*')
        .eq('user_id', user.id);

      if (paymentsError) throw paymentsError;

      // Group payments by bill_id
      const paymentsByBill: { [key: string]: BillPayment[] } = {};
      paymentsData?.forEach((payment) => {
        if (!paymentsByBill[payment.bill_id]) {
          paymentsByBill[payment.bill_id] = [];
        }
        paymentsByBill[payment.bill_id].push(payment);
      });

      // Create BillModel instances
      const billModels = billsData?.map((bill) =>
        BillModel.fromDatabase(bill, paymentsByBill[bill.id] || [])
      ) || [];

      setBills(billModels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bills');
      console.error('Error loading bills:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadPaychecks = useCallback(async () => {
    if (!user) {
      setPaychecks([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: paychecksError } = await supabase
        .from('paychecks')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (paychecksError) throw paychecksError;

      setPaychecks(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load paychecks');
      console.error('Error loading paychecks:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadBillPayments = useCallback(async (billId: string): Promise<BillPayment[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('bill_payments')
        .select('*')
        .eq('bill_id', billId)
        .eq('user_id', user.id)
        .order('applied_date', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (err) {
      console.error('Error loading bill payments:', err);
      return [];
    }
  }, [user]);

  const createBill = useCallback(async (
    bill: Omit<Bill, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    if (!user) return { data: null, error: new Error('User not authenticated') };

    try {
      const { data, error } = await supabase
        .from('bills')
        .insert({
          ...bill,
          user_id: user.id,
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
  }, [user, loadBills]);

  const updateBill = useCallback(async (id: string, updates: Partial<Bill>) => {
    if (!user) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('bills')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh bills
      await loadBills();

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [user, loadBills]);

  const deleteBill = useCallback(async (id: string) => {
    if (!user) return { error: new Error('User not authenticated') };

    try {
      // Delete associated payments first
      await supabase
        .from('bill_payments')
        .delete()
        .eq('bill_id', id)
        .eq('user_id', user.id);

      // Delete the bill
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh bills
      await loadBills();

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [user, loadBills]);

  const createPaycheck = useCallback(async (
    paycheck: Omit<Paycheck, 'id' | 'user_id' | 'created_at'>
  ) => {
    if (!user) return { data: null, error: new Error('User not authenticated') };

    try {
      const { data, error } = await supabase
        .from('paychecks')
        .insert({
          ...paycheck,
          user_id: user.id,
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
  }, [user, loadPaychecks]);

  const updatePaycheck = useCallback(async (id: string, updates: Partial<Paycheck>) => {
    if (!user) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('paychecks')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh paychecks
      await loadPaychecks();

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [user, loadPaychecks]);

  const deletePaycheck = useCallback(async (id: string) => {
    if (!user) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('paychecks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh paychecks
      await loadPaychecks();

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [user, loadPaychecks]);

  const addBillPayment = useCallback(async (
    billId: string,
    amount: number,
    appliedDate: string
  ) => {
    if (!user) return { data: null, error: new Error('User not authenticated') };

    try {
      const { data, error } = await supabase
        .from('bill_payments')
        .insert({
          bill_id: billId,
          user_id: user.id,
          amount,
          applied_date: appliedDate,
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
  }, [user, loadBills]);

  const refreshData = useCallback(async () => {
    await Promise.all([loadBills(), loadPaychecks()]);
  }, [loadBills, loadPaychecks]);

  const value = {
    bills,
    paychecks,
    loading,
    error,
    loadBills,
    loadPaychecks,
    loadBillPayments,
    createBill,
    updateBill,
    deleteBill,
    createPaycheck,
    updatePaycheck,
    deletePaycheck,
    addBillPayment,
    refreshData,
  };

  return <BillsContext.Provider value={value}>{children}</BillsContext.Provider>;
};

export const useBills = () => {
  const context = useContext(BillsContext);
  if (context === undefined) {
    throw new Error('useBills must be used within a BillsProvider');
  }
  return context;
};
