import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import TabScreenHeader from '@/components/TabScreenHeader';
import AccountManagementModal from '@/components/modals/AccountManagementModal';
import DayIncomeBreakdownModal from '@/components/modals/DayIncomeBreakdownModal';
import AddPaycheckModal from '@/components/modals/AddPaycheckModal';
import FloatingActionButton from '@/components/FloatingActionButton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatDollar } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, addDays, parseISO } from 'date-fns';

interface DailyIncome {
  income_date: string;
  amount: number;
  income_source_id: string;
  income_source_name: string;
  is_actual: boolean;
}

interface DayIncomeDetail {
  date: string;
  sources: DailyIncome[];
}

interface WeekGroup {
  weekLabel: string;
  days: DailyIncome[];
  total: number;
}

export default function IncomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [showPaycheckModal, setShowPaycheckModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDateEntries, setSelectedDateEntries] = useState<DailyIncome[]>([]);
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [weeklyGroups, setWeeklyGroups] = useState<WeekGroup[]>([]);
  const [allDailyIncome, setAllDailyIncome] = useState<DailyIncome[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAccountInfo();
    loadDailyIncome();
  }, [user]);

  const loadAccountInfo = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('account_info')
        .select('account_balance, spendable_limit')
        .eq('user_id', user.id);

      if (error) throw error;

      if (data && data.length > 0) {
        // Calculate sum of min(account_balance, spendable_limit) for all accounts
        const totalBalance = data.reduce((sum, account) => {
          const balance = account.account_balance || 0;
          const limit = account.spendable_limit;
          const effectiveBalance = limit !== null && limit !== undefined 
            ? Math.min(balance, limit) 
            : balance;
          return sum + effectiveBalance;
        }, 0);
        setAccountBalance(totalBalance);
      }
    } catch (error) {
      console.error('Error loading account info:', error);
    }
  };

  const loadDailyIncome = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const today = new Date();
      const endDate = addDays(today, 30);

      const { data, error } = await supabase.rpc('generate_daily_income', {
        p_user_id: user.id,
        p_start_date: format(today, 'yyyy-MM-dd'),
        p_end_date: format(endDate, 'yyyy-MM-dd'),
      });

      if (error) throw error;

      // Store all daily income for breakdown modal
      setAllDailyIncome(data || []);

      // Group by week
      const grouped = groupByWeek(data || []);
      setWeeklyGroups(grouped);
    } catch (error) {
      console.error('Error loading daily income:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupByWeek = (dailyIncome: DailyIncome[]): WeekGroup[] => {
    const weeks: { [key: string]: WeekGroup } = {};
    const dayTotals: { [key: string]: { date: string; total: number } } = {};

    // First, aggregate amounts for each unique date
    dailyIncome.forEach((entry) => {
      if (!dayTotals[entry.income_date]) {
        dayTotals[entry.income_date] = {
          date: entry.income_date,
          total: 0,
        };
      }
      dayTotals[entry.income_date].total += parseFloat(entry.amount.toString());
    });

    // Then group by week
    Object.values(dayTotals).forEach((dayTotal) => {
      const date = parseISO(dayTotal.date);
      const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
      const weekEnd = endOfWeek(date, { weekStartsOn: 0 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const weekLabel = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;

      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          weekLabel,
          days: [],
          total: 0,
        };
      }

      // Create a DailyIncome object for display (just needs the aggregated amount)
      weeks[weekKey].days.push({
        income_date: dayTotal.date,
        amount: dayTotal.total,
        income_source_id: '',
        income_source_name: '',
        is_actual: false,
      });
      weeks[weekKey].total += dayTotal.total;
    });

    // Sort weeks chronologically by weekKey (yyyy-MM-dd format), then sort days within each week
    return Object.entries(weeks)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([, week]) => ({
        ...week,
        days: week.days.sort((a, b) => a.income_date.localeCompare(b.income_date))
      }));
  };

  const calculateRunningTotal = (days: DailyIncome[], upToIndex: number): number => {
    const total = days.slice(0, upToIndex + 1).reduce((sum, day) => {
      return sum + parseFloat(day.amount.toString());
    }, 0);
    return total;
  };

  const handleDayPress = (date: string) => {
    const entries = allDailyIncome.filter(income => income.income_date === date);
    setSelectedDate(date);
    setSelectedDateEntries(entries);
    setShowBreakdownModal(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <TabScreenHeader 
          title="Income"
          rightContent={
            <TouchableOpacity 
              style={styles.planButton}
              onPress={() => router.push('/income/planner')}
            >
              <Text style={styles.planButtonText}>Plan</Text>
            </TouchableOpacity>
          }
        />

        <TouchableOpacity 
          style={styles.balanceCard}
          onPress={() => setShowAccountModal(true)}
        >
          <Text style={styles.balanceLabel}>Account Balance</Text>
          <Text style={styles.balanceAmount}>{formatDollar(accountBalance)}</Text>
        </TouchableOpacity>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadDailyIncome} />
          }
        >
          {weeklyGroups.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#bdc3c7" />
              <Text style={styles.emptyText}>No income scheduled</Text>
              <Text style={styles.emptySubtext}>Create income rules in the planner</Text>
            </View>
          ) : (
            <>
              <View style={styles.grandTotalCard}>
                <Text style={styles.grandTotalLabel}>30-Day Total Income:</Text>
                <Text style={styles.grandTotalAmount}>
                  {formatDollar(weeklyGroups.reduce((sum, week) => sum + week.total, 0), true)}
                </Text>
              </View>
              {weeklyGroups.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekCard}>
                <View style={styles.weekHeader}>
                  <Text style={styles.weekLabel}>{week.weekLabel}</Text>
                  <Text style={styles.weekTotal}>{formatDollar(week.total)}</Text>
                </View>
                {week.days.map((day, dayIndex) => {
                  const date = parseISO(day.income_date);
                  const dayLabel = format(date, 'EEE MMM d');
                  
                  return (
                    <TouchableOpacity
                      key={dayIndex}
                      style={[styles.dayRow, dayIndex === 0 && styles.firstDayRow]}
                      onPress={() => handleDayPress(day.income_date)}
                    >
                      <Text style={styles.dayLabel}>{dayLabel}</Text>
                      <Text style={styles.dayAmount}>{formatDollar(parseFloat(day.amount.toString()))}</Text>
                      <Text style={styles.dayRunningTotal}>{formatDollar(parseFloat(calculateRunningTotal(week.days, dayIndex)))}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            </>
          )}
        </ScrollView>

      <FloatingActionButton
        options={[
          {
            label: 'Add Paycheck',
            icon: 'cash',
            onPress: () => setShowPaycheckModal(true),
          },
        ]}
      />

      <AccountManagementModal
        visible={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onUpdate={loadAccountInfo}
      />

      <AddPaycheckModal
        visible={showPaycheckModal}
        onClose={() => setShowPaycheckModal(false)}
        onSuccess={loadDailyIncome}
      />

      <DayIncomeBreakdownModal
        visible={showBreakdownModal}
        onClose={() => setShowBreakdownModal(false)}
        date={selectedDate}
        entries={selectedDateEntries}
        onUpdate={() => {
          loadDailyIncome();
          setShowBreakdownModal(false);
        }}
      />
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
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  balanceCard: {
    backgroundColor: '#3498db',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  weekCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  grandTotalCard: {
    backgroundColor: '#2ecc71',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  grandTotalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  weekTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  firstDayRow: {
    borderTopWidth: 0,
  },
  dayLabel: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 2,
  },
  dayAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2ecc71',
    width: 80,
    textAlign: 'right',
  },
  dayRunningTotal: {
    fontSize: 14,
    color: '#7f8c8d',
    width: 80,
    textAlign: 'right',
  },
  totalCard: {
    backgroundColor: '#2ecc71',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  sourceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  sourceFrequency: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  sourceEarnings: {
    alignItems: 'flex-end',
  },
  earningsLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  earningsAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7f8c8d',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  planButton: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  planButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
