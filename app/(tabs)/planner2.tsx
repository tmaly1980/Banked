import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

type BillType = 'housing' | 'utilities' | 'food_gas' | 'loans' | 'debts';

interface DailyIncome {
  [day: number]: {
    gig_income: number;
    project_hours: number;
  };
}

interface IncomeConfig {
  project_income_per_month: number;
  daily_income: DailyIncome;
}

interface PlannerBill {
  id: string;
  bill_type: BillType;
  due_day: number | null;
  name: string;
  amount: number;
}

const BILL_TYPES: { key: BillType; label: string }[] = [
  { key: 'housing', label: 'Housing' },
  { key: 'utilities', label: 'Utilities' },
  { key: 'food_gas', label: 'Food & Gas' },
  { key: 'loans', label: 'Loans' },
  { key: 'debts', label: 'Debts' },
];

export default function PlannerScreen() {
  const [loading, setLoading] = useState(true);
  const [dailyIncome, setDailyIncome] = useState<DailyIncome>({});
  const [projectIncomePerMonth, setProjectIncomePerMonth] = useState(0);
  const [bills, setBills] = useState<PlannerBill[]>([]);
  const [activeBillType, setActiveBillType] = useState<BillType>('housing');
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  
  // Get current month info
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  
  // New bill form
  const [newBill, setNewBill] = useState({ due_day: '', name: '', amount: '' });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Recalculate income from daily entries
    const gigIncome = Object.values(dailyIncome).reduce((sum, day) => sum + (day.gig_income || 0), 0);
    const totalIncome = gigIncome + projectIncomePerMonth;
    setMonthlyIncome(totalIncome);
  }, [dailyIncome, projectIncomePerMonth]);

  const updateDailyIncome = (day: number, field: 'gig_income' | 'project_hours', value: number) => {
    setDailyIncome(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        gig_income: prev[day]?.gig_income || 0,
        project_hours: prev[day]?.project_hours || 0,
        [field]: value,
      },
    }));
  };

  const getGigIncomeTotal = () => {
    return Object.values(dailyIncome).reduce((sum, day) => sum + (day.gig_income || 0), 0);
  };

  const saveGigIncome = async (day: number, amount: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const date = new Date(year, month, day).toISOString().split('T')[0];

      const { error } = await supabase
        .from('planner_gig_income')
        .upsert({
          user_id: user.id,
          date: date,
          amount: amount,
        }, {
          onConflict: 'user_id,date',
        });

      if (error) throw error;
    } catch (error) {
      console.error('[Planner] Error saving gig income:', error);
    }
  };

  const saveProjectHours = async (day: number, hours: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const date = new Date(year, month, day).toISOString().split('T')[0];

      const { error } = await supabase
        .from('planner_project_hours')
        .upsert({
          user_id: user.id,
          date: date,
          hours: hours,
        }, {
          onConflict: 'user_id,date',
        });

      if (error) throw error;
    } catch (error) {
      console.error('[Planner] Error saving project hours:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load income config
      const { data: incomeData, error: incomeError } = await supabase
        .from('planner_income_config')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (incomeError) throw incomeError;

      if (incomeData) {
        setProjectIncomePerMonth(incomeData.project_income_per_month || 0);
      }

      // Load daily gig income for current month
      const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
      const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const { data: gigIncomeData, error: gigIncomeError } = await supabase
        .from('planner_gig_income')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      if (gigIncomeError) throw gigIncomeError;

      const { data: projectHoursData, error: projectHoursError } = await supabase
        .from('planner_project_hours')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      if (projectHoursError) throw projectHoursError;

      // Populate dailyIncome state from database
      const loadedDailyIncome: DailyIncome = {};
      gigIncomeData?.forEach(entry => {
        const day = new Date(entry.date).getDate();
        if (!loadedDailyIncome[day]) loadedDailyIncome[day] = { gig_income: 0, project_hours: 0 };
        loadedDailyIncome[day].gig_income = entry.amount;
      });
      projectHoursData?.forEach(entry => {
        const day = new Date(entry.date).getDate();
        if (!loadedDailyIncome[day]) loadedDailyIncome[day] = { gig_income: 0, project_hours: 0 };
        loadedDailyIncome[day].project_hours = entry.hours;
      });
      setDailyIncome(loadedDailyIncome);

      // Load bills
      const { data: billsData, error: billsError } = await supabase
        .from('planner_bills')
        .select('*')
        .eq('user_id', user.id)
        .order('due_day', { ascending: true });

      if (billsError) throw billsError;

      setBills(billsData || []);
    } catch (error) {
      console.error('[Planner] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };



  const handleAddBill = async () => {
    if (!newBill.name.trim() || !newBill.amount) return;

    const dueDay = newBill.due_day.trim() ? parseInt(newBill.due_day) : null;
    const amount = parseFloat(newBill.amount);

    if (dueDay !== null && (isNaN(dueDay) || dueDay < 1 || dueDay > 31)) return;
    if (isNaN(amount) || amount <= 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('planner_bills')
        .insert({
          user_id: user.id,
          bill_type: activeBillType,
          due_day: dueDay,
          name: newBill.name.trim(),
          amount: amount,
        })
        .select()
        .single();

      if (error) throw error;

      setBills([...bills, data]);
      setNewBill({ due_day: '', name: '', amount: '' });
    } catch (error) {
      console.error('[Planner] Error adding bill:', error);
    }
  };

  const handleDeleteBill = async (billId: string) => {
    try {
      const { error } = await supabase
        .from('planner_bills')
        .delete()
        .eq('id', billId);

      if (error) throw error;

      setBills(bills.filter(b => b.id !== billId));
    } catch (error) {
      console.error('[Planner] Error deleting bill:', error);
    }
  };

  const getBillTotal = (type: BillType) => {
    return bills
      .filter(b => b.bill_type === type)
      .reduce((sum, b) => sum + b.amount, 0);
  };

  const getTotalBills = () => {
    return bills.reduce((sum, b) => sum + b.amount, 0);
  };

  const activeBills = bills.filter(b => b.bill_type === activeBillType);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Income Section */}
        <View style={styles.section}>
        <Text style={styles.sectionTitle}>Income</Text>
        
        {/* Calendar Grid */}
        <View style={styles.calendar}>
          {/* Day headers */}
          <View style={styles.calendarHeader}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <Text key={i} style={styles.calendarHeaderText}>{day}</Text>
            ))}
          </View>
          
          {/* Calendar days */}
          <View style={styles.calendarGrid}>
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.calendarDay} />
            ))}
            
            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              return (
                <View key={day} style={styles.calendarDay}>
                  <Text style={styles.dayNumber}>{day}</Text>
                  <TextInput
                    style={styles.gigIncomeInput}
                    value={dailyIncome[day]?.gig_income?.toString() || ''}
                    onChangeText={(val) => updateDailyIncome(day, 'gig_income', parseFloat(val) || 0)}
                    onBlur={() => saveGigIncome(day, dailyIncome[day]?.gig_income || 0)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    maxLength={3}
                  />
                  <TextInput
                    style={styles.projectHoursInput}
                    value={dailyIncome[day]?.project_hours?.toString() || ''}
                    onChangeText={(val) => updateDailyIncome(day, 'project_hours', parseFloat(val) || 0)}
                    onBlur={() => saveProjectHours(day, dailyIncome[day]?.project_hours || 0)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    maxLength={2}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* Income Summary */}
        <View style={styles.incomeSummary}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: '#27ae60' }]}>Gig Work Income:</Text>
            <Text style={styles.summaryAmount}>${getGigIncomeTotal().toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: '#3498db' }]}>Project Work Income:</Text>
            <TextInput
              style={styles.projectIncomeInput}
              value={projectIncomePerMonth.toString()}
              onChangeText={(val) => setProjectIncomePerMonth(parseFloat(val) || 0)}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </View>
        </View>

        <View style={styles.incomeResult}>
          <Text style={styles.incomeLabel}>Total Monthly Income</Text>
          <Text style={styles.incomeAmount}>${monthlyIncome.toFixed(2)}</Text>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill, 
              { 
                width: `${(monthlyIncome / Math.max(monthlyIncome, getTotalBills())) * 100}%`, 
                backgroundColor: '#27ae60' 
              }
            ]} />
          </View>
        </View>
      </View>

      {/* Bills Section */}
      <View style={styles.section}>

        {/* Total Bills Progress */}
        <View style={styles.totalBills}>
          <Text style={styles.totalBillsLabel}>Total Bills</Text>
          <Text style={styles.totalBillsAmount}>${getTotalBills().toFixed(2)}</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${(getTotalBills() / Math.max(monthlyIncome, getTotalBills())) * 100}%`,
                  backgroundColor: '#e74c3c' 
                }
              ]} 
            />
          </View>
          <Text style={styles.remainingText}>
            Remaining: ${Math.max(monthlyIncome - getTotalBills(), 0).toFixed(2)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Bills</Text>

        {/* Bill Type Tabs */}
        <View style={styles.tabs}>
          {BILL_TYPES.map(type => (
            <TouchableOpacity
              key={type.key}
              style={[styles.tab, activeBillType === type.key && styles.activeTab]}
              onPress={() => setActiveBillType(type.key)}
            >
              <Text style={[styles.tabText, activeBillType === type.key && styles.activeTabText]}>
                {type.label}
              </Text>
              <Text style={[styles.tabTotal, activeBillType === type.key && styles.activeTabTotal]}>
                ${getBillTotal(type.key).toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Add Bill Form */}
        <View style={styles.addBillForm}>
          <TextInput
            style={[styles.input, styles.billInput, { flex: 1 }]}
            value={newBill.due_day}
            onChangeText={(val) => setNewBill({ ...newBill, due_day: val })}
            keyboardType="number-pad"
            placeholder="Day"
            placeholderTextColor="#95a5a6"
          />
          <TextInput
            style={[styles.input, styles.billInput, { flex: 2 }]}
            value={newBill.name}
            onChangeText={(val) => setNewBill({ ...newBill, name: val })}
            placeholder="Name"
            placeholderTextColor="#95a5a6"
          />
          <TextInput
            style={[styles.input, styles.billInput, { flex: 1.5 }]}
            value={newBill.amount}
            onChangeText={(val) => setNewBill({ ...newBill, amount: val })}
            keyboardType="decimal-pad"
            placeholder="Amount"
            placeholderTextColor="#95a5a6"
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddBill}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Bill List */}
        <View style={styles.billList}>
          {activeBills.map(bill => (
            <View key={bill.id} style={styles.billRow}>
              <Text style={styles.billDay}>{bill.due_day}</Text>
              <Text style={styles.billName}>{bill.name}</Text>
              <Text style={styles.billAmount}>${bill.amount.toFixed(2)}</Text>
              <TouchableOpacity onPress={() => handleDeleteBill(bill.id)}>
                <Ionicons name="close-circle" size={24} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: 'white',
    // margin: 16,
    padding: 8,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 16,
  },
  incomeColumns: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: 'white',
  },
  calendar: {
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 0.8,
    padding: 4,
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  gigIncomeInput: {
    width: '100%',
    backgroundColor: '#27ae60',
    borderWidth: 1,
    borderColor: '#229954',
    borderRadius: 4,
    padding: 4,
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 2,
  },
  projectHoursInput: {
    width: '100%',
    backgroundColor: '#3498db',
    borderWidth: 1,
    borderColor: '#2980b9',
    borderRadius: 4,
    padding: 4,
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  incomeSummary: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#27ae60',
  },
  projectIncomeInput: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 6,
    padding: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    backgroundColor: 'white',
    minWidth: 120,
    textAlign: 'right',
  },
  incomeResult: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  incomeLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  incomeAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#27ae60',
    marginBottom: 12,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#ecf0f1',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // flexWrap: 'wrap',
    // gap: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#3498db',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  activeTabText: {
    color: 'white',
  },
  tabTotal: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
  },
  activeTabTotal: {
    color: '#ecf0f1',
  },
  addBillForm: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  billInput: {
    marginBottom: 0,
  },
  addButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  billList: {
    gap: 8,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    gap: 12,
  },
  billDay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    width: 40,
  },
  billName: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e74c3c',
    width: 80,
    textAlign: 'right',
  },
  totalBills: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  totalBillsLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  totalBillsAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#e74c3c',
    marginBottom: 12,
  },
  remainingText: {
    fontSize: 14,
    color: '#27ae60',
    marginTop: 8,
    fontWeight: '600',
  },
});
