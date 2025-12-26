import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TabScreenHeader from '@/components/TabScreenHeader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatDollar } from '@/lib/utils';
import { format, parseISO, addDays, startOfDay } from 'date-fns';

interface LedgerEntry {
  date: string;
  type: 'balance' | 'income' | 'bill';
  description: string;
  amount: number;
  runningTotal: number;
}

interface DayGroup {
  date: string;
  dayLabel: string;
  entries: LedgerEntry[];
}

export default function PlanScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dayGroups, setDayGroups] = useState<DayGroup[]>([]);
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const [allCollapsed, setAllCollapsed] = useState(true);

  useEffect(() => {
    loadLedgerData();
  }, [user]);

  const loadLedgerData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load account balance
      const { data: accountData, error: accountError } = await supabase
        .from('account_info')
        .select('account_balance, spendable_limit')
        .eq('user_id', user.id);

      if (accountError) throw accountError;

      const totalBalance = (accountData || []).reduce((sum, account) => {
        const balance = account.account_balance || 0;
        const limit = account.spendable_limit;
        const effectiveBalance = limit !== null && limit !== undefined 
          ? Math.min(balance, limit) 
          : balance;
        return sum + effectiveBalance;
      }, 0);

      setAccountBalance(totalBalance);

      // Load income for next 30 days
      const today = new Date();
      const endDate = addDays(today, 30);

      const { data: incomeData, error: incomeError } = await supabase.rpc('generate_daily_income', {
        p_user_id: user.id,
        p_start_date: format(today, 'yyyy-MM-dd'),
        p_end_date: format(endDate, 'yyyy-MM-dd'),
      });

      if (incomeError) throw incomeError;

      // Load bills for next 30 days (using user_bills_view)
      const { data: billsData, error: billsError } = await supabase
        .from('user_bills_view')
        .select('*')
        .eq('is_upcoming', true);

      if (billsError) throw billsError;

      // Process and combine data
      const ledger = buildLedger(totalBalance, incomeData || [], billsData || []);
      setDayGroups(ledger);
      
      // Initialize all days as collapsed
      const allDates = new Set(ledger.map(day => day.date));
      setCollapsedDays(allDates);
      setAllCollapsed(true);
    } catch (error) {
      console.error('Error loading ledger data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildLedger = (startingBalance: number, income: any[], bills: any[]): DayGroup[] => {
    const entries: { [date: string]: LedgerEntry[] } = {};
    const today = format(new Date(), 'yyyy-MM-dd');
    let runningTotal = startingBalance;

    // Add starting balance as first entry for today
    if (!entries[today]) {
      entries[today] = [];
    }
    entries[today].push({
      date: today,
      type: 'balance',
      description: 'Account Balance',
      amount: 0,
      runningTotal: startingBalance,
    });

    // Aggregate income by date
    const incomeByDate: { [date: string]: number } = {};
    income.forEach((item) => {
      const date = item.income_date;
      incomeByDate[date] = (incomeByDate[date] || 0) + parseFloat(item.amount);
    });

    // Aggregate bills by due date (filter out invalid dates and use next_due_date)
    const billsByDate: { [date: string]: { name: string; amount: number }[] } = {};
    bills.forEach((bill) => {
      const date = bill.next_due_date || bill.due_date;
      if (!date) return; // Skip bills without due dates
      
      // Calculate the amount to use:
      // 1. For variable bills: use actual current period payment if exists, otherwise minimum due
      // 2. For fixed bills: use remaining amount (considers partial payments)
      let billAmount: number;
      
      if (bill.is_variable) {
        // Variable bill: if there's a current period payment, use that amount
        // Otherwise use minimum due from statement (or updated balance or statement balance or base amount)
        if (bill.partial_payment && bill.partial_payment > 0) {
          billAmount = bill.partial_payment;
        } else {
          billAmount = bill.statement_minimum_due || bill.updated_balance || bill.statement_balance || bill.amount || 0;
        }
      } else {
        // Fixed bill: use remaining amount (which accounts for partial payments)
        billAmount = bill.remaining_amount || bill.amount || 0;
      }
      
      if (!billsByDate[date]) {
        billsByDate[date] = [];
      }
      billsByDate[date].push({
        name: bill.name,
        amount: parseFloat(billAmount.toString()),
      });
    });

    // Get all unique dates and sort
    const allDates = new Set([today, ...Object.keys(incomeByDate), ...Object.keys(billsByDate)]);
    const sortedDates = Array.from(allDates).sort();

    // Build entries for each date
    sortedDates.forEach((date) => {
      if (!entries[date]) {
        entries[date] = [];
      }

      // Add income entry
      if (incomeByDate[date]) {
        runningTotal += incomeByDate[date];
        entries[date].push({
          date,
          type: 'income',
          description: 'Net daily income',
          amount: incomeByDate[date],
          runningTotal,
        });
      }

      // Add bill entries
      if (billsByDate[date]) {
        billsByDate[date].forEach((bill) => {
          runningTotal -= bill.amount;
          entries[date].push({
            date,
            type: 'bill',
            description: bill.name,
            amount: -bill.amount,
            runningTotal,
          });
        });
      }
    });

    // Group by day
    return sortedDates.map((date) => {
      const parsedDate = parseISO(date);
      return {
        date,
        dayLabel: format(parsedDate, 'EEE MMM d'),
        entries: entries[date],
      };
    });
  };

  const toggleAllDays = () => {
    if (allCollapsed) {
      // Expand all
      setCollapsedDays(new Set());
      setAllCollapsed(false);
    } else {
      // Collapse all
      const allDates = new Set(dayGroups.map(day => day.date));
      setCollapsedDays(allDates);
      setAllCollapsed(true);
    }
  };

  const toggleDay = (date: string) => {
    const newCollapsed = new Set(collapsedDays);
    if (newCollapsed.has(date)) {
      newCollapsed.delete(date);
    } else {
      newCollapsed.add(date);
    }
    setCollapsedDays(newCollapsed);
    
    // Update allCollapsed state
    setAllCollapsed(newCollapsed.size === dayGroups.length);
  };

  const getDaySummary = (day: DayGroup) => {
    let netIncome = 0;
    let netExpenses = 0;
    
    day.entries.forEach(entry => {
      if (entry.type === 'income') {
        netIncome += entry.amount;
      } else if (entry.type === 'bill') {
        netExpenses += Math.abs(entry.amount);
      }
    });
    
    const finalBalance = day.entries[day.entries.length - 1]?.runningTotal || 0;
    
    return { netIncome, netExpenses, finalBalance };
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <TabScreenHeader 
          title="Plan" 
          rightContent={
            <TouchableOpacity onPress={toggleAllDays} style={styles.headerButton}>
              <Ionicons 
                name={allCollapsed ? 'chevron-down-circle-outline' : 'chevron-up-circle-outline'} 
                size={28} 
                color="white" 
              />
            </TouchableOpacity>
          }
        />

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadLedgerData} />
          }
        >
          {/* Ledger Entries */}
          {dayGroups.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No bills or income scheduled</Text>
            </View>
          ) : (
            dayGroups.map((day, dayIndex) => {
              const isCollapsed = collapsedDays.has(day.date);
              const summary = isCollapsed ? getDaySummary(day) : null;
              
              return (
                <View key={dayIndex} style={styles.dayCard}>
                  <TouchableOpacity 
                    onPress={() => toggleDay(day.date)}
                    style={styles.dayHeader}
                  >
                    <View style={styles.dayHeaderContent}>
                      <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                      {isCollapsed && summary && (
                        <View style={styles.summaryRow}>
                          {summary.netIncome > 0 && (
                            <Text style={styles.summaryIncome}>{formatDollar(summary.netIncome, true)}</Text>
                          )}
                          {summary.netExpenses > 0 && (
                            <Text style={styles.summaryExpense}>{formatDollar(-summary.netExpenses, true)}</Text>
                          )}
                          <Text style={styles.summaryBalance}>{formatDollar(summary.finalBalance)}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                  {!isCollapsed && (
                    <View style={styles.entriesContainer}>
                      {day.entries.map((entry, entryIndex) => (
                        <View key={entryIndex} style={styles.entryRow}>
                          <View style={styles.entryInfo}>
                            <Text style={styles.entryDescription}>{entry.description}</Text>
                            {entry.type !== 'balance' && (
                              <Text style={[
                                styles.entryAmount,
                                entry.type === 'income' && styles.incomeAmount,
                                entry.type === 'bill' && styles.billAmount,
                              ]}>
                                {formatDollar(entry.amount, true)}
                              </Text>
                            )}
                          </View>
                          <Text style={styles.runningTotal}>{formatDollar(entry.runningTotal)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2c3e50',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  dayCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  dayHeader: {
    padding: 16,
  },
  dayHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  summaryIncome: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2ecc71',
  },
  summaryExpense: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e74c3c',
  },
  summaryBalance: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3498db',
  },
  entriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 2,
    borderTopColor: '#ecf0f1',
  },
  headerButton: {
    padding: 8,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  entryInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 16,
  },
  entryDescription: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
  },
  entryAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
  },
  incomeAmount: {
    color: '#2ecc71',
  },
  billAmount: {
    color: '#e74c3c',
  },
  runningTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3498db',
    minWidth: 80,
    textAlign: 'right',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
});
