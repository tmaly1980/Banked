import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { BillPayment, Paycheck, ExpenseType, WeeklyExpense } from '@/types';
import { BillModel, Bill } from '@/models/BillModel';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useBillOperations } from '@/hooks/useBillOperations';
import { usePaymentOperations } from '@/hooks/usePaymentOperations';
import { usePaycheckOperations } from '@/hooks/usePaycheckOperations';
import { useExpenseOperations } from '@/hooks/useExpenseOperations';
import { useRealtimeSubscriptions } from '@/hooks/useRealtimeSubscriptions';

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
  addBillPayment: (billId: string, amount: number, paymentDate: string, appliedDate?: string, isPaid?: boolean) => Promise<{ data: BillPayment | null; error: Error | null }>;
  updateBillPayment: (paymentId: string, amount: number, paymentDate: string, appliedDate?: string, isPaid?: boolean) => Promise<{ data: BillPayment | null; error: Error | null }>;
  deleteBillPayment: (paymentId: string) => Promise<{ error: Error | null }>;
  markPaymentAsPaid: (paymentId: string) => Promise<{ error: Error | null }>;
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

  const refreshData = useCallback(async () => {
    await Promise.all([loadBills(), loadPaychecks(), loadExpenseTypes(), loadWeeklyExpenses()]);
  }, [loadBills, loadPaychecks, loadExpenseTypes, loadWeeklyExpenses]);

  // Use custom hooks for operations
  const billOps = useBillOperations(user?.id, loadBills);
  const paymentOps = usePaymentOperations(user?.id, loadBills);
  const paycheckOps = usePaycheckOperations(user?.id, loadPaychecks);
  const expenseOps = useExpenseOperations(user?.id, loadExpenseTypes, loadWeeklyExpenses);
  
  // Setup realtime subscriptions
  useRealtimeSubscriptions(user?.id, loadBills);

  const value = {
    bills,
    paychecks,
    expenseTypes,
    weeklyExpenses,
    loading,
    error,
    loadBills,
    loadPaychecks,
    ...billOps,
    ...paycheckOps,
    ...paymentOps,
    ...expenseOps,
    loadExpenseTypes,
    loadWeeklyExpenses,
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
