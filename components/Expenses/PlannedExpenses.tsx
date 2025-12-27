import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlannedExpenses } from '@/contexts/PlannedExpensesContext';
import { PlannedExpense } from '@/types';
import { formatDollar } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import PlannedExpenseFormModal from '@/components/modals/PlannedExpenseFormModal';

export default function PlannedExpenses() {
  const { plannedExpenses, loading, loadPlannedExpenses } = usePlannedExpenses();
  const [selectedExpense, setSelectedExpense] = useState<PlannedExpense | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadPlannedExpenses();
  }, []);

  const handleRefresh = async () => {
    await loadPlannedExpenses();
  };

  const handleExpensePress = (expense: PlannedExpense) => {
    setSelectedExpense(expense);
    setModalVisible(true);
  };

  const renderExpenseItem = ({ item }: { item: PlannedExpense }) => {
    const remaining = item.budgeted_amount - item.funded_amount;
    const fundedPercentage = (item.funded_amount / item.budgeted_amount) * 100;

    return (
      <TouchableOpacity
        style={styles.expenseCard}
        onPress={() => handleExpensePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.expenseHeader}>
          <View style={styles.expenseInfo}>
            <Text style={styles.expenseName}>{item.name}</Text>
            <Text style={styles.expenseDate}>
              {format(parseISO(item.planned_date), 'MMM d, yyyy')}
            </Text>
          </View>
          {item.is_scheduled && (
            <View style={styles.scheduledBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.scheduledText}>Scheduled</Text>
            </View>
          )}
        </View>

        <View style={styles.amountContainer}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Budgeted:</Text>
            <Text style={styles.amountValue}>{formatDollar(item.budgeted_amount)}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Funded:</Text>
            <Text style={[styles.amountValue, styles.fundedAmount]}>
              {formatDollar(item.funded_amount)}
            </Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Remaining:</Text>
            <Text style={[styles.amountValue, styles.remainingAmount]}>
              {formatDollar(remaining)}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(fundedPercentage, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(fundedPercentage)}%</Text>
        </View>

        {item.notes && (
          <Text style={styles.notes} numberOfLines={2}>
            {item.notes}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (plannedExpenses.length === 0 && !loading) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={64} color="#bdc3c7" />
        <Text style={styles.emptyText}>No planned expenses yet</Text>
        <Text style={styles.emptySubtext}>
          Tap the + button to add your first planned expense
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={plannedExpenses}
        renderItem={renderExpenseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
        }
      />

      <PlannedExpenseFormModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedExpense(null);
        }}
        onSuccess={() => {
          handleRefresh();
          setModalVisible(false);
          setSelectedExpense(null);
        }}
        editingExpense={selectedExpense}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listContent: {
    padding: 16,
  },
  expenseCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  scheduledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  scheduledText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  amountContainer: {
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  fundedAmount: {
    color: '#10b981',
  },
  remainingAmount: {
    color: '#f59e0b',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    minWidth: 40,
    textAlign: 'right',
  },
  notes: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7f8c8d',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
  },
});

