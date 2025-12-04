import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { BillPayment, Paycheck, ExpenseType, ExpenseBudget, GigWithPaychecks, Gig, ExpensePurchase } from '@/types';
import { BillModel, Bill } from '@/models/BillModel';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useBillOperations } from '@/hooks/useBillOperations';
import { usePaymentOperations } from '@/hooks/usePaymentOperations';
import { usePaycheckOperations } from '@/hooks/usePaycheckOperations';
import { useExpenseOperations } from '@/hooks/useExpenseOperations';
import { useGigOperations } from '@/hooks/useGigOperations';
import { useRealtimeSubscriptions } from '@/hooks/useRealtimeSubscriptions';

interface BillsContextType {
  bills: BillModel[];
  paychecks: Paycheck[];
  expenseTypes: ExpenseType[];
  expenseBudgets: ExpenseBudget[];
  expensePurchases: ExpensePurchase[];
  gigs: GigWithPaychecks[];
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
  loadExpenseBudgets: () => Promise<void>;
  loadExpensePurchases: () => Promise<void>;
  createOrUpdateExpenseType: (name: string, defaultAmount?: number) => Promise<{ data: ExpenseType | null; error: Error | null }>;
  saveExpenseBudgets: (startDate: string, expenses: Array<{ expense_type_id: string | null; expense_type_name: string; allocated_amount: number; spent_amount?: number }>) => Promise<void>;
  createExpenseBudget: (data: { expense_type_name: string; start_date: string; end_date?: string; allocated_amount: number; spent_amount?: number }) => Promise<{ data: ExpenseBudget | null; error: Error | null }>;
  updateExpenseBudget: (id: string, updates: { allocated_amount?: number; spent_amount?: number; end_date?: string }) => Promise<{ error: Error | null }>;
  deleteExpenseBudget: (id: string) => Promise<{ error: Error | null }>;
  createExpensePurchase: (data: { expense_type_id: string; amount: number; date: string; notes?: string }) => Promise<{ data: ExpensePurchase | null; error: Error | null }>;
  updateExpensePurchase: (id: string, updates: { amount?: number; date?: string; notes?: string }) => Promise<{ error: Error | null }>;
  deleteExpensePurchase: (id: string) => Promise<{ error: Error | null }>;
  loadGigs: () => Promise<void>;
  createGig: (gig: Omit<Gig, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ data: Gig | null; error: Error | null }>;
  updateGig: (id: string, updates: Partial<Gig>) => Promise<{ error: Error | null }>;
  deleteGig: (id: string) => Promise<{ error: Error | null }>;
  linkPaycheckToGig: (gigId: string, paycheckId: string) => Promise<{ error: Error | null }>;
  unlinkPaycheckFromGig: (gigId: string, paycheckId: string) => Promise<{ error: Error | null }>;
  refreshData: () => Promise<void>;
}

const BillsContext = createContext<BillsContextType | undefined>(undefined);

export const BillsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [bills, setBills] = useState<BillModel[]>([]);
  const [paychecks, setPaychecks] = useState<Paycheck[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [expenseBudgets, setExpenseBudgets] = useState<ExpenseBudget[]>([]);
  const [expensePurchases, setExpensePurchases] = useState<ExpensePurchase[]>([]);
  const [gigs, setGigs] = useState<GigWithPaychecks[]>([]);
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
    try {
      const { data, error } = await supabase
        .from('expense_types')
        .select('*')
        .order('order', { ascending: true });

      if (error) throw error;
      setExpenseTypes(data || []);
    } catch (err) {
      console.error('[BillsContext] Error loading expense types:', err);
    }
  }, []);

  const loadExpenseBudgets = useCallback(async () => {
    if (!user) {
      setExpenseBudgets([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('expense_budgets')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setExpenseBudgets(data || []);
    } catch (err) {
      console.error('[BillsContext] Error loading expense budgets:', err);
    }
  }, [user]);

  const loadExpensePurchases = useCallback(async () => {
    if (!user) {
      setExpensePurchases([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('expense_purchases')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setExpensePurchases(data || []);
    } catch (err) {
      console.error('[BillsContext] Error loading expense purchases:', err);
    }
  }, [user]);

  const loadGigs = useCallback(async () => {
    if (!user) {
      setGigs([]);
      return;
    }

    try {
      // Load gigs
      const { data: gigsData, error: gigsError } = await supabase
        .from('gigs')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      if (gigsError) throw gigsError;

      // Load gig-paycheck relationships
      const { data: gigPaychecksData, error: gpError } = await supabase
        .from('gig_paychecks')
        .select('*');

      if (gpError) throw gpError;

      // Load paychecks
      const { data: paychecksData, error: paychecksError } = await supabase
        .from('paychecks')
        .select('*')
        .eq('user_id', user.id);

      if (paychecksError) throw paychecksError;

      // Combine data
      const gigsWithPaychecks: GigWithPaychecks[] = (gigsData || []).map(gig => {
        const linkedPaycheckIds = (gigPaychecksData || [])
          .filter(gp => gp.gig_id === gig.id)
          .map(gp => gp.paycheck_id);
        
        const linkedPaychecks = (paychecksData || [])
          .filter(pc => linkedPaycheckIds.includes(pc.id));

        return {
          ...gig,
          paychecks: linkedPaychecks,
        };
      });

      setGigs(gigsWithPaychecks);
    } catch (err) {
      console.error('[BillsContext] Error loading gigs:', err);
    }
  }, [user]);

  const refreshData = useCallback(async () => {
    await Promise.all([loadBills(), loadPaychecks(), loadExpenseTypes(), loadExpenseBudgets(), loadExpensePurchases(), loadGigs()]);
  }, [loadBills, loadPaychecks, loadExpenseTypes, loadExpenseBudgets, loadExpensePurchases, loadGigs]);

  // Use custom hooks for operations
  const billOps = useBillOperations(user?.id, loadBills);
  const paymentOps = usePaymentOperations(user?.id, loadBills);
  const paycheckOps = usePaycheckOperations(user?.id, loadPaychecks);
  const expenseOps = useExpenseOperations(user?.id, loadExpenseTypes, loadExpenseBudgets, loadExpensePurchases);
  const gigOps = useGigOperations(user?.id, loadGigs);
  
  // Setup realtime subscriptions
  useRealtimeSubscriptions(user?.id, loadBills);

  const value = {
    bills,
    paychecks,
    expenseTypes,
    expenseBudgets,
    expensePurchases,
    gigs,
    loading,
    error,
    loadBills,
    loadPaychecks,
    ...billOps,
    ...paycheckOps,
    ...paymentOps,
    ...expenseOps,
    ...gigOps,
    loadExpenseTypes,
    loadExpenseBudgets,
    loadExpensePurchases,
    loadGigs,
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
