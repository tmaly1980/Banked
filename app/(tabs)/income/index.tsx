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
import TimeOffFormModal from '@/components/modals/TimeOffFormModal';
import FloatingActionButton from '@/components/FloatingActionButton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatDollar } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, addDays, parseISO, isFuture, isPast } from 'date-fns';

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

interface DayEntry {
  date: string;
  type: 'income' | 'time_off';
  amount?: number;
  timeOffName?: string;
  timeOffCapacity?: number;
  timeOffId?: string;
}

interface WeekGroup {
  weekLabel: string;
  days: DayEntry[];
  total: number;
}

export default function IncomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [showPaycheckModal, setShowPaycheckModal] = useState(false);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDateEntries, setSelectedDateEntries] = useState<DailyIncome[]>([]);
  const [selectedTimeOff, setSelectedTimeOff] = useState<any>(null);
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [weeklyGroups, setWeeklyGroups] = useState<WeekGroup[]>([]);
  const [allDailyIncome, setAllDailyIncome] = useState<DailyIncome[]>([]);
  const [timeOffList, setTimeOffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAccountInfo();
    loadTimeOff();
    loadDailyIncome();
  }, [user]);

  useEffect(() => {
    // Regroup when time off list changes
    if (allDailyIncome.length > 0) {
      const grouped = groupByWeek(allDailyIncome, timeOffList);
      setWeeklyGroups(grouped);
    }
  }, [timeOffList]);

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

      // Group by week with time off
      const grouped = groupByWeek(data || [], timeOffList);
      setWeeklyGroups(grouped);
    } catch (error) {
      console.error('Error loading daily income:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeOff = async () => {
    if (!user) return;

    try {
      const today = new Date();
      
      const { data, error } = await supabase
        .from('time_off')
        .select('*')
        .eq('user_id', user.id)
        .gte('end_date', format(today, 'yyyy-MM-dd'))
        .order('start_date', { ascending: true });

      if (error) throw error;

      setTimeOffList(data || []);
    } catch (error) {
      console.error('Error loading time off:', error);
    }
  };

  const handleTimeOffPress = (timeOff: any) => {
    setSelectedTimeOff(timeOff);
    setShowTimeOffModal(true);
  };

  const handleTimeOffModalClose = () => {
    setShowTimeOffModal(false);
    setSelectedTimeOff(null);
  };

  const groupByWeek = (dailyIncome: DailyIncome[], timeOffEntries: any[]): WeekGroup[] => {
    const weeks: { [key: string]: WeekGroup } = {};
    const dayTotals: { [key: string]: { date: string; total: number } } = {};
    const allDates = new Set<string>();

    // First, aggregate amounts for each unique date
    dailyIncome.forEach((entry) => {
      allDates.add(entry.income_date);
      if (!dayTotals[entry.income_date]) {
        dayTotals[entry.income_date] = {
          date: entry.income_date,
          total: 0,
        };
      }
      dayTotals[entry.income_date].total += parseFloat(entry.amount.toString());
    });

    // Collect time off dates within the income date range
    const today = new Date();
    const endDate = addDays(today, 30);
    const timeOffDates: { [date: string]: any } = {};
    
    timeOffEntries.forEach((timeOff) => {
      const startDate = parseISO(timeOff.start_date);
      const endDateEntry = parseISO(timeOff.end_date);
      
      // Only include time off within the 30-day window
      let currentDate = startDate < today ? today : startDate;
      const finalDate = endDateEntry < endDate ? endDateEntry : endDate;
      
      while (currentDate <= finalDate) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        allDates.add(dateStr);
        if (!timeOffDates[dateStr]) {
          timeOffDates[dateStr] = [];
        }
        timeOffDates[dateStr].push(timeOff);
        currentDate = addDays(currentDate, 1);
      }
    });

    // Create week groups with both income and time off entries
    allDates.forEach((dateStr) => {
      const date = parseISO(dateStr);
      const weekStart = startOfWeek(date, { weekStartsOn: 0 });
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

      // Add income entry if exists
      if (dayTotals[dateStr]) {
        weeks[weekKey].days.push({
          date: dateStr,
          type: 'income',
          amount: dayTotals[dateStr].total,
        });
        weeks[weekKey].total += dayTotals[dateStr].total;
      }

      // Add time off entries if exist
      if (timeOffDates[dateStr]) {
        timeOffDates[dateStr].forEach((timeOff: any) => {
          weeks[weekKey].days.push({
            date: dateStr,
            type: 'time_off',
            timeOffName: timeOff.name,
            timeOffCapacity: timeOff.capacity,
            timeOffId: timeOff.id,
          });
        });
      }
    });

    // Sort weeks chronologically, then sort days within each week
    return Object.entries(weeks)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([, week]) => ({
        ...week,
        days: week.days.sort((a, b) => a.date.localeCompare(b.date))
      }));
  };

  const calculateRunningTotal = (days: DayEntry[], upToIndex: number): number => {
    const total = days.slice(0, upToIndex + 1).reduce((sum, day) => {
      if (day.type === 'income' && day.amount) {
        return sum + parseFloat(day.amount.toString());
      }
      return sum;
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
              <Text style={styles.planButtonText}>Schedule</Text>
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
            <RefreshControl refreshing={loading} onRefresh={() => {
              loadDailyIncome();
              loadTimeOff();
            }} />
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
                  const date = parseISO(day.date);
                  const dayLabel = format(date, 'EEE MMM d');
                  
                  if (day.type === 'time_off') {
                    return (
                      <TouchableOpacity
                        key={`${dayIndex}-${day.timeOffId}`}
                        style={[styles.timeOffRow, dayIndex === 0 && styles.firstDayRow]}
                        onPress={() => {
                          const timeOff = timeOffList.find(t => t.id === day.timeOffId);
                          if (timeOff) handleTimeOffPress(timeOff);
                        }}
                      >
                        <View style={styles.timeOffRowContent}>
                          <Text style={styles.timeOffRowLabel}>{dayLabel}</Text>
                          <View style={styles.timeOffRowBadge}>
                            <Ionicons name="calendar-outline" size={14} color="#f39c12" />
                            <Text style={styles.timeOffRowName}>{day.timeOffName}</Text>
                            <Text style={styles.timeOffRowCapacity}>{day.timeOffCapacity}%</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  }
                  
                  return (
                    <TouchableOpacity
                      key={dayIndex}
                      style={[styles.dayRow, dayIndex === 0 && styles.firstDayRow]}
                      onPress={() => handleDayPress(day.date)}
                    >
                      <Text style={styles.dayLabel}>{dayLabel}</Text>
                      <Text style={styles.dayAmount}>{formatDollar(parseFloat(day.amount!.toString()))}</Text>
                      <Text style={styles.dayRunningTotal}>{formatDollar(parseFloat(calculateRunningTotal(week.days, dayIndex).toString()))}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            </>
          )}

          {/* Upcoming Time Off Section */}
          {timeOffList.length > 0 && (
            <View style={styles.timeOffSection}>
              <Text style={styles.sectionTitle}>Upcoming Time Off</Text>
              {timeOffList.map((timeOff) => (
                <TouchableOpacity
                  key={timeOff.id}
                  style={styles.timeOffCard}
                  onPress={() => handleTimeOffPress(timeOff)}
                >
                  <View style={styles.timeOffHeader}>
                    <View style={styles.timeOffInfo}>
                      <Text style={styles.timeOffName}>{timeOff.name}</Text>
                      <Text style={styles.timeOffDates}>
                        {format(parseISO(timeOff.start_date), 'MMM d, yyyy')} - {format(parseISO(timeOff.end_date), 'MMM d, yyyy')}
                      </Text>
                      {timeOff.description && (
                        <Text style={styles.timeOffDescription}>{timeOff.description}</Text>
                      )}
                    </View>
                    <View style={styles.timeOffCapacity}>
                      <Text style={styles.capacityLabel}>{timeOff.capacity}%</Text>
                      <Text style={styles.capacitySubtext}>reduced</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

      <FloatingActionButton
        options={[
          {
            label: 'Add Time Off',
            icon: 'calendar-outline',
            onPress: () => {
              setSelectedTimeOff(null);
              setShowTimeOffModal(true);
            },
          },
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

      <TimeOffFormModal
        visible={showTimeOffModal}
        onClose={handleTimeOffModalClose}
        onSuccess={() => {
          loadTimeOff();
          handleTimeOffModalClose();
        }}
        editingTimeOff={selectedTimeOff}
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
  timeOffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    backgroundColor: '#fff9f0',
  },
  timeOffRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeOffRowLabel: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 2,
  },
  timeOffRowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
    flex: 3,
  },
  timeOffRowName: {
    fontSize: 13,
    color: '#e67e22',
    fontWeight: '600',
    flex: 1,
  },
  timeOffRowCapacity: {
    fontSize: 12,
    color: '#f39c12',
    fontWeight: 'bold',
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
  timeOffSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  timeOffCard: {
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
  timeOffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timeOffInfo: {
    flex: 1,
    marginRight: 12,
  },
  timeOffName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  timeOffDates: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  timeOffDescription: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  timeOffCapacity: {
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  capacityLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f39c12',
  },
  capacitySubtext: {
    fontSize: 11,
    color: '#e67e22',
  },
});
