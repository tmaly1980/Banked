import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface DeferredBill {
  id: string;
  user_id: string;
  name: string;
  amount: number | null;
  due_date?: string;
  due_day?: number;
  priority: 'low' | 'medium' | 'high';
  loss_risk_flag: boolean;
  alert_flag?: boolean;
  urgent_note?: string | null;
  is_variable?: boolean;
  category_id?: string | null;
  notes?: string;
  start_month_year?: string | null;
  end_month_year?: string | null;
  created_at: string;
  updated_at: string;
  last_payment_date?: string;
  total_paid?: number;
  partial_payment?: number;
  remaining_amount?: number;
  statement_date?: string;
  statement_balance?: number;
  statement_minimum_due?: number;
  updated_balance?: number;
  deferred_month_year?: string;
  decide_by_date?: string;
  loss_date?: string;
  deferment_reason?: string;
  deferment_created_at?: string;
  is_deferred_active: boolean;
  next_due_date?: string;
  is_overdue?: boolean;
}

export function useDeferredBills() {
  const { user } = useAuth();
  const [deferredBills, setDeferredBills] = useState<DeferredBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDeferredBills = useCallback(async () => {
    if (!user) {
      setDeferredBills([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('deferred_bills_view')
        .select('*');

      if (queryError) throw queryError;

      setDeferredBills(data || []);
    } catch (err) {
      console.error('Error loading deferred bills:', err);
      setError(err instanceof Error ? err.message : 'Failed to load deferred bills');
      setDeferredBills([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDeferredBills();
  }, [loadDeferredBills]);

  return {
    deferredBills,
    loading,
    error,
    refreshDeferredBills: loadDeferredBills,
  };
}
