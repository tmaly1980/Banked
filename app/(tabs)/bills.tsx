import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Text,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBills } from '@/contexts/BillsContext';
import { useDepositInstances } from '@/contexts/DepositsContext';
import TabScreenHeader from '@/components/TabScreenHeader';
import { groupBillsByWeek } from '@/lib/utils';
import { WeeklyGroup, Deposit, WeeklyDepositGroup } from '@/types';
import { BillModel } from '@/models/BillModel';
import BillFormModal from '@/components/modals/BillFormModal';
import BillDetailsModal from '@/components/modals/BillDetailsModal';
import DepositWeekModal from '@/components/modals/DepositWeekModal';
import DepositFormModal from '@/components/modals/DepositFormModal';
import DepositDetailsModal from '@/components/modals/DepositDetailsModal';
import { globalStyles } from '@/lib/globalStyles';
import WeeklyBillGroup from '@/components/Bills/WeeklyBillGroup';
import DeferredBillsAccordion from '@/components/Bills/DeferredBillsAccordion';
import OverdueBillsAccordion from '@/components/Bills/OverdueBillsAccordion';
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns';

export default function HomeScreen() {
  const { bills, overdueBills: contextOverdueBills, expenseTypes, expenseBudgets, expensePurchases, loading, refreshData, deleteBill, deleteDeposit, saveExpenseBudgets } = useBills();
  const { allDepositInstances, refreshDeposits } = useDepositInstances();
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeklyGroups, setWeeklyGroups] = useState<WeeklyGroup[]>([]);
  const [deferredBills, setDeferredBills] = useState<BillModel[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBill, setEditingBill] = useState<BillModel | null>(null);
  const [billDetailsVisible, setBillDetailsVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillModel | null>(null);
  const [depositWeekModalVisible, setDepositWeekModalVisible] = useState(false);
  const [selectedWeekDeposits, setSelectedWeekDeposits] = useState<WeeklyDepositGroup | null>(null);
  const [depositFormVisible, setDepositFormVisible] = useState(false);
  const [depositDetailsVisible, setDepositDetailsVisible] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<Deposit | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [selectedWeekForExpenses, setSelectedWeekForExpenses] = useState<WeeklyGroup | null>(null);

  const handleRefresh = async () => {
    await refreshData();
    await refreshDeposits();
  };

  useEffect(() => {
    // Separate deferred and regular bills
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Deferred bills: explicitly deferred or no due date
    const deferred = bills.filter(bill => 
      bill.deferred_flag || (!bill.due_date && !bill.due_day)
    );
    
    // Regular bills: have due dates, not overdue, not deferred
    const regularBills = bills.filter(bill => 
      !bill.deferred_flag && (bill.due_date || bill.due_day) && !bill.isOverdue
    );
    
    setDeferredBills(deferred);

    // Group regular bills by week starting from offset week
    const startDate = addWeeks(new Date(), weekOffset);
    const groups = groupBillsByWeek(regularBills, startDate);
    
    // Calculate deposit totals and running balances for each week
    let runningBalance = 0;
    groups.forEach(group => {
      const weekStartDate = format(group.startDate, 'yyyy-MM-dd');
      
      // Get deposits for this week (use generated instances)
      const weekDeposits = allDepositInstances.filter(deposit => {
        if (!deposit.date) return false;
        const depositDate = new Date(deposit.date);
        return depositDate >= group.startDate && depositDate <= group.endDate;
      });
      
      const weekDepositTotal = weekDeposits.reduce((sum, pc) => sum + pc.amount, 0);
      
      // Get active expense budgets for this week
      const weekExpensesTotal = expenseTypes.reduce((sum, type) => {
        // Find budgets for this expense type that are active for this week
        const activeBudgets = expenseBudgets
          .filter(b => {
            if (b.expense_type_id !== type.id) return false;
            
            // Check if budget is active for this week
            const effectiveFrom = new Date(b.effective_from);
            const effectiveTo = b.effective_to ? new Date(b.effective_to) : null;
            
            return effectiveFrom <= group.startDate && (!effectiveTo || effectiveTo >= group.endDate);
          })
          .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime());
        
        // Use most recent active budget
        const activeBudget = activeBudgets[0];
        return sum + (activeBudget?.amount || 0);
      }, 0);
      
      // Get actual expense purchases for this week
      const weekPurchases = expensePurchases.filter(purchase => {
        if (!purchase.purchase_date) return false;
        // Parse date at noon UTC to avoid timezone shifts
        const dateStr = purchase.purchase_date.split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        const purchaseDate = new Date(year, month - 1, day, 12, 0, 0);
        return purchaseDate >= group.startDate && purchaseDate <= group.endDate;
      });
      const weekPurchasesTotal = weekPurchases.reduce((sum, p) => sum + (p.purchase_amount || p.estimated_amount || 0), 0);
      
      // Use the greater of budgeted or actual expenses
      const weekExpenseDeduction = Math.max(weekExpensesTotal, weekPurchasesTotal);
      
      // Add carryover from previous week
      group.carryoverBalance = runningBalance;
      // Total available = deposits + carryover - expenses
      group.totalDeposits = weekDepositTotal + runningBalance - weekExpenseDeduction;
      
      // Calculate new running balance for next week
      const weekRemainder = group.totalDeposits - group.totalBills;
      runningBalance = weekRemainder > 0 ? weekRemainder : 0;
    });

    setWeeklyGroups(groups);
  }, [bills, allDepositInstances, expenseTypes, expenseBudgets, expensePurchases, weekOffset]);

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

  const handleDepositTotalPress = (group: WeeklyGroup) => {
    // Filter deposits for this week
    const weekDeposits = allDepositInstances.filter((deposit: Deposit) => {
      if (!deposit.date) return false;
      const depositDate = new Date(deposit.date);
      return depositDate >= group.startDate && depositDate <= group.endDate;
    });

    const total = weekDeposits.reduce((sum: number, pc: Deposit) => sum + pc.amount, 0);

    setSelectedWeekForExpenses(group);
    setSelectedWeekDeposits({
      startDate: group.startDate,
      endDate: group.endDate,
      deposits: weekDeposits,
      total,
    });
    setDepositWeekModalVisible(true);
  };

  const handleViewDeposit = (deposit: Deposit) => {
    setDepositWeekModalVisible(false);
    setTimeout(() => {
      setEditingDeposit(deposit);
      setDepositFormVisible(true);
    }, 100);
  };

  const handleEditDeposit = (deposit: Deposit) => {
    setDepositWeekModalVisible(false);
    setTimeout(() => {
      setEditingDeposit(deposit);
      setDepositFormVisible(true);
    }, 100);
  };

  const handleDeleteDeposit = async (deposit: Deposit) => {
    const formatAmount = (amount: number) => `$${amount.toFixed(2)}`;
    Alert.alert(
      'Delete Deposit',
      `Are you sure you want to delete this deposit of ${formatAmount(deposit.amount)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteDeposit(deposit.id);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              Alert.alert('Success', 'Deposit deleted successfully');
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
    const formattedExpenses = expenses
      .filter((exp): exp is { expense_type_id: string; expense_type_name: string; amount: number } => 
        exp.expense_type_id !== null
      )
      .map(exp => ({
        expense_type_id: exp.expense_type_id,
        amount: exp.amount,
      }));
    await saveExpenseBudgets(weekStartDate, formattedExpenses);
    await refreshData();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TabScreenHeader
          title="Bills"
          rightContent={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => setWeekOffset(weekOffset - 1)}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setWeekOffset(weekOffset + 1)}>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: '#e74c3c' }]}
                onPress={handleAddBill}
              >
                <Text style={styles.addButtonText}>+ Bill</Text>
              </TouchableOpacity>
            </View>
          }
        />

      {/* Overdue Bills - Fixed Header */}
      {contextOverdueBills.length > 0 && (
        <OverdueBillsAccordion
          overdueBills={contextOverdueBills}
          onViewBill={handleViewBill}
          onEditBill={handleEditBill}
          onDeleteBill={handleDeleteBill}
        />
      )}

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
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
            onDepositTotalPress={() => handleDepositTotalPress(group)}
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

      {/* Deposit Week Modal */}
      <DepositWeekModal
        visible={depositWeekModalVisible}
        onClose={() => {
          setDepositWeekModalVisible(false);
          setSelectedWeekForExpenses(null);
        }}
        startDate={selectedWeekDeposits?.startDate || null}
        endDate={selectedWeekDeposits?.endDate || null}
        deposits={selectedWeekDeposits?.deposits || []}
        total={selectedWeekDeposits?.total || 0}
        existingExpenseTypes={expenseTypes}
        existingWeeklyExpenses={
          selectedWeekForExpenses
            ? expenseTypes.map(type => {
                // Find active budget for this type in the selected week
                const activeBudgets = expenseBudgets
                  .filter(b => {
                    if (b.expense_type_id !== type.id) return false;
                    
                    const effectiveFrom = new Date(b.effective_from);
                    const effectiveTo = b.effective_to ? new Date(b.effective_to) : null;
                    
                    return effectiveFrom <= selectedWeekForExpenses.startDate && 
                           (!effectiveTo || effectiveTo >= selectedWeekForExpenses.endDate);
                  })
                  .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime());
                
                const activeBudget = activeBudgets[0];
                
                return {
                  expense_type_id: type.id,
                  amount: activeBudget?.amount || 0,
                };
              }).filter(exp => exp.amount > 0)
            : []
        }
        expensePurchases={expensePurchases}
        onSaveExpenses={handleSaveExpenseBudgets}
        onViewDeposit={handleViewDeposit}
        onEditDeposit={handleEditDeposit}
        onDeleteDeposit={handleDeleteDeposit}
      />

      {/* Deposit Form Modal */}
      <DepositFormModal
        visible={depositFormVisible}
        onClose={() => {
          setDepositFormVisible(false);
          setEditingDeposit(null);
        }}
        onSuccess={() => {
          refreshData();
          setDepositFormVisible(false);
          setEditingDeposit(null);
        }}
        editingDeposit={editingDeposit}
      />

      {/* Deposit Details Modal */}
      <DepositDetailsModal
        visible={depositDetailsVisible}
        onClose={() => {
          setDepositDetailsVisible(false);
          setSelectedDeposit(null);
        }}
        deposit={selectedDeposit}
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