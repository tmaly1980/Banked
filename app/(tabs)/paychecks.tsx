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
import { Paycheck, WeeklyPaycheckGroup } from '@/types';
import PaycheckFormModal from '@/components/modals/PaycheckFormModal';
import PaycheckDetailsModal from '@/components/modals/PaycheckDetailsModal';
import WeeklyPaycheckGroupComponent from '@/components/Paychecks/WeeklyPaycheckGroup';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

export default function PaychecksScreen() {
  const { paychecks, loading, refreshData, deletePaycheck } = useBills();
  const [weeklyGroups, setWeeklyGroups] = useState<WeeklyPaycheckGroup[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [editingPaycheck, setEditingPaycheck] = useState<Paycheck | null>(null);
  const [selectedPaycheck, setSelectedPaycheck] = useState<Paycheck | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    // Group paychecks by week
    const groups = groupPaychecksByWeek(paychecks);
    setWeeklyGroups(groups);
  }, [paychecks]);

  const groupPaychecksByWeek = (paychecks: Paycheck[]): WeeklyPaycheckGroup[] => {
    if (paychecks.length === 0) return [];

    // Create a map of weeks
    const weeksMap = new Map<string, WeeklyPaycheckGroup>();

    paychecks.forEach((paycheck) => {
      const date = new Date(paycheck.date);
      const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
      const weekEnd = endOfWeek(date, { weekStartsOn: 0 });
      const weekKey = weekStart.toISOString();

      if (!weeksMap.has(weekKey)) {
        weeksMap.set(weekKey, {
          startDate: weekStart,
          endDate: weekEnd,
          paychecks: [],
          total: 0,
        });
      }

      const group = weeksMap.get(weekKey)!;
      group.paychecks.push(paycheck);
      group.total += paycheck.amount;
    });

    // Convert to array and sort by week (chronological order - oldest first)
    return Array.from(weeksMap.values()).sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime()
    );
  };

  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const handleAddPaycheck = () => {
    setEditingPaycheck(null);
    setModalVisible(true);
  };

  const handleViewPaycheck = (paycheck: Paycheck) => {
    setEditingPaycheck(paycheck);
    setModalVisible(true);
  };

  const handleEditPaycheck = (paycheck: Paycheck) => {
    setEditingPaycheck(paycheck);
    setModalVisible(true);
  };

  const handleDeletePaycheck = async (paycheck: Paycheck) => {
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
        <Text style={styles.headerTitle}>Paychecks</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddPaycheck}
        >
          <Text style={styles.addButtonText}>+ Paycheck</Text>
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
        {weeklyGroups.length > 0 ? (
          weeklyGroups.map((group, index) => (
            <WeeklyPaycheckGroupComponent
              key={index}
              startDate={group.startDate}
              endDate={group.endDate}
              paychecks={group.paychecks}
              total={group.total}
              onViewPaycheck={handleViewPaycheck}
              onEditPaycheck={handleEditPaycheck}
              onDeletePaycheck={handleDeletePaycheck}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No paychecks yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + Paycheck button to add one
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Paycheck Modal */}
      <PaycheckFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={refreshData}
        editingPaycheck={editingPaycheck}
      />

      {/* Paycheck Details Modal */}
      <PaycheckDetailsModal
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        paycheck={selectedPaycheck}
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
    backgroundColor: '#27ae60',
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
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#95a5a6',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bdc3c7',
  },
});
