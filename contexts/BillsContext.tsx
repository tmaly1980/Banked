import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { BillPayment, Paycheck, ExpenseType, WeeklyExpense } from '@/types';
import { BillModel, Bill } from '@/models/BillModel';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface BillsContextType {
  bills: BillModel[];
  paychecks: Paycheck[];
  expenseTypes: ExpenseType[];
  weeklyExpenses: WeeklyExpense[];
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
  addBillPayment: (billId: string, amount: number, paymentDate: string) => Promise<{ data: BillPayment | null; error: Error | null }>;
  updateBillPayment: (paymentId: string, amount: number, paymentDate: string) => Promise<{ data: BillPayment | null; error: Error | null }>;
  loadExpenseTypes: () => Promise<void>;
  loadWeeklyExpenses: () => Promise<void>;
  createOrUpdateExpenseType: (name: string, defaultAmount?: number) => Promise<{ data: ExpenseType | null; error: Error | null }>;
  saveWeeklyExpenses: (weekStartDate: string, expenses: Array<{ expense_type_id: string | null; expense_type_name: string; amount: number }>) => Promise<void>;
  refreshData: () => Promise<void>;
}

const BillsContext = createContext<BillsContextType | undefined>(undefined);

export const BillsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [bills, setBills] = useState<BillModel[]>([]);
  const [paychecks, setPaychecks] = useState<Paycheck[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [weeklyExpenses, setWeeklyExpenses] = useState<WeeklyExpense[]>([]);
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
        .order('payment_date', { ascending: false });

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
    paymentDate: string
  ) => {
    if (!user) return { data: null, error: new Error('User not authenticated') };

    try {
      const { data, error } = await supabase
        .from('bill_payments')
        .insert({
          bill_id: billId,
          user_id: user.id,
          amount,
          payment_date: paymentDate,
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

  const updateBillPayment = useCallback(async (
    paymentId: string,
    amount: number,
    paymentDate: string
  ) => {
    if (!user) return { data: null, error: new Error('User not authenticated') };

    try {
      const { data, error } = await supabase
        .from('bill_payments')
        .update({
          amount,
          payment_date: paymentDate,
        })
        .eq('id', paymentId)
        .eq('user_id', user.id)
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
    await Promise.all([loadBills(), loadPaychecks(), loadExpenseTypes(), loadWeeklyExpenses()]);
  }, [loadBills, loadPaychecks]);

  const loadExpenseTypes = useCallback(async () => {
    if (!user) {
      setExpenseTypes([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('expense_types')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setExpenseTypes(data || []);
    } catch (err) {
      console.error('[BillsContext] Error loading expense types:', err);
    }
  }, [user]);

  const loadWeeklyExpenses = useCallback(async () => {
    if (!user) {
      setWeeklyExpenses([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('weekly_expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('week_start_date', { ascending: false });

      if (error) throw error;
      setWeeklyExpenses(data || []);
    } catch (err) {
      console.error('[BillsContext] Error loading weekly expenses:', err);
    }
  }, [user]);

  const createOrUpdateExpenseType = useCallback(async (
    name: string,
    defaultAmount?: number
  ) => {
    if (!user) return { data: null, error: new Error('User not authenticated') };

    try {
      // Check if expense type already exists
      const { data: existing } = await supabase
        .from('expense_types')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', name)
        .single();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('expense_types')
          .update({ default_amount: defaultAmount })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        await loadExpenseTypes();
        return { data, error: null };
      } else {
        // Create new
        const { data, error } = await supabase
          .from('expense_types')
          .insert({
            user_id: user.id,
            name,
            default_amount: defaultAmount,
          })
          .select()
          .single();

        if (error) throw error;
        await loadExpenseTypes();
        return { data, error: null };
      }
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }, [user, loadExpenseTypes]);

  const saveWeeklyExpenses = useCallback(async (
    weekStartDate: string,
    expenses: Array<{ expense_type_id: string | null; expense_type_name: string; amount: number }>
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // First, create any new expense types
      const expenseTypeMap = new Map<string, string>();
      
      for (const expense of expenses) {
        if (!expense.expense_type_id) {
          // Create new expense type
          const { data, error } = await createOrUpdateExpenseType(expense.expense_type_name);
          if (error) throw error;
          if (data) {
            expenseTypeMap.set(expense.expense_type_name, data.id);
          }
        } else {
          expenseTypeMap.set(expense.expense_type_name, expense.expense_type_id);
        }
      }

      // Delete existing weekly expenses for this week
      await supabase
        .from('weekly_expenses')
        .delete()
        .eq('user_id', user.id)
        .eq('week_start_date', weekStartDate);

      // Insert new weekly expenses
      const weeklyExpensesData = expenses.map(expense => ({
        user_id: user.id,
        expense_type_id: expense.expense_type_id || expenseTypeMap.get(expense.expense_type_name)!,
        week_start_date: weekStartDate,
        amount: expense.amount,
      }));

      const { error: insertError } = await supabase
        .from('weekly_expenses')
        .insert(weeklyExpensesData);

      if (insertError) throw insertError;

      await loadWeeklyExpenses();
    } catch (err) {
      throw err;
    }
  }, [user, createOrUpdateExpenseType, loadWeeklyExpenses]);

  const value = {
    bills,
    paychecks,
    expenseTypes,
    weeklyExpenses,
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
    updateBillPayment,
    loadExpenseTypes,
    loadWeeklyExpenses,
    createOrUpdateExpenseType,
    saveWeeklyExpenses,
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
