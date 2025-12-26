import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { BillPayment, Deposit, ExpenseType, ExpenseBudget, GigWithDeposits, Gig, ExpensePurchase } from '@/types';
import { BillModel, Bill } from '@/models/BillModel';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useBillOperations } from '@/hooks/useBillOperations';
import { usePaymentOperations } from '@/hooks/usePaymentOperations';
import { useDepositOperations } from '@/hooks/useDepositOperations';
import { useExpenseOperations } from '@/hooks/useExpenseOperations';
import { useGigOperations } from '@/hooks/useGigOperations';
import { useRealtimeSubscriptions } from '@/hooks/useRealtimeSubscriptions';

interface BillsContextType {
  bills: BillModel[];
  overdueBills: BillModel[];
  deposits: Deposit[];
  expenseTypes: ExpenseType[];
  expenseBudgets: ExpenseBudget[];
  expensePurchases: ExpensePurchase[];
  gigs: GigWithDeposits[];
  loading: boolean;
  error: string | null;
  loadBills: () => Promise<void>;
  loadOverdueBills: () => Promise<void>;
  loadDeposits: () => Promise<void>;
  loadBillPayments: (billId: string) => Promise<BillPayment[]>;
  createBill: (bill: Omit<Bill, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ data: Bill | null; error: Error | null }>;
  updateBill: (id: string, updates: Partial<Bill>) => Promise<{ error: Error | null }>;
  deleteBill: (id: string) => Promise<{ error: Error | null }>;
  createBillStatement: (billId: string, balance: number, minimumDue?: number, statementDate?: string) => Promise<{ error: Error | null }>;
  getLatestBillStatement: (billId: string) => Promise<{ statement_balance?: number; statement_minimum_due?: number; statement_date?: string; updated_balance?: number } | null>;
  createDeposit: (deposit: Omit<Deposit, 'id' | 'user_id' | 'created_at'>) => Promise<{ data: Deposit | null; error: Error | null }>;
  updateDeposit: (id: string, updates: Partial<Deposit>) => Promise<{ error: Error | null }>;
  deleteDeposit: (id: string) => Promise<{ error: Error | null }>;
  addBillPayment: (billId: string, amount: number, paymentDate: string, appliedMonthYear?: string, isPaid?: boolean) => Promise<{ data: BillPayment | null; error: Error | null }>;
  updateBillPayment: (paymentId: string, amount: number, paymentDate: string, appliedMonthYear?: string, isPaid?: boolean) => Promise<{ data: BillPayment | null; error: Error | null }>;
  deleteBillPayment: (paymentId: string) => Promise<{ error: Error | null }>;
  markPaymentAsPaid: (paymentId: string) => Promise<{ error: Error | null }>;
  loadExpenseTypes: () => Promise<void>;
  loadExpenseBudgets: () => Promise<void>;
  loadExpensePurchases: () => Promise<void>;
  createOrUpdateExpenseType: (name: string, defaultAmount?: number) => Promise<{ data: ExpenseType | null; error: Error | null }>;
  saveExpenseBudgets: (startDate: string, expenses: Array<{ expense_type_id: string; amount: number }>) => Promise<void>;
  createExpenseBudget: (data: { 
    expense_type_id: string; 
    effective_from: string; 
    effective_to?: string; 
    start_mmdd?: string; 
    end_mmdd?: string; 
    frequency: 'once' | 'weekly' | 'monthly' | 'yearly'; 
    amount: number; 
    notes?: string 
  }) => Promise<{ data: ExpenseBudget | null; error: Error | null }>;
  updateExpenseBudget: (id: string, updates: { 
    effective_from?: string; 
    effective_to?: string; 
    start_mmdd?: string; 
    end_mmdd?: string; 
    frequency?: 'once' | 'weekly' | 'monthly' | 'yearly'; 
    amount?: number; 
    notes?: string 
  }) => Promise<{ error: Error | null }>;
  deleteExpenseBudget: (id: string) => Promise<{ error: Error | null }>;
  createExpensePurchase: (data: { expense_type_id: string; description?: string; amount?: number; purchase_date?: string }) => Promise<{ data: ExpensePurchase | null; error: Error | null }>;
  updateExpensePurchase: (id: string, updates: { description?: string; estimated_amount?: number; purchase_amount?: number; purchase_date?: string; checklist?: any[]; photos?: string[] }) => Promise<{ error: Error | null }>;
  deleteExpensePurchase: (id: string) => Promise<{ error: Error | null }>;
  loadGigs: () => Promise<void>;
  createGig: (gig: Omit<Gig, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ data: Gig | null; error: Error | null }>;
  updateGig: (id: string, updates: Partial<Gig>) => Promise<{ error: Error | null }>;
  deleteGig: (id: string) => Promise<{ error: Error | null }>;
  linkDepositToGig: (gigId: string, depositId: string) => Promise<{ error: Error | null }>;
  unlinkDepositFromGig: (gigId: string, depositId: string) => Promise<{ error: Error | null }>;
  refreshData: () => Promise<void>;
}

