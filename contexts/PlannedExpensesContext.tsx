import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { PlannedExpense } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface PlannedExpensesContextType {
  plannedExpenses: PlannedExpense[];
  loading: boolean;
  error: string | null;
  loadPlannedExpenses: () => Promise<void>;
  createPlannedExpense: (expense: Omit<PlannedExpense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ data: PlannedExpense | null; error: Error | null }>;
  updatePlannedExpense: (id: string, updates: Partial<PlannedExpense>) => Promise<{ error: Error | null }>;
  deletePlannedExpense: (id: string) => Promise<{ error: Error | null }>;
  refreshData: () => Promise<void>;
}

const PlannedExpensesContext = createContext<PlannedExpensesContextType | undefined>(undefined);

export const PlannedExpensesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlannedExpenses = useCallback(async () => {
    if (!user) {
      setPlannedExpenses([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('planned_expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('planned_date', { ascending: true });

      if (fetchError) throw fetchError;

      setPlannedExpenses(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load planned expenses';
      setError(errorMessage);
      console.error('Error loading planned expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createPlannedExpense = useCallback(async (
    expense: Omit<PlannedExpense, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<{ data: PlannedExpense | null; error: Error | null }> => {
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    try {
      const { data, error: insertError } = await supabase
        .from('planned_expenses')
        .insert([{ ...expense, user_id: user.id }])
        .select()
        .single();

      if (insertError) throw insertError;

      await loadPlannedExpenses();
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create planned expense');
      console.error('Error creating planned expense:', err);
      return { data: null, error };
    }
  }, [user, loadPlannedExpenses]);

  const updatePlannedExpense = useCallback(async (
    id: string,
    updates: Partial<PlannedExpense>
  ): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    try {
      const { error: updateError } = await supabase
        .from('planned_expenses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await loadPlannedExpenses();
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update planned expense');
      console.error('Error updating planned expense:', err);
      return { error };
    }
  }, [user, loadPlannedExpenses]);

  const deletePlannedExpense = useCallback(async (id: string): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    try {
      const { error: deleteError } = await supabase
        .from('planned_expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      await loadPlannedExpenses();
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete planned expense');
      console.error('Error deleting planned expense:', err);
      return { error };
    }
  }, [user, loadPlannedExpenses]);

  const refreshData = useCallback(async () => {
    await loadPlannedExpenses();
  }, [loadPlannedExpenses]);

  const value: PlannedExpensesContextType = {
    plannedExpenses,
    loading,
    error,
    loadPlannedExpenses,
    createPlannedExpense,
    updatePlannedExpense,
    deletePlannedExpense,
    refreshData,
  };

  return (
    <PlannedExpensesContext.Provider value={value}>
      {children}
    </PlannedExpensesContext.Provider>
  );
};

export const usePlannedExpenses = () => {
  const context = useContext(PlannedExpensesContext);
  if (context === undefined) {
    throw new Error('usePlannedExpenses must be used within a PlannedExpensesProvider');
  }
  return context;
};
