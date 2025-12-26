import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useBills } from '@/contexts/BillsContext';
import { useRecurringDeposits } from '@/hooks/useRecurringDeposits';
import { useDepositInstances, DepositInstance } from '@/contexts/DepositsContext';
import TabScreenHeader from '@/components/TabScreenHeader';
import { Deposit, WeeklyDepositGroup } from '@/types';
import { formatAmount } from '@/lib/utils';
import DepositFormModal from '@/components/modals/DepositFormModal';
import DepositDetailsModal from '@/components/modals/DepositDetailsModal';
import WeeklyDepositGroupComponent from '@/components/Deposits/WeeklyDepositGroup';
import { format, startOfWeek, endOfWeek, isWithinInterval, addWeeks, subWeeks } from 'date-fns';
import { globalStyles } from '@/lib/globalStyles';
import { generateRecurringDepositInstances, formatDateForDB } from '@/utils/depositHelpers';

export default function DepositsScreen() {
  const { deleteDeposit } = useBills();
  const { recurringDeposits, loadRecurringDeposits } = useRecurringDeposits();
  const { allDepositInstances, loading, refreshDeposits } = useDepositInstances();
  const [weeklyGroups, setWeeklyGroups] = useState<WeeklyDepositGroup[]>([]);
  const [unknownDeposits, setUnknownDeposits] = useState<DepositInstance[]>([]);
  const [unknownTotal, setUnknownTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<Deposit | null>(null);
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);

  useEffect(() => {
    // Group deposits by week
    const { groups, unknown, unknownTotal } = groupDepositsByWeek(allDepositInstances);
    setWeeklyGroups(groups);
    setUnknownDeposits(unknown);
    setUnknownTotal(unknownTotal);
  }, [allDepositInstances]);

  const groupDepositsByWeek = (deposits: DepositInstance[]): { 
    groups: WeeklyDepositGroup[]; 
    unknown: DepositInstance[];
    unknownTotal: number;
  } => {
    if (deposits.length === 0) return { groups: [], unknown: [], unknownTotal: 0 };

    // Create a map of weeks
    const weeksMap = new Map<string, WeeklyDepositGroup>();
    const unknownDeposits: DepositInstance[] = [];
    let unknownTotal = 0;

    deposits.forEach((deposit) => {
      // Check if date is missing, null, or invalid
      if (!deposit.date || deposit.date.trim() === '') {
        unknownDeposits.push(deposit);
        unknownTotal += deposit.amount;
        return;
      }

      const date = new Date(deposit.date);
      
      // Check if date is invalid
      if (isNaN(date.getTime())) {
        unknownDeposits.push(deposit);
        unknownTotal += deposit.amount;
        return;
      }

      const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
      const weekEnd = endOfWeek(date, { weekStartsOn: 0 });
      const weekKey = weekStart.toISOString();

      if (!weeksMap.has(weekKey)) {
        weeksMap.set(weekKey, {
          startDate: weekStart,
          endDate: weekEnd,
          deposits: [],
          total: 0,
        });
      }

      const group = weeksMap.get(weekKey)!;
      group.deposits.push(deposit);
      group.total += deposit.amount;
    });

    // Convert to array and sort by week (chronological order - oldest first)
    const groups = Array.from(weeksMap.values()).sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime()
    );

    return { groups, unknown: unknownDeposits, unknownTotal };
  };

  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const handleAddDeposit = () => {
    setEditingDeposit(null);
    setEditingRecurringId(null);
    setModalVisible(true);
  };

  const handleDepositSuccess = async () => {
    console.log('🔄 Refreshing all deposit data...');
    await refreshDeposits();
  };

  const handleViewDeposit = async (deposit: Deposit) => {
    // If it's a generated instance, we need to allow editing it (which creates an actual deposit)
    if ((deposit as DepositInstance).isGenerated) {
      await handleEditDeposit(deposit);
    } else {
      setEditingDeposit(deposit);
      setEditingRecurringId(null);
      setModalVisible(true);
    }
  };

  const handleEditDeposit = async (deposit: Deposit) => {
    const instance = deposit as DepositInstance;
    
    // If this is a generated instance, edit the recurring deposit instead
    if (instance.isGenerated && instance.recurring_deposit_id) {
      console.log('📝 Editing recurring deposit:', instance.recurring_deposit_id);
      console.log('📝 Current recurring deposits:', recurringDeposits.map(rd => rd.id));
      
      // Ensure recurring deposits are loaded
      if (recurringDeposits.length === 0) {
        console.log('📝 Loading recurring deposits...');
        await loadRecurringDeposits();
      }
      
      // Reload to ensure we have fresh data
      const { data } = await loadRecurringDeposits();
      console.log('📝 Loaded recurring deposits:', data?.length, data?.map(rd => rd.id));
      
      const recurring = data?.find(rd => rd.id === instance.recurring_deposit_id);
      console.log('📝 Found recurring deposit:', recurring);
      
      if (!recurring) {
        Alert.alert('Error', 'Could not find recurring deposit to edit');
        return;
      }
      
      setEditingRecurringId(instance.recurring_deposit_id);
      setEditingDeposit(null);
      setModalVisible(true);
    } else {
      // Regular one-time deposit
      setEditingDeposit(deposit);
      setEditingRecurringId(null);
      setModalVisible(true);
    }
  };

  const handleDeleteDeposit = async (deposit: Deposit) => {
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
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <TabScreenHeader
          title="Deposits"
          rightContent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddDeposit}
          >
            <Text style={styles.addButtonText}>+ Deposit</Text>
          </TouchableOpacity>
        }
      />

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshDeposits} />
        }
      >
        {weeklyGroups.length > 0 || unknownDeposits.length > 0 ? (
          <>
            {/* Unknown Group */}
            {unknownDeposits.length > 0 && (
              <View style={styles.unknownGroup}>
                <View style={styles.unknownHeader}>
                  <Text style={styles.unknownLabel}>Upcoming</Text>
                  <Text style={styles.unknownTotal}>{formatAmount(unknownTotal)}</Text>
                </View>
                {unknownDeposits.map((deposit) => (
                  <TouchableOpacity
                    key={deposit.id}
                    style={styles.unknownDepositItem}
                    onPress={() => handleEditDeposit(deposit)}
                  >
                    <View style={styles.unknownDepositInfo}>
                      <Text style={styles.unknownDepositName}>
                        {deposit.name || 'Deposit'}
                      </Text>
                      {deposit.notes && (
                        <Text style={styles.unknownDepositNotes} numberOfLines={1}>
                          {deposit.notes}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.unknownDepositAmount}>
                      {formatAmount(deposit.amount)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Weekly Groups */}
            {weeklyGroups.map((group, index) => (
              <WeeklyDepositGroupComponent
                key={index}
                startDate={group.startDate}
                endDate={group.endDate}
                deposits={group.deposits}
                total={group.total}
                onViewDeposit={handleViewDeposit}
                onEditDeposit={handleEditDeposit}
                onDeleteDeposit={handleDeleteDeposit}
              />
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No deposits yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + Deposit button to add one
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Deposit Modal */}
      <DepositFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={handleDepositSuccess}
        editingDeposit={editingDeposit}
        editingRecurringId={editingRecurringId}
      />

      {/* Deposit Details Modal */}
      <DepositDetailsModal
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
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
  unknownDepositItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  unknownDepositInfo: {
    flex: 1,
    marginRight: 12,
  },
  unknownDepositName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  unknownDepositNotes: {
    fontSize: 12,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  unknownDepositActions: {
    alignItems: 'flex-end',
  },
  unknownDepositAmount: {
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
