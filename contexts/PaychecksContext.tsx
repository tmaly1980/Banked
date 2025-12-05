import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useBills } from '@/contexts/BillsContext';
import { useRecurringPaychecks } from '@/hooks/useRecurringPaychecks';
import { Paycheck } from '@/types';
import { generateRecurringPaycheckInstances, formatDateForDB } from '@/utils/paycheckHelpers';
import { addWeeks } from 'date-fns';

// Extended Paycheck type for generated instances
export interface PaycheckInstance extends Omit<Paycheck, 'id' | 'created_at'> {
  id: string;
  isGenerated?: boolean;
  recurring_paycheck_id?: string;
  created_at: string;
}

interface PaychecksContextType {
  allPaycheckInstances: PaycheckInstance[];
  loading: boolean;
  refreshPaychecks: () => Promise<void>;
}

const PaychecksContext = createContext<PaychecksContextType | undefined>(undefined);

export function PaychecksProvider({ children }: { children: ReactNode }) {
  const { paychecks, loading: paychecksLoading, refreshData } = useBills();
  const { recurringPaychecks, loadRecurringPaychecks, loading: recurringLoading } = useRecurringPaychecks();

  useEffect(() => {
    const init = async () => {
      await refreshData();
      await loadRecurringPaychecks();
    };
    init();
  }, []);

  // Generate paycheck instances from recurring paychecks within 6-week range
  const allPaycheckInstances = useMemo(() => {
    const now = new Date();
    const rangeStart = now;
    const rangeEnd = addWeeks(now, 6);

    console.log('[PaychecksContext] Generating instances:', {
      rangeStart: formatDateForDB(rangeStart),
      rangeEnd: formatDateForDB(rangeEnd),
      recurringCount: recurringPaychecks.length,
      actualPaychecksCount: paychecks.length,
    });

    // Generate instances from recurring paychecks
    const generatedInstances: PaycheckInstance[] = [];
    
    recurringPaychecks.forEach(recurring => {
      console.log('[PaychecksContext] Processing recurring:', recurring.id, {
        amount: recurring.amount,
        start_date: recurring.start_date,
        end_date: recurring.end_date,
        recurrence_unit: recurring.recurrence_unit,
        interval: recurring.interval,
      });

      const dates = generateRecurringPaycheckInstances(recurring, rangeStart, rangeEnd);
      console.log('[PaychecksContext] Generated dates for', recurring.id, ':', dates.map(d => formatDateForDB(d)));

      dates.forEach((date, index) => {
        const dateStr = formatDateForDB(date);
        generatedInstances.push({
          id: `${recurring.id}-${dateStr}`,
          user_id: recurring.user_id,
          name: `Recurring: $${recurring.amount}`,
          amount: recurring.amount,
          date: dateStr,
          notes: null,
          created_at: new Date().toISOString(),
          recurring_paycheck_id: recurring.id,
          isGenerated: true,
        });
      });
    });

    console.log('[PaychecksContext] Generated instances:', generatedInstances.length);

    // Combine actual paychecks with generated instances
    const actualPaycheckInstances: PaycheckInstance[] = paychecks.map(p => ({
      ...p,
      isGenerated: false,
    }));

    const combined = [...actualPaycheckInstances, ...generatedInstances];
    console.log('[PaychecksContext] Total instances:', combined.length, {
      actual: actualPaycheckInstances.length,
      generated: generatedInstances.length,
    });

    return combined;
  }, [paychecks, recurringPaychecks]);

  const refreshPaychecks = async () => {
    console.log('[PaychecksContext] Refreshing all paycheck data...');
    await refreshData();
    await loadRecurringPaychecks();
  };

  return (
    <PaychecksContext.Provider
      value={{
        allPaycheckInstances,
        loading: paychecksLoading || recurringLoading,
        refreshPaychecks,
      }}
    >
      {children}
    </PaychecksContext.Provider>
  );
}

export function usePaycheckInstances() {
  const context = useContext(PaychecksContext);
  if (context === undefined) {
    throw new Error('usePaycheckInstances must be used within a PaychecksProvider');
  }
  return context;
}
