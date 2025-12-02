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
import { Bill, WeeklyGroup } from '@/types';
import { BillModel } from '@/models/BillModel';
import BillFormModal from '@/components/modals/BillFormModal';
import BillDetailsModal from '@/components/modals/BillDetailsModal';
import WeeklyBillGroup from '@/components/Bills/WeeklyBillGroup';
import DeferredBillsAccordion from '@/components/Bills/DeferredBillsAccordion';

export default function HomeScreen() {
  const { bills, paychecks, loading, refreshData, deleteBill } = useBills();
  const [weeklyGroups, setWeeklyGroups] = useState<WeeklyGroup[]>([]);
  const [deferredBills, setDeferredBills] = useState<Bill[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'bill' | 'paycheck'>('bill');
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [billDetailsVisible, setBillDetailsVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    // Separate deferred and regular bills
    const regularBills = bills.filter(bill => !bill.deferred_flag).map(b => b.toBill());
    const deferred = bills.filter(bill => bill.deferred_flag).map(b => b.toBill());
    
    setDeferredBills(deferred);

    // Group regular bills by week and add paycheck totals
    const groups = groupBillsByWeek(regularBills);
    
    // Calculate paycheck totals for each week
    groups.forEach(group => {
      const weekPaychecks = paychecks.filter(paycheck => {
        const paycheckDate = new Date(paycheck.date);
        return paycheckDate >= group.startDate && paycheckDate <= group.endDate;
      });
      
      group.totalPaychecks = weekPaychecks.reduce((sum, pc) => sum + pc.amount, 0);
    });

    setWeeklyGroups(groups);
  }, [bills, paychecks]);

  const handleAddBill = () => {
    setModalType('bill');
    setEditingBill(null);
    setModalVisible(true);
  };

  const handleAddPaycheck = () => {
    setModalType('paycheck');
    setEditingBill(null);
    setModalVisible(true);
  };

  const handleEditBill = (bill: Bill) => {
    setModalType('bill');
    setEditingBill(bill);
    setModalVisible(true);
  };

  const handleViewBill = (bill: Bill) => {
    setSelectedBill(bill);
    setBillDetailsVisible(true);
  };

  const handleDeleteBill = async (bill: Bill) => {
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Banked</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: '#27ae60' }]}
            onPress={handleAddPaycheck}
          >
            <Text style={styles.addButtonText}>+ Paycheck</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: '#3498db' }]}
            onPress={handleAddBill}
          >
            <Text style={styles.addButtonText}>+ Bill</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
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
          />
        ))}

        {/* Deferred Bills */}
        <DeferredBillsAccordion
          deferredBills={deferredBills}
          onViewBill={handleViewBill}
          onEditBill={handleEditBill}
          onDeleteBill={handleDeleteBill}
        />
      </ScrollView>

      {/* Add Item Modal */}
      <BillFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={refreshData}
        type={modalType}
        editingBill={editingBill}
      />

      {/* Bill Details Modal */}
      <BillDetailsModal
        visible={billDetailsVisible}
        onClose={() => setBillDetailsVisible(false)}
        onSuccess={refreshData}
        bill={selectedBill}
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
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
});