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
import SwipeableBillRow from '@/components/Plan/SwipeableBillRow';
import BillPaymentSheet from '@/components/Plan/BillPaymentSheet';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatDollar } from '@/lib/utils';
import { format, parseISO, addDays, startOfDay } from 'date-fns';

interface LedgerEntry {
  date: string;
  type: 'balance' | 'income' | 'bill' | 'time_off';
  description: string;
  amount: number;
  runningTotal: number;
  billId?: string;
  billData?: any;
  isDeferred?: boolean;
  timeOffData?: any;
}

interface IncomeBreakdown {
  date: string;
  dayLabel: string;
  amount: number;
  runningTotal: number;
}

interface DayGroup {
  date: string;
  endDate?: string; // For combined income-only days
  dayLabel: string;
  entries: LedgerEntry[];
  isIncomeOnly?: boolean;
  incomeBreakdown?: IncomeBreakdown[]; // For combined days
  isTimeOff?: boolean;
  timeOffData?: any;
}

export default function PlanScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dayGroups, setDayGroups] = useState<DayGroup[]>([]);
  const [overdueBills, setOverdueBills] = useState<any[]>([]);
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const [overdueCollapsed, setOverdueCollapsed] = useState(true);
  const [allCollapsed, setAllCollapsed] = useState(true);
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [timeOffList, setTimeOffList] = useState<any[]>([]);

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

      // Load overdue bills separately
      const { data: overdueData, error: overdueError } = await supabase
        .from('user_bills_view')
        .select('*')
        .eq('is_overdue', true);

      if (overdueError) throw overdueError;

      setOverdueBills(overdueData || []);

      // Load time off
      const { data: timeOffData, error: timeOffError } = await supabase
        .from('time_off')
        .select('*')
        .eq('user_id', user.id)
        .gte('end_date', format(today, 'yyyy-MM-dd'))
        .order('start_date', { ascending: true });

      if (timeOffError) throw timeOffError;

      setTimeOffList(timeOffData || []);

      // Process and combine data
      const ledger = buildLedger(totalBalance, incomeData || [], billsData || [], overdueData || [], timeOffData || []);
      setDayGroups(ledger);
    } catch (error) {
      console.error('Error loading ledger data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildLedger = (startingBalance: number, income: any[], bills: any[], overdueBillsData: any[], timeOffData: any[]): DayGroup[] => {
    const entries: { [date: string]: LedgerEntry[] } = {};
    const today = format(new Date(), 'yyyy-MM-dd');
    
    console.log('[buildLedger] Starting balance:', startingBalance);
    console.log('[buildLedger] Overdue bills count:', overdueBillsData.length);
    console.log('[buildLedger] Overdue bills:', overdueBillsData.map(b => ({ name: b.name, amount: b.amount, remaining: b.remaining_amount, next_due_date: b.next_due_date, deferred_months: b.deferred_months })));
    
    // Calculate overdue total to adjust starting balance (exclude bills deferred for their overdue month)
    const overdueTotal = overdueBillsData.reduce((sum, bill) => {
      // Check if bill is deferred for its overdue month
      if (bill.next_due_date && bill.deferred_months) {
        const [year, month] = bill.next_due_date.split('-');
        const billMonthYear = `${year}-${month}`;
        if (bill.deferred_months.includes(billMonthYear)) {
          console.log('[buildLedger] Skipping bill deferred for', billMonthYear, ':', bill.name);
          return sum;
        }
      }
      
      let billAmount: number;
      if (bill.is_variable) {
        if (bill.partial_payment && bill.partial_payment > 0) {
          billAmount = bill.partial_payment;
        } else {
          billAmount = bill.statement_minimum_due || bill.updated_balance || bill.statement_balance || bill.amount || 0;
        }
      } else {
        billAmount = bill.remaining_amount || bill.amount || 0;
      }
      console.log('[buildLedger] Adding overdue bill:', bill.name, 'amount:', billAmount);
      return sum + billAmount;
    }, 0);
    
    console.log('[buildLedger] Total overdue:', overdueTotal);
    
    // Create time off lookup map by date
    const timeOffByDate: { [date: string]: any[] } = {};
    const endDate = addDays(new Date(), 30);
    
    timeOffData.forEach((timeOff) => {
      const startDate = parseISO(timeOff.start_date);
      const endDateEntry = parseISO(timeOff.end_date);
      
      let currentDate = startDate < new Date() ? new Date() : startDate;
      const finalDate = endDateEntry < endDate ? endDateEntry : endDate;
      
      while (currentDate <= finalDate) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        if (!timeOffByDate[dateStr]) {
          timeOffByDate[dateStr] = [];
        }
        timeOffByDate[dateStr].push(timeOff);
        currentDate = addDays(currentDate, 1);
      }
    });
    
    // Start with balance after overdue (if any), otherwise use account balance
    let runningTotal = startingBalance - overdueTotal;
    
    console.log('[buildLedger] Initial running total:', runningTotal, '(', startingBalance, '-', overdueTotal, ')');

    // Only show account balance entry if there are NO overdue items
    if (!entries[today]) {
      entries[today] = [];
    }
    if (overdueTotal === 0) {
      entries[today].push({
        date: today,
        type: 'balance',
        description: 'Account Balance',
        amount: 0,
        runningTotal: runningTotal,
      });
    }

    // Aggregate income by date
    const incomeByDate: { [date: string]: number } = {};
    income.forEach((item) => {
      const date = item.income_date;
      incomeByDate[date] = (incomeByDate[date] || 0) + parseFloat(item.amount);
    });

    // Aggregate bills by due date (filter out invalid dates and use next_due_date)
    const billsByDate: { [date: string]: any[] } = {};
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
        ...bill,
        name: bill.name,
        amount: parseFloat(billAmount.toString()),
      });
    });

    // Get all unique dates and sort
    const allDates = new Set([today, ...Object.keys(incomeByDate), ...Object.keys(billsByDate), ...Object.keys(timeOffByDate)]);
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
          // Check if bill is deferred for this month
          const billMonthYear = format(parseISO(date), 'yyyy-MM');
          const isDeferred = bill.deferred_months?.includes(billMonthYear) || false;
          const displayAmount = -bill.amount;
          
          // Only subtract from running total if NOT deferred for this month
          if (!isDeferred) {
            runningTotal -= bill.amount;
          }
          
          entries[date].push({
            date,
            type: 'bill',
            description: bill.name,
            amount: displayAmount,
            runningTotal,
            billId: bill.id,
            billData: bill,
            isDeferred,
          });
        });
      }
    });

    // Group by day, combining consecutive income-only days, and inserting time off cards between dates
    const dayGroups: DayGroup[] = [];
    let currentIncomeGroup: { startDate: string; dates: string[]; entries: { [date: string]: LedgerEntry[] } } | null = null;
    
    // Track which time off periods we've already added
    const addedTimeOffPeriods = new Set<string>();

    sortedDates.forEach((date, index) => {
      const dayEntries = entries[date];
      const hasOnlyIncome = dayEntries.every(e => e.type === 'income' || e.type === 'balance');
      const hasIncome = dayEntries.some(e => e.type === 'income');
      const hasBills = dayEntries.some(e => e.type === 'bill');

      // If this day has only income (no bills), add to current group or start new one
      if (hasIncome && !hasBills) {
        if (!currentIncomeGroup) {
          currentIncomeGroup = { startDate: date, dates: [date], entries: { [date]: dayEntries } };
        } else {
          currentIncomeGroup.dates.push(date);
          currentIncomeGroup.entries[date] = dayEntries;
        }

        // If this is the last date, finalize the group
        if (index === sortedDates.length - 1 && currentIncomeGroup) {
          if (currentIncomeGroup.dates.length > 1) {
            // Multiple consecutive income-only days - create combined card
            const startDate = currentIncomeGroup.startDate;
            const endDate = currentIncomeGroup.dates[currentIncomeGroup.dates.length - 1];
            const incomeBreakdown: IncomeBreakdown[] = currentIncomeGroup.dates.map(d => {
              const entry = currentIncomeGroup!.entries[d].find(e => e.type === 'income')!;
              return {
                date: d,
                dayLabel: format(parseISO(d), 'EEE MMM d'),
                amount: entry.amount,
                runningTotal: entry.runningTotal,
              };
            });
            const lastEntry = currentIncomeGroup.entries[endDate].find(e => e.type === 'income')!;
            dayGroups.push({
              date: startDate,
              endDate: endDate,
              dayLabel: `${format(parseISO(startDate), 'MMM d')} - ${format(parseISO(endDate), 'MMM d')}`,
              entries: [lastEntry], // Use last entry for summary
              isIncomeOnly: true,
              incomeBreakdown,
            });
          } else {
            // Single income-only day - add as regular card
            const d = currentIncomeGroup.dates[0];
            dayGroups.push({
              date: d,
              dayLabel: format(parseISO(d), 'EEE MMM d'),
              entries: currentIncomeGroup.entries[d],
            });
          }
        }
      } else {
        // Day has bills or no income - finalize any current income group
        if (currentIncomeGroup) {
          if (currentIncomeGroup.dates.length > 1) {
            // Multiple consecutive income-only days - create combined card
            const startDate = currentIncomeGroup.startDate;
            const endDate = currentIncomeGroup.dates[currentIncomeGroup.dates.length - 1];
            const incomeBreakdown: IncomeBreakdown[] = currentIncomeGroup.dates.map(d => {
              const entry = currentIncomeGroup!.entries[d].find(e => e.type === 'income')!;
              return {
                date: d,
                dayLabel: format(parseISO(d), 'EEE MMM d'),
                amount: entry.amount,
                runningTotal: entry.runningTotal,
              };
            });
            const lastEntry = currentIncomeGroup.entries[endDate].find(e => e.type === 'income')!;
            dayGroups.push({
              date: startDate,
              endDate: endDate,
              dayLabel: `${format(parseISO(startDate), 'MMM d')} - ${format(parseISO(endDate), 'MMM d')}`,
              entries: [lastEntry], // Use last entry for summary
              isIncomeOnly: true,
              incomeBreakdown,
            });
          } else {
            // Single income-only day - add as regular card
            const d = currentIncomeGroup.dates[0];
            dayGroups.push({
              date: d,
              dayLabel: format(parseISO(d), 'EEE MMM d'),
              entries: currentIncomeGroup.entries[d],
            });
          }
          currentIncomeGroup = null;
        }

        // Check if we need to insert a time off card before this date
        if (timeOffByDate[date]) {
          timeOffByDate[date].forEach((timeOff) => {
            const periodKey = `${timeOff.start_date}-${timeOff.end_date}`;
            if (!addedTimeOffPeriods.has(periodKey)) {
              addedTimeOffPeriods.add(periodKey);
              dayGroups.push({
                date: timeOff.start_date,
                dayLabel: `Time Off: ${timeOff.name}`,
                entries: [],
                isTimeOff: true,
                timeOffData: timeOff,
              });
            }
          });
        }
        
        // Add current day as regular card
        dayGroups.push({
          date,
          dayLabel: format(parseISO(date), 'EEE MMM d'),
          entries: dayEntries,
        });
      }
    });

    return dayGroups;
  };

  const toggleAllDays = () => {
    if (allCollapsed) {
      // Expand all
      setCollapsedDays(new Set());
      setOverdueCollapsed(false);
      setAllCollapsed(false);
    } else {
      // Collapse all
      const allDates = new Set(dayGroups.map(day => day.date));
      setCollapsedDays(allDates);
      setOverdueCollapsed(true);
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
    
    // Update allCollapsed state: true only if ALL cards are collapsed (daily + overdue)
    const allDaysCollapsed = newCollapsed.size === dayGroups.length;
    const hasOverdue = overdueBills.length > 0;
    setAllCollapsed(allDaysCollapsed && (!hasOverdue || overdueCollapsed));
  };

  const getDaySummary = (day: DayGroup) => {
    let netIncome = 0;
    let netExpenses = 0;
    
    if (day.isIncomeOnly && day.incomeBreakdown) {
      // For combined income cards, sum all income from breakdown
      netIncome = day.incomeBreakdown.reduce((sum, breakdown) => sum + breakdown.amount, 0);
      const finalBalance = day.incomeBreakdown[day.incomeBreakdown.length - 1]?.runningTotal || 0;
      return { netIncome, netExpenses: 0, finalBalance };
    }
    
    day.entries.forEach(entry => {
      if (entry.type === 'income') {
        netIncome += entry.amount;
      } else if (entry.type === 'bill' && !entry.isDeferred) {
        netExpenses += Math.abs(entry.amount);
      }
    });
    
    const finalBalance = day.entries[day.entries.length - 1]?.runningTotal || 0;
    
    return { netIncome, netExpenses, finalBalance };
  };

  const getOverdueSummary = () => {
    const totalOverdue = overdueBills.reduce((sum, bill) => {
      // Check if bill is deferred for current month
      const currentMonthYear = format(new Date(), 'yyyy-MM');
      const isDeferred = bill.deferred_months?.includes(currentMonthYear) || false;
      if (isDeferred) return sum;
      
      let billAmount: number;
      if (bill.is_variable) {
        if (bill.partial_payment && bill.partial_payment > 0) {
          billAmount = bill.partial_payment;
        } else {
          billAmount = bill.statement_minimum_due || bill.updated_balance || bill.statement_balance || bill.amount || 0;
        }
      } else {
        billAmount = bill.remaining_amount || bill.amount || 0;
      }
      return sum + billAmount;
    }, 0);

    return {
      netIncome: 0,
      netExpenses: totalOverdue,
      finalBalance: accountBalance - totalOverdue,
    };
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
          {/* Overdue Bills Section */}
          {overdueBills.length > 0 && (
            <View style={styles.dayCard}>
              <TouchableOpacity 
                onPress={() => {
                  const newOverdueCollapsed = !overdueCollapsed;
                  setOverdueCollapsed(newOverdueCollapsed);
                  // Update allCollapsed: true only if overdue AND all daily cards are collapsed
                  const allDaysCollapsed = collapsedDays.size === dayGroups.length;
                  setAllCollapsed(allDaysCollapsed && newOverdueCollapsed);
                }}
                style={styles.dayHeader}
              >
                <View style={styles.dayHeaderContent}>
                  <View style={styles.dayLabelContainer}>
                    <Text style={[styles.dayLabel, styles.overdueLabel]}>Overdue</Text>
                  </View>
                  {overdueCollapsed && (() => {
                    const summary = getOverdueSummary();
                    return (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryIncome}></Text>
                        <Text style={styles.summaryExpense}>{formatDollar(-summary.netExpenses, true)}</Text>
                        <Text style={styles.summaryBalance}>{formatDollar(summary.finalBalance)}</Text>
                      </View>
                    );
                  })()}
                </View>
              </TouchableOpacity>

              {!overdueCollapsed && (() => {
                let runningBalance = accountBalance;

                return (
                  <View style={styles.dayContent}>
                    {/* Account Balance */}
                    <View style={styles.entryRow}>
                      <Text style={styles.entryDescription}>Account Balance</Text>
                      <Text style={[styles.entryAmount, { color: '#3498db' }]}>{formatDollar(accountBalance)}</Text>
                    </View>

                    {/* Overdue Bills with running subtotal */}
                    {overdueBills.map((bill, index) => {
                      let billAmount: number;
                      if (bill.is_variable) {
                        if (bill.partial_payment && bill.partial_payment > 0) {
                          billAmount = bill.partial_payment;
                        } else {
                          billAmount = bill.statement_minimum_due || bill.updated_balance || bill.statement_balance || bill.amount || 0;
                        }
                      } else {
                        billAmount = bill.remaining_amount || bill.amount || 0;
                      }

                      // Check if bill is deferred for current month
                      const currentMonthYear = format(new Date(), 'yyyy-MM');
                      const isDeferred = bill.deferred_months?.includes(currentMonthYear) || false;
                      if (!isDeferred) {
                        runningBalance -= billAmount;
                      }

                      return (
                        <SwipeableBillRow
                          key={index}
                          billName={bill.name}
                          billAmount={billAmount}
                          runningTotal={runningBalance}
                          isDeferred={isDeferred}
                          onDollarPress={() => {
                            setSelectedBill(bill);
                            setPaymentSheetVisible(true);
                          }}
                        />
                      );
                    })}
                  </View>
                );
              })()}
            </View>
          )}

          {/* Ledger Entries */}
          {dayGroups.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No bills or income scheduled</Text>
            </View>
          ) : (
            dayGroups.map((day, dayIndex) => {
              // Handle time off cards separately
              if (day.isTimeOff && day.timeOffData) {
                const startDate = parseISO(day.timeOffData.start_date);
                const endDate = parseISO(day.timeOffData.end_date);
                const numDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                
                return (
                  <View key={dayIndex} style={styles.timeOffCard}>
                    <View style={styles.timeOffCardHeader}>
                      <Text style={styles.timeOffCardName}>{day.timeOffData.name}</Text>
                      <Ionicons name="calendar-outline" size={20} color="#f39c12" style={styles.timeOffCardIcon} />
                      <Text style={styles.timeOffCardDays}>({numDays} {numDays === 1 ? 'day' : 'days'})</Text>
                    </View>
                  </View>
                );
              }
              
              const isCollapsed = collapsedDays.has(day.date);
              const summary = isCollapsed ? getDaySummary(day) : null;
              const hasDeferredBill = day.entries.some(entry => entry.isDeferred);
              
              // Check if any bills on this day fall within time off periods
              const hasTimeOffBills = day.entries.some(entry => {
                if (entry.type === 'bill') {
                  return timeOffList.some(timeOff => {
                    const start = parseISO(timeOff.start_date);
                    const end = parseISO(timeOff.end_date);
                    const current = parseISO(entry.date);
                    return current >= start && current <= end;
                  });
                }
                return false;
              });
              
              return (
                <View key={dayIndex} style={[styles.dayCard, hasTimeOffBills && styles.timeOffDayBorder]}>
                  <TouchableOpacity 
                    onPress={() => toggleDay(day.date)}
                    style={styles.dayHeader}
                  >
                    <View style={styles.dayHeaderContent}>
                      <View style={styles.dayLabelContainer}>
                        <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                        {hasDeferredBill && (
                          <Ionicons name="pause-circle-outline" size={18} color="#95a5a6" style={styles.deferredDayIcon} />
                        )}
                      </View>
                      {isCollapsed && summary && (
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryIncome}>
                            {summary.netIncome > 0 ? formatDollar(summary.netIncome, true) : ''}
                          </Text>
                          <Text style={styles.summaryExpense}>
                            {summary.netExpenses > 0 ? formatDollar(-summary.netExpenses, true) : ''}
                          </Text>
                          <Text style={styles.summaryBalance}>{formatDollar(summary.finalBalance)}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                  {!isCollapsed && (
                    <View style={styles.entriesContainer}>
                      {day.isIncomeOnly && day.incomeBreakdown ? (
                        // Show breakdown for combined income days
                        day.incomeBreakdown.map((breakdown, idx) => (
                          <View key={idx} style={styles.entryRow}>
                            <View style={styles.entryInfo}>
                              <Text style={styles.entryDescription}>{breakdown.dayLabel}</Text>
                              <Text style={[styles.entryAmount, styles.incomeAmount]}>
                                {formatDollar(breakdown.amount, true)}
                              </Text>
                            </View>
                            <Text style={styles.runningTotal}>{formatDollar(breakdown.runningTotal)}</Text>
                          </View>
                        ))
                      ) : (
                        // Show regular entries for normal days
                        day.entries.map((entry, entryIndex) => {
                          if (entry.type === 'bill' && entry.billId) {
                            return (
                              <SwipeableBillRow
                                key={entryIndex}
                                billName={entry.description}
                                billAmount={Math.abs(entry.amount)}
                                runningTotal={entry.runningTotal}
                                isDeferred={entry.isDeferred || false}
                                onDollarPress={() => {
                                  setSelectedBill(entry.billData);
                                  setPaymentSheetVisible(true);
                                }}
                              />
                            );
                          }
                          return (
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
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Payment/Defer Sheet */}
        {selectedBill && (
          <BillPaymentSheet
            visible={paymentSheetVisible}
            billId={selectedBill.id}
            billName={selectedBill.name}
            billAmount={
              selectedBill.is_variable
                ? selectedBill.statement_minimum_due || selectedBill.updated_balance || selectedBill.statement_balance || selectedBill.amount || 0
                : selectedBill.remaining_amount || selectedBill.amount || 0
            }
            isVariable={selectedBill.is_variable || false}
            isDeferred={selectedBill.deferred_flag || false}
            nextDueDate={selectedBill.next_due_date ? new Date(selectedBill.next_due_date) : undefined}
            onClose={() => {
              setPaymentSheetVisible(false);
              setSelectedBill(null);
            }}
            onSuccess={() => {
              loadLedgerData();
            }}
          />
        )}
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
  overdueLabel: {
    color: '#e74c3c',
  },
  dayHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 2,
  },
  deferredDayIcon: {
    marginLeft: 4,
  },
  dayLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  summaryIncome: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2ecc71',
    flex: 1,
    textAlign: 'right',
  },
  summaryExpense: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e74c3c',
    flex: 1,
    textAlign: 'right',
  },
  summaryBalance: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3498db',
    flex: 1,
    textAlign: 'right',
  },
  entriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 2,
    borderTopColor: '#ecf0f1',
  },
  dayContent: {
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
  },
  entryDescription: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
  },
  entryAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
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
    marginLeft: 12,
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
  timeOffCard: {
    backgroundColor: '#fff9f0',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  timeOffCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  timeOffCardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e67e22',
  },
  timeOffCardIcon: {
    marginLeft: 8,
  },
  timeOffCardDays: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e67e22',
    marginLeft: 'auto',
  },
  timeOffDayBorder: {
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
  },
});
