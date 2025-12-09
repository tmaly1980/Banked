import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useBills } from '@/contexts/BillsContext';
import { useRecurringDeposits } from '@/hooks/useRecurringDeposits';
import { Deposit } from '@/types';
import { generateRecurringDepositInstances, formatDateForDB } from '@/utils/depositHelpers';
import { addWeeks } from 'date-fns';

// Extended Deposit type for generated instances
export interface DepositInstance extends Omit<Deposit, 'id' | 'created_at'> {
  id: string;
  isGenerated?: boolean;
  recurring_deposit_id?: string;
  created_at: string;
}

interface DepositsContextType {
  allDepositInstances: DepositInstance[];
  loading: boolean;
  refreshDeposits: () => Promise<void>;
}

const DepositsContext = createContext<DepositsContextType | undefined>(undefined);

export function DepositsProvider({ children }: { children: ReactNode }) {
  const { deposits, loading: depositsLoading, refreshData } = useBills();
  const { recurringDeposits, loadRecurringDeposits, loading: recurringLoading } = useRecurringDeposits();

  useEffect(() => {
    const init = async () => {
      await refreshData();
      await loadRecurringDeposits();
    };
    init();
  }, []);

  // Generate deposit instances from recurring deposits within 6-week range
  const allDepositInstances = useMemo(() => {
    const now = new Date();
    const rangeStart = now;
    const rangeEnd = addWeeks(now, 6);

    console.log('[DepositsContext] Generating instances:', {
      rangeStart: formatDateForDB(rangeStart),
      rangeEnd: formatDateForDB(rangeEnd),
      recurringCount: recurringDeposits.length,
      actualDepositsCount: deposits.length,
    });

    // Generate instances from recurring deposits
    const generatedInstances: DepositInstance[] = [];
    
    recurringDeposits.forEach(recurring => {
      console.log('[DepositsContext] Processing recurring:', recurring.id, {
        amount: recurring.amount,
        start_date: recurring.start_date,
        end_date: recurring.end_date,
        recurrence_unit: recurring.recurrence_unit,
        interval: recurring.interval,
      });

      const dates = generateRecurringDepositInstances(recurring, rangeStart, rangeEnd);
      console.log('[DepositsContext] Generated dates for', recurring.id, ':', dates.map(d => formatDateForDB(d)));

      dates.forEach((date, index) => {
        const dateStr = formatDateForDB(date);
        generatedInstances.push({
          id: `${recurring.id}-${dateStr}`,
          user_id: recurring.user_id,
          name: `Recurring: $${recurring.amount}`,
          amount: recurring.amount,
          date: dateStr,
          notes: undefined,
          created_at: new Date().toISOString(),
          recurring_deposit_id: recurring.id,
          isGenerated: true,
        });
      });
    });

    console.log('[DepositsContext] Generated instances:', generatedInstances.length);

    // Combine actual deposits with generated instances
    const actualDepositInstances: DepositInstance[] = deposits.map(p => ({
      ...p,
      isGenerated: false,
    }));

    const combined = [...actualDepositInstances, ...generatedInstances];
    console.log('[DepositsContext] Total instances:', combined.length, {
      actual: actualDepositInstances.length,
      generated: generatedInstances.length,
    });

    return combined;
  }, [deposits, recurringDeposits]);

  const refreshDeposits = async () => {
    console.log('[DepositsContext] Refreshing all deposit data...');
    await refreshData();
    await loadRecurringDeposits();
  };

  return (
    <DepositsContext.Provider
      value={{
        allDepositInstances,
        loading: depositsLoading || recurringLoading,
        refreshDeposits,
      }}
    >
      {children}
    </DepositsContext.Provider>
  );
}

export function useDepositInstances() {
  const context = useContext(DepositsContext);
  if (context === undefined) {
    throw new Error('useDepositInstances must be used within a DepositsProvider');
  }
  return context;
}
