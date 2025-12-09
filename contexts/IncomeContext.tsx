import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { IncomeSource } from '@/types';

interface IncomeContextType {
  incomeSources: IncomeSource[];
  loadIncomeSources: () => Promise<void>;
  addIncomeSource: (source: Omit<IncomeSource, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateIncomeSource: (id: string, updates: Partial<Omit<IncomeSource, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<void>;
  deleteIncomeSource: (id: string) => Promise<void>;
  getTotalPendingEarnings: () => number;
}

const IncomeContext = createContext<IncomeContextType | undefined>(undefined);

export function IncomeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);

  const loadIncomeSources = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('income_sources')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setIncomeSources(data || []);
    } catch (err) {
      console.error('Error loading income sources:', err);
    }
  };

  const addIncomeSource = async (source: Omit<IncomeSource, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('income_sources')
        .insert([{ ...source, user_id: user.id }]);

      if (error) throw error;
      await loadIncomeSources();
    } catch (err) {
      console.error('Error adding income source:', err);
      throw err;
    }
  };

  const updateIncomeSource = async (id: string, updates: Partial<Omit<IncomeSource, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('income_sources')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      await loadIncomeSources();
    } catch (err) {
      console.error('Error updating income source:', err);
      throw err;
    }
  };

  const deleteIncomeSource = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('income_sources')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      await loadIncomeSources();
    } catch (err) {
      console.error('Error deleting income source:', err);
      throw err;
    }
  };

  const getTotalPendingEarnings = () => {
    return incomeSources.reduce((sum, source) => sum + (source.pending_earnings || 0), 0);
  };

  useEffect(() => {
    loadIncomeSources();
  }, [user]);

  return (
    <IncomeContext.Provider
      value={{
        incomeSources,
        loadIncomeSources,
        addIncomeSource,
        updateIncomeSource,
        deleteIncomeSource,
        getTotalPendingEarnings,
      }}
    >
      {children}
    </IncomeContext.Provider>
  );
}

export function useIncome() {
  const context = useContext(IncomeContext);
  if (context === undefined) {
    throw new Error('useIncome must be used within an IncomeProvider');
  }
  return context;
}
