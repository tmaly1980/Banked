import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ExpenseType } from '@/types';

export const useExpenseOperations = (
  userId: string | undefined, 
  loadExpenseTypes: () => Promise<void>,
  loadWeeklyExpenses: () => Promise<void>
) => {
  const createOrUpdateExpenseType = useCallback(async (
    name: string,
    defaultAmount?: number
  ) => {
    if (!userId) return { data: null, error: new Error('User not authenticated') };

    try {
      // Check if expense type already exists
      const { data: existing } = await supabase
        .from('expense_types')
        .select('*')
        .eq('user_id', userId)
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
            user_id: userId,
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
  }, [userId, loadExpenseTypes]);

  const saveWeeklyExpenses = useCallback(async (
    weekStartDate: string,
    expenses: Array<{ expense_type_id: string | null; expense_type_name: string; amount: number }>
  ) => {
    if (!userId) throw new Error('User not authenticated');

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
        .eq('user_id', userId)
        .eq('week_start_date', weekStartDate);

      // Insert new weekly expenses
      const weeklyExpensesData = expenses.map(expense => ({
        user_id: userId,
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
  }, [userId, createOrUpdateExpenseType, loadWeeklyExpenses]);

  return {
    createOrUpdateExpenseType,
    saveWeeklyExpenses,
  };
};