const BillsContext = createContext<BillsContextType | undefined>(undefined);

export const BillsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [bills, setBills] = useState<BillModel[]>([]);
  const [overdueBills, setOverdueBills] = useState<BillModel[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [expenseBudgets, setExpenseBudgets] = useState<ExpenseBudget[]>([]);
  const [expensePurchases, setExpensePurchases] = useState<ExpensePurchase[]>([]);
  const [gigs, setGigs] = useState<GigWithDeposits[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBillPayments = useCallback(async (billId: string): Promise<BillPayment[]> => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('bill_payments')
      .select('*')
      .eq('bill_id', billId)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error loading bill payments:', error);
      return [];
    }
    
    return data || [];
  }, [user]);

  const loadOverdueBills = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('user_bills_view')
        .select('*')
        .eq('is_overdue', true);

      if (error) {
        console.error('Error loading overdue bills:', error);
        setError(error.message);
        return;
      }

      if (data) {
        // Convert to BillModel instances with payments
        const overdueBillModels = await Promise.all(
          data.map(async (bill: any) => {
            const payments = await loadBillPayments(bill.id);
            return BillModel.fromDatabase(bill, payments);
          })
        );
        setOverdueBills(overdueBillModels);
      }
    } catch (err) {
      console.error('Error loading overdue bills:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [user?.id, loadBillPayments]);

  const loadBills = useCallback(async () => {
    if (!user) {
      setBills([]);
      return;
    }

    try {
      setError(null);

      // Use user_bills_view for calculated fields
      const { data: billsData, error: billsError } = await supabase
        .from('user_bills_view')
        .select('*');

      if (billsError) throw billsError;

      // Debug: Log first bill to see what fields we're getting
      if (billsData && billsData.length > 0) {
        console.log('[BillsContext] Sample bill from view:', billsData[0]);
      }

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

      // Fetch category names and alert_flag
      const billIds = billsData?.map(b => b.id) || [];
      const { data: categoriesData } = await supabase
        .from('bills')
        .select('id, category_id, is_variable, alert_flag, bill_categories(name)')
        .in('id', billIds);

      const categoriesByBillId: { [key: string]: string } = {};
      const variableFlagByBillId: { [key: string]: boolean } = {};
      const alertFlagByBillId: { [key: string]: boolean } = {};
      categoriesData?.forEach((item: any) => {
        if (item.bill_categories) {
          categoriesByBillId[item.id] = item.bill_categories.name;
        }
        variableFlagByBillId[item.id] = item.is_variable || false;
        alertFlagByBillId[item.id] = item.alert_flag || false;
      });

      // Fetch latest statements for variable bills
      const variableBillIds = billIds.filter(id => variableFlagByBillId[id]);
      const statementsByBillId: { [key: string]: any } = {};
      
      if (variableBillIds.length > 0) {
        // Get the latest statement for each variable bill
        const { data: statementsData } = await supabase
          .from('bill_statements')
          .select('*')
          .in('bill_id', variableBillIds)
          .order('statement_date', { ascending: false })
          .order('created_at', { ascending: false });

        // Group by bill_id and take the most recent
        statementsData?.forEach((statement) => {
          if (!statementsByBillId[statement.bill_id]) {
            statementsByBillId[statement.bill_id] = statement;
          }
        });

        // Calculate updated balance for each statement
        for (const billId of Object.keys(statementsByBillId)) {
          const statement = statementsByBillId[billId];
          const payments = paymentsByBill[billId] || [];
          
          // Sum payments made since statement date
          const totalPaidSinceStatement = payments
            .filter(p => p.payment_date >= statement.statement_date)
            .reduce((sum, p) => sum + (p.amount || 0), 0);
          
          statement.updated_balance = Math.max(0, statement.balance - totalPaidSinceStatement);
        }
      }

      // Create BillModel instances
      const billModels = billsData?.map((bill) => {
        const statement = statementsByBillId[bill.id];
        const isVariable = variableFlagByBillId[bill.id] || false;
        const alertFlag = alertFlagByBillId[bill.id] || false;
        return BillModel.fromDatabase({
          ...bill,
          is_variable: isVariable,
          alert_flag: alertFlag,
          category_name: categoriesByBillId[bill.id] || null,
          // Add statement fields if available
          ...(statement && {
            statement_balance: statement.balance,
            statement_minimum_due: statement.minimum_due,
            statement_date: statement.statement_date,
            updated_balance: statement.updated_balance,
          }),
        }, paymentsByBill[bill.id] || []);
      }) || [];

      setBills(billModels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bills');
      console.error('Error loading bills:', err);
    }
  }, [user]);

  const loadDeposits = useCallback(async () => {
    if (!user) {
      setDeposits([]);
      return;
    }

    try {
      setError(null);

      const { data, error: depositsError } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (depositsError) throw depositsError;

      setDeposits(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deposits');
      console.error('Error loading deposits:', err);
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
        .order('effective_from', { ascending: false });

      if (error) throw error;
      // Force new array reference to ensure React detects the change
      setExpenseBudgets([...(data || [])]);
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Force new array reference to ensure React detects the change
      setExpensePurchases([...(data || [])]);
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
        .order('due_date', { ascending: false });

      if (gigsError) throw gigsError;

      // Load gig-paycheck relationships
      const { data: gigPaychecksData, error: gpError } = await supabase
        .from('gig_paychecks')
        .select('*');

      if (gpError) throw gpError;

      // Load deposits
      const { data: depositsData, error: depositsError } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id);

      if (depositsError) throw depositsError;

      // Combine data
      const gigsWithDeposits: GigWithDeposits[] = (gigsData || []).map(gig => {
        const linkedPaycheckIds = (gigPaychecksData || [])
          .filter(gp => gp.gig_id === gig.id)
          .map(gp => gp.paycheck_id);
        
        const linkedDeposits = (depositsData || [])
          .filter(d => linkedPaycheckIds.includes(d.id));

        return {
          ...gig,
          deposits: linkedDeposits,
        };
      });

      setGigs(gigsWithDeposits);
    } catch (err) {
      console.error('[BillsContext] Error loading gigs:', err);
    }
  }, [user]);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadBills(),
        loadOverdueBills(), 
        loadDeposits(), 
        loadExpenseTypes(), 
        loadExpenseBudgets(), 
        loadExpensePurchases(), 
        loadGigs()
      ]);
    } catch (err) {
      console.error('[BillsContext] Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  }, [loadBills, loadOverdueBills, loadDeposits, loadExpenseTypes, loadExpenseBudgets, loadExpensePurchases, loadGigs]);

  // Use custom hooks for operations
  const billOps = useBillOperations(user?.id, loadBills);
  const paymentOps = usePaymentOperations(user?.id, loadBills);
  const depositOps = useDepositOperations(user?.id, loadDeposits);
  const expenseOps = useExpenseOperations(user?.id, loadExpenseTypes, loadExpenseBudgets, loadExpensePurchases);
  const gigOps = useGigOperations(user?.id, loadGigs);
  
  // Setup realtime subscriptions
  useRealtimeSubscriptions(user?.id, loadBills);

  // Initial data load when user becomes available
  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user, refreshData]);

  // Cleanup: Reset loading state on unmount or hot reload
  useEffect(() => {
    return () => {
      setLoading(false);
    };
  }, []);

  const value = {
    bills,
    overdueBills,
    deposits,
    expenseTypes,
    expenseBudgets,
    expensePurchases,
    gigs,
    loading,
    error,
    loadBills,
    loadOverdueBills,
    loadDeposits,
    ...billOps,
    ...depositOps,
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
