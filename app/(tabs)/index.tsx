import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import TabScreenHeader from '@/components/TabScreenHeader';
import BillFormModal from '@/components/modals/BillFormModal';
import DepositFormModal from '@/components/modals/DepositFormModal';
import BillDetailsModal from '@/components/modals/BillDetailsModal';
import AccountBalanceModal from '@/components/modals/AccountBalanceModal';
import FinancialGoalFormModal from '@/components/modals/FinancialGoalFormModal';
import FinancialGoalDetailsModal from '@/components/modals/FinancialGoalDetailsModal';
import AgendaModal from '@/components/modals/AgendaModal';
import PendingEarningsModal from '@/components/modals/PendingEarningsModal';
import WeeklyGoalsModal from '@/components/modals/WeeklyGoalsModal';
import WeeklyEarningsModal from '@/components/modals/WeeklyEarningsModal';
import IncomeSourceDetailsModal from '@/components/modals/IncomeSourceDetailsModal';
import { useBills } from '@/contexts/BillsContext';
import { useIncome } from '@/contexts/IncomeContext';
import { BillModel } from '@/models/BillModel';
import { FinancialGoal } from '@/types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isToday, isSameDay, differenceInDays, parseISO, startOfDay } from 'date-fns';
import AnimatedNumber from '@/components/AnimatedNumber';

