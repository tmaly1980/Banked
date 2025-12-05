import React, { useState, useEffect, useMemo } from 'react';
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
import { useRecurringPaychecks } from '@/hooks/useRecurringPaychecks';
import { usePaycheckInstances, PaycheckInstance } from '@/contexts/PaychecksContext';
import TabScreenHeader from '@/components/TabScreenHeader';
import { Paycheck, WeeklyPaycheckGroup } from '@/types';
import { formatAmount } from '@/lib/utils';
import PaycheckFormModal from '@/components/modals/PaycheckFormModal';
import PaycheckDetailsModal from '@/components/modals/PaycheckDetailsModal';
import WeeklyPaycheckGroupComponent from '@/components/Paychecks/WeeklyPaycheckGroup';
import { format, startOfWeek, endOfWeek, isWithinInterval, addWeeks, subWeeks } from 'date-fns';
import { globalStyles } from '@/lib/globalStyles';
import { generateRecurringPaycheckInstances, formatDateForDB } from '@/utils/paycheckHelpers';

export default function PaychecksScreen() {
  const { deletePaycheck } = useBills();
  const { recurringPaychecks, loadRecurringPaychecks } = useRecurringPaychecks();
  const { allPaycheckInstances, loading, refreshPaychecks } = usePaycheckInstances();
  const [weeklyGroups, setWeeklyGroups] = useState<WeeklyPaycheckGroup[]>([]);
  const [unknownPaychecks, setUnknownPaychecks] = useState<PaycheckInstance[]>([]);
  const [unknownTotal, setUnknownTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [editingPaycheck, setEditingPaycheck] = useState<Paycheck | null>(null);
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null);
  const [selectedPaycheck, setSelectedPaycheck] = useState<Paycheck | null>(null);

  useEffect(() => {
    // Group paychecks by week
    const { groups, unknown, unknownTotal } = groupPaychecksByWeek(allPaycheckInstances);
    setWeeklyGroups(groups);
    setUnknownPaychecks(unknown);
    setUnknownTotal(unknownTotal);
  }, [allPaycheckInstances]);

  const groupPaychecksByWeek = (paychecks: PaycheckInstance[]): { 
    groups: WeeklyPaycheckGroup[]; 
    unknown: PaycheckInstance[];
    unknownTotal: number;
  } => {
    if (paychecks.length === 0) return { groups: [], unknown: [], unknownTotal: 0 };

    // Create a map of weeks
    const weeksMap = new Map<string, WeeklyPaycheckGroup>();
    const unknownPaychecks: PaycheckInstance[] = [];
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
    setEditingRecurringId(null);
    setModalVisible(true);
  };

  const handlePaycheckSuccess = async () => {
    console.log('🔄 Refreshing all paycheck data...');
    await refreshPaychecks();
  };

  const handleViewPaycheck = async (paycheck: Paycheck) => {
    // If it's a generated instance, we need to allow editing it (which creates an actual paycheck)
    if ((paycheck as PaycheckInstance).isGenerated) {
      await handleEditPaycheck(paycheck);
    } else {
      setEditingPaycheck(paycheck);
      setEditingRecurringId(null);
      setModalVisible(true);
    }
  };

  const handleEditPaycheck = async (paycheck: Paycheck) => {
    const instance = paycheck as PaycheckInstance;
    
    // If this is a generated instance, edit the recurring paycheck instead
    if (instance.isGenerated && instance.recurring_paycheck_id) {
      console.log('📝 Editing recurring paycheck:', instance.recurring_paycheck_id);
      console.log('📝 Current recurring paychecks:', recurringPaychecks.map(rp => rp.id));
      
      // Ensure recurring paychecks are loaded
      if (recurringPaychecks.length === 0) {
        console.log('📝 Loading recurring paychecks...');
        await loadRecurringPaychecks();
      }
      
      // Reload to ensure we have fresh data
      const { data } = await loadRecurringPaychecks();
      console.log('📝 Loaded recurring paychecks:', data?.length, data?.map(rp => rp.id));
      
      const recurring = data?.find(rp => rp.id === instance.recurring_paycheck_id);
      console.log('📝 Found recurring paycheck:', recurring);
      
      if (!recurring) {
        Alert.alert('Error', 'Could not find recurring paycheck to edit');
        return;
      }
      
      setEditingRecurringId(instance.recurring_paycheck_id);
      setEditingPaycheck(null);
      setModalVisible(true);
    } else {
      // Regular one-time paycheck
      setEditingPaycheck(paycheck);
      setEditingRecurringId(null);
      setModalVisible(true);
    }
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
          <RefreshControl refreshing={loading} onRefresh={refreshPaychecks} />
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
        onSuccess={handlePaycheckSuccess}
        editingPaycheck={editingPaycheck}
        editingRecurringId={editingRecurringId}
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
    ...globalStyles.screenContainer,
  },
  addButton: {
    ...globalStyles.addButton,
    backgroundColor: '#27ae60',
  },
  addButtonText: {
    ...globalStyles.addButtonText,
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
