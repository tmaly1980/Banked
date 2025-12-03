import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useBills } from '@/contexts/BillsContext';
import { groupBillsByWeek } from '@/lib/utils';
import { WeeklyGroup, Paycheck, WeeklyPaycheckGroup } from '@/types';
import { BillModel } from '@/models/BillModel';
import BillFormModal from '@/components/modals/BillFormModal';
import BillDetailsModal from '@/components/modals/BillDetailsModal';
import PaycheckWeekModal from '@/components/modals/PaycheckWeekModal';
import PaycheckFormModal from '@/components/modals/PaycheckFormModal';
import WeeklyBillGroup from '@/components/Bills/WeeklyBillGroup';
import DeferredBillsAccordion from '@/components/Bills/DeferredBillsAccordion';

export default function HomeScreen() {
  const { bills, paychecks, loading, refreshData, deleteBill, deletePaycheck } = useBills();
  const [weeklyGroups, setWeeklyGroups] = useState<WeeklyGroup[]>([]);
  const [deferredBills, setDeferredBills] = useState<BillModel[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBill, setEditingBill] = useState<BillModel | null>(null);
  const [billDetailsVisible, setBillDetailsVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillModel | null>(null);
  const [paycheckWeekModalVisible, setPaycheckWeekModalVisible] = useState(false);
  const [selectedWeekPaychecks, setSelectedWeekPaychecks] = useState<WeeklyPaycheckGroup | null>(null);
  const [paycheckFormVisible, setPaycheckFormVisible] = useState(false);
  const [editingPaycheck, setEditingPaycheck] = useState<Paycheck | null>(null);

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
      const weekPaychecks = paychecks.filter(paycheck => {
        const paycheckDate = new Date(paycheck.date);
        return paycheckDate >= group.startDate && paycheckDate <= group.endDate;
      });
      
      const weekPaycheckTotal = weekPaychecks.reduce((sum, pc) => sum + pc.amount, 0);
      
      // Add carryover from previous week
      group.carryoverBalance = runningBalance;
      group.totalPaychecks = weekPaycheckTotal + runningBalance;
      
      // Calculate new running balance for next week
      const weekRemainder = group.totalPaychecks - group.totalBills;
      runningBalance = weekRemainder > 0 ? weekRemainder : 0;
    });

    setWeeklyGroups(groups);
  }, [bills, paychecks]);

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
      const paycheckDate = new Date(paycheck.date);
      return paycheckDate >= group.startDate && paycheckDate <= group.endDate;
    });

    const total = weekPaychecks.reduce((sum, pc) => sum + pc.amount, 0);

    setSelectedWeekPaychecks({
      startDate: group.startDate,
      endDate: group.endDate,
      paychecks: weekPaychecks,
      total,
    });
    setPaycheckWeekModalVisible(true);
  };

  const handleViewPaycheck = (paycheck: Paycheck) => {
    setEditingPaycheck(paycheck);
    setPaycheckFormVisible(true);
  };

  const handleEditPaycheck = (paycheck: Paycheck) => {
    setEditingPaycheck(paycheck);
    setPaycheckFormVisible(true);
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Banked</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: '#3498db' }]}
          onPress={handleAddBill}
        >
          <Text style={styles.addButtonText}>+ Bill</Text>
        </TouchableOpacity>
      </View>

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
        onClose={() => setPaycheckWeekModalVisible(false)}
        startDate={selectedWeekPaychecks?.startDate || null}
        endDate={selectedWeekPaychecks?.endDate || null}
        paychecks={selectedWeekPaychecks?.paychecks || []}
        total={selectedWeekPaychecks?.total || 0}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  contentContainer: {
    paddingBottom: 80,
  },
});