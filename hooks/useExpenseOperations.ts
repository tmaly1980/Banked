import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ExpenseType, ExpenseBudget, ExpensePurchase } from '@/types';

export const useExpenseOperations = (
  userId: string | undefined, 
  loadExpenseTypes: () => Promise<void>,
  loadExpenseBudgets: () => Promise<void>,
  loadExpensePurchases: () => Promise<void>
) => {
  const createOrUpdateExpenseType = useCallback(async (
    name: string
  ) => {
    try {
      // Check if expense type already exists
      const { data: existing } = await supabase
        .from('expense_types')
        .select('*')
        .eq('name', name)
        .single();

      if (existing) {
        // Already exists, return it
        return { data: existing, error: null };
      } else {
        // Create new (order will auto-increment via sequence)
        const { data, error } = await supabase
          .from('expense_types')
          .insert({ name })
          .select()
          .single();

        if (error) throw error;
        await loadExpenseTypes();
        return { data, error: null };
      }
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }, [loadExpenseTypes]);

  const saveExpenseBudgets = useCallback(async (
    startDate: string,
    expenses: Array<{ expense_type_id: string; amount: number }>
  ) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      // Delete existing expense budgets for this week
      await supabase
        .from('expense_budgets')
        .delete()
        .eq('user_id', userId)
        .eq('start_date', startDate);

      // Insert new expense budgets
      const expenseBudgetsData = expenses.map(expense => ({
        user_id: userId,
        expense_type_id: expense.expense_type_id,
        start_date: startDate,
        amount: expense.amount,
      }));

      const { error: insertError } = await supabase
        .from('expense_budgets')
        .insert(expenseBudgetsData);

      if (insertError) throw insertError;

      await loadExpenseBudgets();
    } catch (err) {
      throw err;
    }
  }, [userId, loadExpenseBudgets]);

  const createExpenseBudget = useCallback(async (data: {
    expense_type_id: string;
    start_date: string;
    end_date?: string;
    amount: number;
  }) => {
    if (!userId) return { data: null, error: new Error('User not authenticated') };

    try {
      // Create the expense budget
      const { data: expenseBudget, error } = await supabase
        .from('expense_budgets')
        .insert({
          user_id: userId,
          expense_type_id: data.expense_type_id,
          start_date: data.start_date,
          end_date: data.end_date,
          amount: data.amount,
        })
        .select()
        .single();

      if (error) throw error;
      await loadExpenseBudgets();
      return { data: expenseBudget, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }, [userId, loadExpenseBudgets]);

  const updateExpenseBudget = useCallback(async (
    id: string,
    updates: {
      amount?: number;
      end_date?: string;
    }
  ) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('expense_budgets')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      await loadExpenseBudgets();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [userId, loadExpenseBudgets]);

  const deleteExpenseBudget = useCallback(async (id: string) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('expense_budgets')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      await loadExpenseBudgets();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [userId, loadExpenseBudgets]);

  const createExpensePurchase = useCallback(async (data: {
    expense_type_id: string;
    title?: string;
    estimated_amount?: number;
    notes?: string;
  }) => {
    if (!userId) return { data: null, error: new Error('User not authenticated') };

    try {
      const { data: purchase, error } = await supabase
        .from('expense_purchases')
        .insert({
          user_id: userId,
          expense_type_id: data.expense_type_id,
          title: data.title,
          estimated_amount: data.estimated_amount,
          notes: data.notes,
          checklist: [],
          photos: [],
        })
        .select()
        .single();

      if (error) throw error;
      await loadExpensePurchases();
      return { data: purchase, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }, [userId, loadExpensePurchases]);

  const updateExpensePurchase = useCallback(async (
    id: string,
    updates: {
      title?: string;
      estimated_amount?: number;
      purchase_amount?: number;
      purchase_date?: string;
      checklist?: any[];
      photos?: string[];
      notes?: string;
    }
  ) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('expense_purchases')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      await loadExpensePurchases();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [userId, loadExpensePurchases]);

  const deleteExpensePurchase = useCallback(async (id: string) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('expense_purchases')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      await loadExpensePurchases();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [userId, loadExpensePurchases]);

  return {
    createOrUpdateExpenseType,
    saveExpenseBudgets,
    createExpenseBudget,
    updateExpenseBudget,
    deleteExpenseBudget,
    createExpensePurchase,
    updateExpensePurchase,
    deleteExpensePurchase,
  };
};
