import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import TabScreenHeader from '@/components/TabScreenHeader';
import WeekSummary from '@/components/WeekSummary';
import { useBills } from '@/contexts/BillsContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatDollar } from '@/lib/utils';
import { BillModel } from '@/models/BillModel';
import { startOfWeek, endOfWeek, addWeeks, isWithinInterval, format, parseISO } from 'date-fns';

export default function HomeScreen() {
  const router = useRouter();
  const { bills } = useBills();
  const { user } = useAuth();
  const [todayIncome, setTodayIncome] = useState(0);
  const [thisWeekIncome, setThisWeekIncome] = useState(0);
  const [nextWeekIncome, setNextWeekIncome] = useState(0);
  const [todayIncomeData, setTodayIncomeData] = useState<any[]>([]);
  const [thisWeekIncomeData, setThisWeekIncomeData] = useState<any[]>([]);
  const [nextWeekIncomeData, setNextWeekIncomeData] = useState<any[]>([]);
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);

  useEffect(() => {
    const loadIncome = async () => {
      if (!user) return;

      const today = new Date();
      const thisWeekEnd = endOfWeek(today, { weekStartsOn: 0 });
      const nextWeekStart = addWeeks(startOfWeek(today, { weekStartsOn: 0 }), 1);
      const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 0 });

      const { data: incomeData, error } = await supabase.rpc('generate_daily_income', {
        p_user_id: user.id,
        p_start_date: format(today, 'yyyy-MM-dd'),
        p_end_date: format(nextWeekEnd, 'yyyy-MM-dd'),
      });

      if (!error && incomeData) {
        let todayTotal = 0;
        let thisWeek = 0;
        let nextWeek = 0;
        const todayData: any[] = [];
        const thisWeekData: any[] = [];
        const nextWeekData: any[] = [];

        incomeData.forEach((item: any) => {
          const incomeDate = parseISO(item.income_date);
          const amount = parseFloat(item.amount);

          if (format(incomeDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
            todayTotal += amount;
            todayData.push(item);
          }

          if (isWithinInterval(incomeDate, { start: today, end: thisWeekEnd })) {
            thisWeek += amount;
            thisWeekData.push(item);
          } else if (isWithinInterval(incomeDate, { start: nextWeekStart, end: nextWeekEnd })) {
            nextWeek += amount;
            nextWeekData.push(item);
          }
        });

        setTodayIncome(todayTotal);
        setThisWeekIncome(thisWeek);
        setNextWeekIncome(nextWeek);
        setTodayIncomeData(todayData);
        setThisWeekIncomeData(thisWeekData);
        setNextWeekIncomeData(nextWeekData);
      }
    };

    loadIncome();
  }, [user]);

  const togglePeriod = (period: string) => {
    setExpandedPeriod(expandedPeriod === period ? null : period);
  };

  const { thisWeekBills, nextWeekBills, thisWeekTotal, nextWeekTotal, todayBills, todayTotal } = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const thisWeekEnd = endOfWeek(today, { weekStartsOn: 0 }); // Sunday
    const nextWeekStart = addWeeks(startOfWeek(today, { weekStartsOn: 0 }), 1);
    const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 0 });

    const todayList: BillModel[] = [];
    const thisWeek: BillModel[] = [];
    const nextWeek: BillModel[] = [];
    let todaySum = 0;
    let thisTotal = 0;
    let nextTotal = 0;

    bills.forEach(bill => {
      if (!bill.next_due_date || bill.deferred_flag) return;

      const dueDate = parseISO(bill.next_due_date);
      
      // Calculate bill amount
      let amount: number;
      if (bill.is_variable) {
        amount = bill.statement_minimum_due || bill.updated_balance || bill.statement_balance || 0;
      } else {
        amount = bill.remaining_amount || bill.amount || 0;
      }

      if (format(dueDate, 'yyyy-MM-dd') === todayStr) {
        todayList.push(bill);
        todaySum += amount;
      }

      if (isWithinInterval(dueDate, { start: today, end: thisWeekEnd })) {
        thisWeek.push(bill);
        thisTotal += amount;
      } else if (isWithinInterval(dueDate, { start: nextWeekStart, end: nextWeekEnd })) {
        nextWeek.push(bill);
        nextTotal += amount;
      }
    });

    return {
      todayBills: todayList,
      todayTotal: todaySum,
      thisWeekBills: thisWeek,
      nextWeekBills: nextWeek,
      thisWeekTotal: thisTotal,
      nextWeekTotal: nextTotal,
    };
  }, [bills]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <TabScreenHeader
          title="Home"
          rightContent={
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <TouchableOpacity onPress={() => router.push('/goals')}>
                <Ionicons name="flag" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/settings')}>
                <Ionicons name="settings" size={24} color="white" />
              </TouchableOpacity>
            </View>
          }
        />

        <ScrollView style={styles.content}>
          {/* Today Section */}
          <WeekSummary
            title="Today"
            income={todayIncome}
            bills={todayBills}
            total={todayTotal}
            incomeBreakdown={todayIncomeData}
            isExpanded={expandedPeriod === 'today'}
            onToggleExpand={() => togglePeriod('today')}
          />

          {/* This Week Section */}
          <WeekSummary
            title="This Week"
            income={thisWeekIncome}
            bills={thisWeekBills}
            total={thisWeekTotal}
            incomeBreakdown={thisWeekIncomeData}
            isExpanded={expandedPeriod === 'thisWeek'}
            onToggleExpand={() => togglePeriod('thisWeek')}
          />

          {/* Next Week Section */}
          <WeekSummary
            title="Next Week"
            income={nextWeekIncome}
            bills={nextWeekBills}
            total={nextWeekTotal}
            incomeBreakdown={nextWeekIncomeData}
            isExpanded={expandedPeriod === 'nextWeek'}
            onToggleExpand={() => togglePeriod('nextWeek')}
          />

          {/* Next Big Bills Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next Big Bills</Text>
            <View style={styles.card}>
              <View style={styles.billItem}>
                <View style={styles.billInfo}>
                  <Text style={styles.billName}>Rent</Text>
                  <Text style={styles.billDueDate}>Due Jan 1, 2026</Text>
                </View>
                <Text style={styles.billAmount}>$1,200.00</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.billItem}>
                <View style={styles.billInfo}>
                  <Text style={styles.billName}>Car Payment</Text>
                  <Text style={styles.billDueDate}>Due Jan 5, 2026</Text>
                </View>
                <Text style={styles.billAmount}>$350.00</Text>
              </View>
            </View>
          </View>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  cardRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    marginTop: 8,
    paddingTop: 16,
  },
  cardLabel: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  cardLabelBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  cardValueBold: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 4,
  },
  billDueDate: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e74c3c',
  },
  divider: {
    height: 1,
    backgroundColor: '#ecf0f1',
    marginVertical: 8,
  },
});
