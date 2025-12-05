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
import TabScreenHeader from '@/components/TabScreenHeader';
import { Paycheck, WeeklyPaycheckGroup } from '@/types';
import { formatAmount } from '@/lib/utils';
import PaycheckFormModal from '@/components/modals/PaycheckFormModal';
import PaycheckDetailsModal from '@/components/modals/PaycheckDetailsModal';
import WeeklyPaycheckGroupComponent from '@/components/Paychecks/WeeklyPaycheckGroup';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

export default function PaychecksScreen() {
  const { paychecks, loading, refreshData, deletePaycheck } = useBills();
  const [weeklyGroups, setWeeklyGroups] = useState<WeeklyPaycheckGroup[]>([]);
  const [unknownPaychecks, setUnknownPaychecks] = useState<Paycheck[]>([]);
  const [unknownTotal, setUnknownTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [editingPaycheck, setEditingPaycheck] = useState<Paycheck | null>(null);
  const [selectedPaycheck, setSelectedPaycheck] = useState<Paycheck | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    // Group paychecks by week
    const { groups, unknown, unknownTotal } = groupPaychecksByWeek(paychecks);
    setWeeklyGroups(groups);
    setUnknownPaychecks(unknown);
    setUnknownTotal(unknownTotal);
  }, [paychecks]);

  const groupPaychecksByWeek = (paychecks: Paycheck[]): { 
    groups: WeeklyPaycheckGroup[]; 
    unknown: Paycheck[];
    unknownTotal: number;
  } => {
    if (paychecks.length === 0) return { groups: [], unknown: [], unknownTotal: 0 };

    // Create a map of weeks
    const weeksMap = new Map<string, WeeklyPaycheckGroup>();
    const unknownPaychecks: Paycheck[] = [];
    let unknownTotal = 0;

    paychecks.forEach((paycheck) => {
      // Check if date is missing, null, or invalid
      if (!paycheck.date || paycheck.date.trim() === '') {
        unknownPaychecks.push(paycheck);
        unknownTotal += paycheck.amount;
        return;
      }

      const date = new Date(paycheck.date);
      
      // Check if date is invalid
      if (isNaN(date.getTime())) {
        unknownPaychecks.push(paycheck);
        unknownTotal += paycheck.amount;
        return;
      }

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
    const groups = Array.from(weeksMap.values()).sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime()
    );

    return { groups, unknown: unknownPaychecks, unknownTotal };
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
      <TabScreenHeader
        title="Paychecks"
        rightContent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddPaycheck}
          >
            <Text style={styles.addButtonText}>+ Paycheck</Text>
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
        {weeklyGroups.length > 0 || unknownPaychecks.length > 0 ? (
          <>
            {/* Unknown Group */}
            {unknownPaychecks.length > 0 && (
              <View style={styles.unknownGroup}>
                <View style={styles.unknownHeader}>
                  <Text style={styles.unknownLabel}>Upcoming</Text>
                  <Text style={styles.unknownTotal}>{formatAmount(unknownTotal)}</Text>
                </View>
                {unknownPaychecks.map((paycheck) => (
                  <TouchableOpacity
                    key={paycheck.id}
                    style={styles.unknownPaycheckItem}
                    onPress={() => handleEditPaycheck(paycheck)}
                  >
                    <View style={styles.unknownPaycheckInfo}>
                      <Text style={styles.unknownPaycheckName}>
                        {paycheck.name || 'Paycheck'}
                      </Text>
                      {paycheck.notes && (
                        <Text style={styles.unknownPaycheckNotes} numberOfLines={1}>
                          {paycheck.notes}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.unknownPaycheckAmount}>
                      {formatAmount(paycheck.amount)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Weekly Groups */}
            {weeklyGroups.map((group, index) => (
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
            ))}
          </>
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
    backgroundColor: '#ecf0f1',
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
  unknownGroup: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#95a5a6',
  },
  unknownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  unknownLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  unknownTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#95a5a6',
  },
  unknownPaycheckItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  unknownPaycheckInfo: {
    flex: 1,
    marginRight: 12,
  },
  unknownPaycheckName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  unknownPaycheckNotes: {
    fontSize: 12,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  unknownPaycheckActions: {
    alignItems: 'flex-end',
  },
  unknownPaycheckAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 6,
  },
  unknownActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  unknownActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#3498db',
  },
  unknownActionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  deleteButtonText: {
    color: 'white',
  },
});
