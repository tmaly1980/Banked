import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Text,
} from 'react-native';
import { useBills } from '@/contexts/BillsContext';
import TabScreenHeader from '@/components/TabScreenHeader';
import { groupBillsByWeek } from '@/lib/utils';
import { WeeklyGroup, Paycheck, WeeklyPaycheckGroup } from '@/types';
import { BillModel } from '@/models/BillModel';
import BillFormModal from '@/components/modals/BillFormModal';
import BillDetailsModal from '@/components/modals/BillDetailsModal';
import PaycheckWeekModal from '@/components/modals/PaycheckWeekModal';
import PaycheckFormModal from '@/components/modals/PaycheckFormModal';
import PaycheckDetailsModal from '@/components/modals/PaycheckDetailsModal';
import { globalStyles } from '@/lib/globalStyles';
import WeeklyBillGroup from '@/components/Bills/WeeklyBillGroup';
import DeferredBillsAccordion from '@/components/Bills/DeferredBillsAccordion';
import { format } from 'date-fns';

export default function HomeScreen() {
  const { bills, paychecks, expenseTypes, expenseBudgets, expensePurchases, loading, refreshData, deleteBill, deletePaycheck, saveExpenseBudgets } = useBills();
  const [weeklyGroups, setWeeklyGroups] = useState<WeeklyGroup[]>([]);
  const [deferredBills, setDeferredBills] = useState<BillModel[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBill, setEditingBill] = useState<BillModel | null>(null);
  const [billDetailsVisible, setBillDetailsVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillModel | null>(null);
  const [paycheckWeekModalVisible, setPaycheckWeekModalVisible] = useState(false);
  const [selectedWeekPaychecks, setSelectedWeekPaychecks] = useState<WeeklyPaycheckGroup | null>(null);
  const [paycheckFormVisible, setPaycheckFormVisible] = useState(false);
  const [paycheckDetailsVisible, setPaycheckDetailsVisible] = useState(false);
  const [editingPaycheck, setEditingPaycheck] = useState<Paycheck | null>(null);
  const [selectedPaycheck, setSelectedPaycheck] = useState<Paycheck | null>(null);
  const [selectedWeekForExpenses, setSelectedWeekForExpenses] = useState<WeeklyGroup | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    // Separate deferred and regular bills
    // Bills without due dates are automatically deferred
    const regularBills = bills.filter(bill => 
      !bill.deferred_flag && (bill.due_date || bill.due_day)
    );
    const deferred = bills.filter(bill => 
      bill.deferred_flag || (!bill.due_date && !bill.due_day)
    );
    
    setDeferredBills(deferred);

    // Group regular bills by week and add paycheck totals
    const groups = groupBillsByWeek(regularBills);
    
    // Calculate paycheck totals and running balances for each week
    let runningBalance = 0;
    groups.forEach(group => {
      const weekStartDate = format(group.startDate, 'yyyy-MM-dd');
      
      // Get paychecks for this week
      const weekPaychecks = paychecks.filter(paycheck => {
        if (!paycheck.date) return false;
        const paycheckDate = new Date(paycheck.date);
        return paycheckDate >= group.startDate && paycheckDate <= group.endDate;
      });
      
      const weekPaycheckTotal = weekPaychecks.reduce((sum, pc) => sum + pc.amount, 0);
      
      // Get expense budgets for this week
      const weekExpenses = expenseBudgets.filter(exp => exp.start_date === weekStartDate);
      const weekExpensesTotal = weekExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      // Get actual expense purchases for this week
      const weekPurchases = expensePurchases.filter(purchase => {
        if (!purchase.purchase_date) return false;
        const purchaseDate = new Date(purchase.purchase_date);
        return purchaseDate >= group.startDate && purchaseDate <= group.endDate;
      });
      const weekPurchasesTotal = weekPurchases.reduce((sum, p) => sum + (p.purchase_amount || 0), 0);
      
      // Use the greater of budgeted or actual expenses
      const weekExpenseDeduction = Math.max(weekExpensesTotal, weekPurchasesTotal);
      
      // Add carryover from previous week
      group.carryoverBalance = runningBalance;
      // Total available = paychecks + carryover - expenses
      group.totalPaychecks = weekPaycheckTotal + runningBalance - weekExpenseDeduction;
      
      // Calculate new running balance for next week
      const weekRemainder = group.totalPaychecks - group.totalBills;
      runningBalance = weekRemainder > 0 ? weekRemainder : 0;
    });

    setWeeklyGroups(groups);
  }, [bills, paychecks, expenseBudgets, expensePurchases]);

  const handleAddBill = () => {
    setEditingBill(null);
    setModalVisible(true);
  };

  const handleEditBill = (bill: BillModel) => {
    setEditingBill(bill);
    setModalVisible(true);
  };

  const handleViewBill = (bill: BillModel) => {
    setSelectedBill(bill);
    setBillDetailsVisible(true);
  };

  const handleDeleteBill = async (bill: BillModel) => {
    Alert.alert(
      'Delete Bill',
      `Are you sure you want to delete "${bill.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteBill(bill.id);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              Alert.alert('Success', 'Bill deleted successfully');
            }
          },
        },
      ]
    );
  };

  const handlePaycheckTotalPress = (group: WeeklyGroup) => {
    // Filter paychecks for this week
    const weekPaychecks = paychecks.filter(paycheck => {
      if (!paycheck.date) return false;
      const paycheckDate = new Date(paycheck.date);
      return paycheckDate >= group.startDate && paycheckDate <= group.endDate;
    });

    const total = weekPaychecks.reduce((sum, pc) => sum + pc.amount, 0);

    setSelectedWeekForExpenses(group);
    setSelectedWeekPaychecks({
      startDate: group.startDate,
      endDate: group.endDate,
      paychecks: weekPaychecks,
      total,
    });
    setPaycheckWeekModalVisible(true);
  };

  const handleViewPaycheck = (paycheck: Paycheck) => {
    setPaycheckWeekModalVisible(false);
    setTimeout(() => {
      setEditingPaycheck(paycheck);
      setPaycheckFormVisible(true);
    }, 100);
  };

  const handleEditPaycheck = (paycheck: Paycheck) => {
    setPaycheckWeekModalVisible(false);
    setTimeout(() => {
      setEditingPaycheck(paycheck);
      setPaycheckFormVisible(true);
    }, 100);
  };

  const handleDeletePaycheck = async (paycheck: Paycheck) => {
    const formatAmount = (amount: number) => `$${amount.toFixed(2)}`;
    Alert.alert(
      'Delete Paycheck',
      `Are you sure you want to delete this paycheck of ${formatAmount(paycheck.amount)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deletePaycheck(paycheck.id);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              Alert.alert('Success', 'Paycheck deleted successfully');
              refreshData();
            }
          },
        },
      ]
    );
  };

  const handleSaveExpenseBudgets = async (
    expenses: Array<{ expense_type_id: string | null; expense_type_name: string; amount: number }>
  ) => {
    if (!selectedWeekForExpenses) return;

    const weekStartDate = format(selectedWeekForExpenses.startDate, 'yyyy-MM-dd');
    // Map to the correct format expected by saveExpenseBudgets
    const formattedExpenses = expenses.map(exp => ({
      expense_type_id: exp.expense_type_id,
      expense_type_name: exp.expense_type_name,
      allocated_amount: exp.amount,
      spent_amount: 0,
    }));
    await saveExpenseBudgets(weekStartDate, formattedExpenses);
    await refreshData();
  };

  return (
    <View style={styles.container}>
      <TabScreenHeader
        title="Bills"
        rightContent={
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: '#e74c3c' }]}
            onPress={handleAddBill}
          >
            <Text style={styles.addButtonText}>+ Bill</Text>
          </TouchableOpacity>
        }
      />

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshData} />
        }
      >
        {/* Weekly Groups */}
        {weeklyGroups.map((group, index) => (
          <WeeklyBillGroup
            key={index}
            group={group}
            onViewBill={handleViewBill}
            onEditBill={handleEditBill}
            onDeleteBill={handleDeleteBill}
            onPaycheckTotalPress={() => handlePaycheckTotalPress(group)}
          />
        ))}
      </ScrollView>

      {/* Deferred Bills - Fixed Footer */}
      <DeferredBillsAccordion
        deferredBills={deferredBills}
        onViewBill={handleViewBill}
        onEditBill={handleEditBill}
        onDeleteBill={handleDeleteBill}
      />

      {/* Add/Edit Bill Modal */}
      <BillFormModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          // If we were editing a bill, reopen details modal
          if (editingBill) {
            setSelectedBill(editingBill);
            setBillDetailsVisible(true);
          }
          setEditingBill(null);
        }}
        onSuccess={() => {
          refreshData();
          // If we were editing a bill, reopen details modal with refreshed data
          if (editingBill) {
            setSelectedBill(editingBill);
            setBillDetailsVisible(true);
          }
          setModalVisible(false);
          setEditingBill(null);
        }}
        editingBill={editingBill}
      />

      {/* Bill Details Modal */}
      <BillDetailsModal
        visible={billDetailsVisible}
        onClose={() => setBillDetailsVisible(false)}
        onSuccess={refreshData}
        onEdit={() => {
          setBillDetailsVisible(false);
          setEditingBill(selectedBill);
          setModalVisible(true);
        }}
        bill={selectedBill}
      />

      {/* Paycheck Week Modal */}
      <PaycheckWeekModal
        visible={paycheckWeekModalVisible}
        onClose={() => {
          setPaycheckWeekModalVisible(false);
          setSelectedWeekForExpenses(null);
        }}
        startDate={selectedWeekPaychecks?.startDate || null}
        endDate={selectedWeekPaychecks?.endDate || null}
        paychecks={selectedWeekPaychecks?.paychecks || []}
        total={selectedWeekPaychecks?.total || 0}
        existingExpenseTypes={expenseTypes}
        existingWeeklyExpenses={
          selectedWeekForExpenses
            ? expenseBudgets.filter(exp => 
                exp.start_date === format(selectedWeekForExpenses.startDate, 'yyyy-MM-dd')
              )
            : []
        }
        onSaveExpenses={handleSaveExpenseBudgets}
        onViewPaycheck={handleViewPaycheck}
        onEditPaycheck={handleEditPaycheck}
        onDeletePaycheck={handleDeletePaycheck}
      />

      {/* Paycheck Form Modal */}
      <PaycheckFormModal
        visible={paycheckFormVisible}
        onClose={() => {
          setPaycheckFormVisible(false);
          setEditingPaycheck(null);
        }}
        onSuccess={() => {
          refreshData();
          setPaycheckFormVisible(false);
          setEditingPaycheck(null);
        }}
        editingPaycheck={editingPaycheck}
      />

      {/* Paycheck Details Modal */}
      <PaycheckDetailsModal
        visible={paycheckDetailsVisible}
        onClose={() => {
          setPaycheckDetailsVisible(false);
          setSelectedPaycheck(null);
        }}
        paycheck={selectedPaycheck}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...globalStyles.screenContainer,
  },
  addButton: {
    ...globalStyles.addButton,
    backgroundColor: '#e74c3c',
  },
  addButtonText: {
    ...globalStyles.addButtonText,
  },
  content: {
    ...globalStyles.content,
  },
  contentContainer: {
    paddingBottom: 80,
  },
});