type AgendaView = 'daily' | 'weekly' | 'monthly' | 'later';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { bills, loadBills } = useBills();
  const { getTotalPendingEarnings, getTotalDailyEarnings } = useIncome();
  const [dailyEarnings, setDailyEarnings] = useState<number>(0);
  const [weeklyEarnings, setWeeklyEarnings] = useState<number>(0);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(0);
  const [activeAgenda, setActiveAgenda] = useState<AgendaView | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showAccountBalanceModal, setShowAccountBalanceModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillModel | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showGoalDetailsModal, setShowGoalDetailsModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);
  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>([]);
  const [showPendingEarningsModal, setShowPendingEarningsModal] = useState(false);
  const [showWeeklyGoalsModal, setShowWeeklyGoalsModal] = useState(false);
  const [showWeeklyEarningsModal, setShowWeeklyEarningsModal] = useState(false);
  const [showIncomeSourceDetailsModal, setShowIncomeSourceDetailsModal] = useState(false);
  const [selectedIncomeSource, setSelectedIncomeSource] = useState<any>(null);
  const [nextGoal, setNextGoal] = useState<FinancialGoal | null>(null);
  const [dailyEarningsGoal, setDailyEarningsGoal] = useState<number>(0);

  const loadAccountBalance = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('account_info')
        .select('account_balance, daily_earnings_goal')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading account balance:', error);
      }

      if (data) {
        setAccountBalance(data.account_balance);
      }

      // Load daily goal from weekly_income_goals based on current day
      await loadDailyGoalFromWeekly();
    } catch (err) {
      console.error('Error loading account balance:', err);
    }
  };

  const loadDailyGoalFromWeekly = async () => {
    if (!user) return;

    try {
      const today = new Date();
      const dayName = format(today, 'EEEE').toLowerCase(); // "sunday", "monday", etc.
      const year = today.getFullYear();
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const oneJan = new Date(year, 0, 1);
      const numberOfDays = Math.floor((weekStart.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
      const currentYearWeek = `${year}-W${String(weekNumber).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('weekly_income_goals')
        .select('*')
        .eq('user_id', user.id)
        .or(`ending_year_week.is.null,ending_year_week.eq.${currentYearWeek}`)
        .order('starting_year_week', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading weekly goal:', error);
      }

      if (data) {
        const dailyFieldName = `${dayName}_income`;
        setDailyEarningsGoal(data[dailyFieldName] || 0);
      } else {
        setDailyEarningsGoal(0);
      }
    } catch (err) {
      console.error('Error loading daily goal from weekly:', err);
    }
  };

  const loadDailyEarnings = async () => {
    const total = await getTotalDailyEarnings();
    setDailyEarnings(total);
  };

  const loadWeeklyEarnings = async () => {
    if (!user) return;

    try {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
      
      const { data, error } = await supabase
        .from('income_source_daily_earnings')
        .select('earnings_amount')
        .eq('user_id', user.id)
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'));

      if (error) throw error;

      const total = data?.reduce((sum, record) => sum + record.earnings_amount, 0) || 0;
      setWeeklyEarnings(total);

      // Load weekly goal
      const currentYearWeek = format(weekStart, 'yyyy') + '-W' + format(weekStart, 'ww');
      const { data: goalData } = await supabase
        .from('weekly_income_goals')
        .select('total_income')
        .eq('user_id', user.id)
        .or(`ending_year_week.is.null,ending_year_week.gte.${currentYearWeek}`)
        .lte('starting_year_week', currentYearWeek)
        .order('starting_year_week', { ascending: false })
        .limit(1)
        .single();

      setWeeklyGoal(goalData?.total_income || 0);
    } catch (err) {
      console.error('Error loading weekly earnings:', err);
    }
  };

  const loadFinancialGoals = async () => {
    if (!user) return;

    try {
      const currentMonth = format(new Date(), 'yyyy-MM');
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('due_month', currentMonth)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setFinancialGoals(data || []);
    } catch (err) {
      console.error('Error loading financial goals:', err);
    }
  };

  const loadNextGoal = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .not('due_date', 'is', null)
        .gte('due_date', today)
        .order('due_date', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading next goal:', error);
      }

      setNextGoal(data || null);
    } catch (err) {
      console.error('Error loading next goal:', err);
    }
  };

  useEffect(() => {
    loadBills();
    loadAccountBalance();
    loadFinancialGoals();
    loadNextGoal();
    loadDailyEarnings();
    loadWeeklyEarnings();
  }, []);

  const getDailyBills = () => {
    const today = new Date();
    return bills.filter((bill) => {
      if (bill.due_date) {
        return isToday(new Date(bill.due_date));
      }
      if (bill.due_day) {
        return today.getDate() === bill.due_day;
      }
      return false;
    });
  };

  const getWeeklyBills = () => {
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    return bills.filter((bill) => {
      if (bill.due_date) {
        const dueDate = new Date(bill.due_date);
        return dueDate >= weekStart && dueDate <= weekEnd;
      }
      if (bill.due_day) {
        // Check if due_day falls within this week
        const today = new Date();
        for (let i = 0; i < 7; i++) {
          const day = addDays(weekStart, i);
          if (day.getDate() === bill.due_day && day.getMonth() === today.getMonth()) {
            return true;
          }
        }
      }
      return false;
    });
  };

  const getMonthlyBills = () => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    return bills.filter((bill) => {
      if (bill.due_date) {
        const dueDate = new Date(bill.due_date);
        return dueDate >= monthStart && dueDate <= monthEnd;
      }
      if (bill.due_day) {
        return true; // All recurring bills fall in every month
      }
      return false;
    });
  };

  const getBillsWithoutDueDate = () => {
    return bills.filter(bill => !bill.due_date && !bill.due_day);
  };

  const handleBillClick = (bill: BillModel) => {
    setSelectedBill(bill);
    setShowDetailsModal(true);
  };

  const handleWidgetClick = (view: AgendaView) => {
    setActiveAgenda(view);
  };

  const getNextGoalRemaining = () => {
    if (!nextGoal) return 0;
    
    const availableFunds = (accountBalance || 0) + getTotalPendingEarnings();
    const remaining = Math.max(0, nextGoal.target_amount - availableFunds);
    return remaining;
  };

  const getDaysUntilGoal = () => {
    if (!nextGoal?.due_date) return 0;
    const today = startOfDay(new Date());
    const dueDate = startOfDay(parseISO(nextGoal.due_date));
    return differenceInDays(dueDate, today);
  };

  const getAgendaBills = () => {
    switch (activeAgenda) {
      case 'daily':
        return getDailyBills();
      case 'weekly':
        return getWeeklyBills();
      case 'monthly':
        return getMonthlyBills();
      case 'later':
        return getBillsWithoutDueDate();
      default:
        return [];
    }
  };

  const getAgendaTitle = () => {
    switch (activeAgenda) {
      case 'daily':
        return 'Daily Agenda';
      case 'weekly':
        return 'Weekly Agenda';
      case 'monthly':
        return 'Monthly Agenda';
      case 'later':
        return 'Later';
      default:
        return '';
    }
  };

  const getWidgetCount = (view: AgendaView) => {
    switch (view) {
      case 'daily':
        return getDailyBills().length;
      case 'weekly':
        return getWeeklyBills().length;
      case 'monthly':
        return getMonthlyBills().length;
      case 'later':
        return getBillsWithoutDueDate().length;
      default:
        return 0;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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

        {/* Widget Grid */}
        <ScrollView style={styles.content}>
          <View style={styles.widgetGrid}>
            {/* Account Balance Widget */}
            {accountBalance !== null && (
              <TouchableOpacity
                style={[styles.widget, styles.widgetBalance]}
                onPress={() => setShowAccountBalanceModal(true)}
              >
                <Ionicons name="wallet" size={32} color="white" />
                <Text style={styles.widgetTitle}>Account Balance</Text>
                <AnimatedNumber
                  value={accountBalance}
                  style={styles.widgetAmount}
                  prefix="$"
                  decimals={2}
                />
              </TouchableOpacity>
            )}

            {/* Daily Earnings Widget */}
            <TouchableOpacity
              style={[styles.widget, styles.widgetEarnings]}
              onPress={() => setShowPendingEarningsModal(true)}
            >
              <Ionicons name="cash" size={32} color="white" />
              <Text style={styles.widgetTitle}>Daily Earnings</Text>
              <View style={styles.earningsAmountRow}>
                <AnimatedNumber
                  value={dailyEarnings}
                  style={styles.widgetAmount}
                  prefix="$"
                  decimals={0}
                />
                {dailyEarningsGoal > 0 && (
                  <>
                    <Text style={styles.widgetAmount}> / </Text>
                    <AnimatedNumber
                      value={dailyEarningsGoal}
                      style={styles.widgetAmount}
                      prefix="$"
                      decimals={0}
                    />
                  </>
                )}
              </View>
              {dailyEarningsGoal > 0 && (
                <Text style={styles.widgetGoalLabel}>
                  <AnimatedNumber
                    value={Math.max(0, dailyEarningsGoal - dailyEarnings)}
                    style={styles.widgetGoalText}
                    prefix="$"
                    suffix=" To Go"
                    decimals={0}
                  />
                </Text>
              )}
            </TouchableOpacity>

            {/* Weekly Earnings Widget */}
            <TouchableOpacity
              style={[styles.widget, styles.widgetWeekly]}
              onPress={() => setShowWeeklyEarningsModal(true)}
            >
              <Ionicons name="calendar" size={32} color="white" />
              <Text style={styles.widgetTitle}>Weekly Earnings</Text>
              <View style={styles.earningsAmountRow}>
                <AnimatedNumber
                  value={weeklyEarnings}
                  style={styles.widgetAmount}
                  prefix="$"
                  decimals={0}
                />
                {weeklyGoal > 0 && (
                  <>
                    <Text style={styles.widgetAmount}> / </Text>
                    <AnimatedNumber
                      value={weeklyGoal}
                      style={styles.widgetAmount}
                      prefix="$"
                      decimals={0}
                    />
                  </>
                )}
              </View>
            </TouchableOpacity>

            {/* Next Financial Goal Widget */}
            {nextGoal && (
              <TouchableOpacity
                style={[styles.widget, styles.widgetGoal]}
                onPress={() => {
                  setSelectedGoal(nextGoal);
                  setShowGoalDetailsModal(true);
                }}
              >
                <View style={styles.goalWidgetHeader}>
                  <Ionicons name="flag" size={28} color="white" />
                  <Text style={styles.goalDueText}>
                    Due in {getDaysUntilGoal()} {getDaysUntilGoal() === 1 ? 'Day' : 'Days'}
                  </Text>
                </View>
                <Text style={styles.goalWidgetName} numberOfLines={1}>
                  {nextGoal.name}
                </Text>
                <View style={styles.goalWidgetAmounts}>
                  <AnimatedNumber
                    value={nextGoal.target_amount}
                    style={styles.goalWidgetAmount}
                    prefix="$"
                    decimals={2}
                  />
                  <AnimatedNumber
                    value={getNextGoalRemaining()}
                    style={styles.goalWidgetRemaining}
                    prefix="$"
                    suffix=" needed"
                    decimals={2}
                  />
                </View>
              </TouchableOpacity>
            )}

            {/* Daily Widget */}
            <TouchableOpacity
              style={[styles.widget, styles.widgetDaily]}
              onPress={() => handleWidgetClick('daily')}
            >
              <Ionicons name="today" size={32} color="white" />
              <Text style={styles.widgetTitle}>Daily</Text>
              <Text style={styles.widgetCount}>{getWidgetCount('daily')} items</Text>
            </TouchableOpacity>

            {/* Weekly Widget */}
            <TouchableOpacity
              style={[styles.widget, styles.widgetWeekly]}
              onPress={() => handleWidgetClick('weekly')}
            >
              <Ionicons name="calendar" size={32} color="white" />
              <Text style={styles.widgetTitle}>Weekly</Text>
              <Text style={styles.widgetCount}>{getWidgetCount('weekly')} items</Text>
            </TouchableOpacity>

            {/* Monthly Widget */}
            <TouchableOpacity
              style={[styles.widget, styles.widgetMonthly]}
              onPress={() => handleWidgetClick('monthly')}
            >
              <Ionicons name="calendar-outline" size={32} color="white" />
              <Text style={styles.widgetTitle}>Monthly</Text>
              <Text style={styles.widgetCount}>{getWidgetCount('monthly')} items</Text>
            </TouchableOpacity>

            {/* Later Widget */}
            <TouchableOpacity
              style={[styles.widget, styles.widgetLater]}
              onPress={() => handleWidgetClick('later')}
            >
              <Ionicons name="time" size={32} color="white" />
              <Text style={styles.widgetTitle}>Later</Text>
              <Text style={styles.widgetCount}>{getWidgetCount('later')} items</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Floating Action Button */}
        <View style={styles.fabContainer}>
          {fabOpen && (
            <>
              <TouchableOpacity
                style={styles.fabOption}
                onPress={() => {
                  setShowBillModal(true);
                  setFabOpen(false);
                }}
              >
                <View style={styles.fabLabel}>
                  <Text style={styles.fabLabelText}>Add Bill</Text>
                </View>
                <View style={styles.fabOptionButton}>
                  <Ionicons name="receipt" size={24} color="white" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fabOption}
                onPress={() => {
                  setShowDepositModal(true);
                  setFabOpen(false);
                }}
              >
                <View style={styles.fabLabel}>
                  <Text style={styles.fabLabelText}>Add Deposit</Text>
                </View>
                <View style={styles.fabOptionButton}>
                  <Ionicons name="cash" size={24} color="white" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fabOption}
                onPress={() => {
                  setShowExpenseModal(true);
                  setFabOpen(false);
                }}
              >
                <View style={styles.fabLabel}>
                  <Text style={styles.fabLabelText}>Add Expense</Text>
                </View>
                <View style={styles.fabOptionButton}>
                  <Ionicons name="wallet" size={24} color="white" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fabOption}
                onPress={() => {
                  setSelectedGoal(null);
                  setShowGoalModal(true);
                  setFabOpen(false);
                }}
              >
                <View style={styles.fabLabel}>
                  <Text style={styles.fabLabelText}>Add Financial Goal</Text>
                </View>
                <View style={styles.fabOptionButton}>
                  <Ionicons name="flag" size={24} color="white" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fabOption}
                onPress={() => {
                  setShowWeeklyGoalsModal(true);
                  setFabOpen(false);
                }}
              >
                <View style={styles.fabLabel}>
                  <Text style={styles.fabLabelText}>Set Weekly Income Goals</Text>
                </View>
                <View style={styles.fabOptionButton}>
                  <Ionicons name="calendar" size={24} color="white" />
                </View>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.fab, fabOpen && styles.fabOpen]}
            onPress={() => setFabOpen(!fabOpen)}
          >
            <Ionicons name={fabOpen ? "close" : "add"} size={28} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modals */}
      <BillFormModal
        visible={showBillModal}
        onClose={() => setShowBillModal(false)}
        editingBill={null}
      />

      <DepositFormModal
        visible={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        editingDeposit={null}
      />

      <BillDetailsModal
        visible={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedBill(null);
        }}
        onSuccess={() => {
          loadBills();
          setShowDetailsModal(false);
          setSelectedBill(null);
        }}
        bill={selectedBill}
      />

      <AccountBalanceModal
        visible={showAccountBalanceModal}
        onClose={() => setShowAccountBalanceModal(false)}
        onSuccess={() => {
          loadAccountBalance();
        }}
      />

      <FinancialGoalFormModal
        visible={showGoalModal}
        goal={selectedGoal}
        onClose={() => {
          setShowGoalModal(false);
          setSelectedGoal(null);
        }}
        onSuccess={() => {
          loadFinancialGoals();
          loadNextGoal();
          setShowGoalModal(false);
          setSelectedGoal(null);
        }}
      />

      <FinancialGoalDetailsModal
        visible={showGoalDetailsModal}
        goal={selectedGoal}
        onClose={() => {
          setShowGoalDetailsModal(false);
          setSelectedGoal(null);
        }}
        onUpdate={() => {
          loadFinancialGoals();
          loadNextGoal();
        }}
      />

      <PendingEarningsModal
        visible={showPendingEarningsModal}
        onClose={() => setShowPendingEarningsModal(false)}
        dailyEarningsGoal={dailyEarningsGoal}
        onGoalUpdate={setDailyEarningsGoal}
        onOpenDetails={(source) => {
          setSelectedIncomeSource(source);
          setShowIncomeSourceDetailsModal(true);
        }}
      />

      <IncomeSourceDetailsModal
        visible={showIncomeSourceDetailsModal}
        onClose={() => {
          setShowIncomeSourceDetailsModal(false);
          setSelectedIncomeSource(null);
        }}
        incomeSource={selectedIncomeSource}
        onUpdate={() => {
          loadAccountBalance();
        }}
      />

      <AgendaModal
        visible={activeAgenda !== null}
        onClose={() => setActiveAgenda(null)}
        title={getAgendaTitle()}
        bills={getAgendaBills()}
        onBillClick={handleBillClick}
      />

      <WeeklyGoalsModal
        visible={showWeeklyGoalsModal}
        onClose={() => setShowWeeklyGoalsModal(false)}
        onSuccess={() => {
          loadAccountBalance();
          setShowWeeklyGoalsModal(false);
        }}
      />

      <WeeklyEarningsModal
        visible={showWeeklyEarningsModal}
        onClose={() => {
          setShowWeeklyEarningsModal(false);
          loadWeeklyEarnings(); // Refresh data after closing
        }}
      />

      {/* Temporary Expense Modal - placeholder */}
      <Modal
        visible={showExpenseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowExpenseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowExpenseModal(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowExpenseModal(false)}>
                <Text style={styles.modalButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Expense</Text>
              <TouchableOpacity onPress={() => setShowExpenseModal(false)}>
                <Text style={[styles.modalButton, styles.saveButton]}>Save</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.placeholderText}>Expense form coming soon...</Text>
            </View>
          </View>
        </View>
      </Modal>
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
  widgetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  widget: {
    width: '48%',
    aspectRatio: 1.2,
    borderRadius: 16,
    padding: 20,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  widgetEarnings: {
    flexDirection: 'column',
    backgroundColor: '#2ecc71',
  },
  widgetBalance: {
    backgroundColor: '#1abc9c',
  },
  widgetDaily: {
    backgroundColor: '#3498db',
  },
  widgetWeekly: {
    backgroundColor: '#9b59b6',
  },
  widgetMonthly: {
    backgroundColor: '#e67e22',
  },
  widgetLater: {
    backgroundColor: '#95a5a6',
  },
  widgetGoal: {
    backgroundColor: '#f39c12',
  },
  widgetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginTop: 8,
  },
  earningsAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  widgetAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  widgetGoalText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  widgetGoalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },
  widgetCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  goalWidgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalDueText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    textTransform: 'uppercase',
  },
  goalWidgetName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginTop: 8,
  },
  goalWidgetAmounts: {
    marginTop: 4,
  },
  goalWidgetAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  goalWidgetRemaining: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    alignItems: 'flex-end',
  },
  fabOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fabLabel: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  fabLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  fabOptionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3498db',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3498db',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  fabOpen: {
    backgroundColor: '#e74c3c',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  saveButton: {
    color: '#3498db',
  },
  modalContent: {
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: '#95a5a6',
    textAlign: 'center',
    paddingVertical: 40,
  },
  goalsSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  goalCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  goalDescription: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  goalAmounts: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  goalRemaining: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#ecf0f1',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2ecc71',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
    textAlign: 'right',
  },
});
