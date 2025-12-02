import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { WeeklyGroup, Bill } from '@/types';
import { formatWeekLabel, getBillDueDate } from '@/lib/utils';
import { format } from 'date-fns';

interface WeeklyBillGroupProps {
  group: WeeklyGroup;
  onViewBill: (bill: Bill) => void;
  onEditBill: (bill: Bill) => void;
  onDeleteBill: (bill: Bill) => void;
}

export default function WeeklyBillGroup({
  group,
  onViewBill,
  onEditBill,
  onDeleteBill,
}: WeeklyBillGroupProps) {
  const progressPercentage = group.totalBills > 0 
    ? Math.min((group.totalPaychecks / group.totalBills) * 100, 100)
    : 0;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'low': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <View style={styles.container}>
      {/* Week Header */}
      <View style={styles.header}>
        <Text style={styles.weekLabel}>
          {formatWeekLabel(group.startDate, group.endDate)}
        </Text>
        <View style={styles.totalsContainer}>
          <Text style={styles.totalsText}>
            {formatAmount(group.totalPaychecks)} / {formatAmount(group.totalBills)}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View 
            style={[
              styles.progressBar, 
              { width: `${progressPercentage}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {progressPercentage.toFixed(0)}%
        </Text>
      </View>

      {/* Bills List */}
      {group.bills.length > 0 ? (
        <View style={styles.billsList}>
          {group.bills.map((bill) => {
            const dueDate = getBillDueDate(bill);
            return (
              <TouchableOpacity
                key={bill.id}
                style={styles.billItem}
                onPress={() => onViewBill(bill)}
                onLongPress={() => Alert.alert(
                  'Bill Actions',
                  'Choose an action:',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Edit', onPress: () => onEditBill(bill) },
                    { text: 'Delete', style: 'destructive', onPress: () => onDeleteBill(bill) },
                  ]
                )}
              >
                <View style={styles.billInfo}>
                  <View style={styles.billHeader}>
                    <Text style={styles.billName}>{bill.name}</Text>
                    <Text style={styles.billAmount}>
                      {formatAmount(bill.amount)}
                    </Text>
                  </View>
                  <View style={styles.billDetails}>
                    <Text style={styles.billDueDate}>
                      {dueDate ? format(dueDate, 'MMM d') : 'No due date'}
                    </Text>
                    <View style={styles.billFlags}>
                      <View 
                        style={[
                          styles.priorityBadge, 
                          { backgroundColor: getPriorityColor(bill.priority) }
                        ]}
                      >
                        <Text style={styles.priorityText}>
                          {bill.priority.toUpperCase()}
                        </Text>
                      </View>
                      {bill.loss_risk_flag && (
                        <View style={styles.riskBadge}>
                          <Text style={styles.riskText}>⚠️</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No bills this week</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  weekLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  totalsContainer: {
    alignItems: 'flex-end',
  },
  totalsText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  progressBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
    minWidth: 35,
    textAlign: 'right',
  },
  billsList: {
    paddingBottom: 8,
  },
  billItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  billInfo: {
    flex: 1,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  billName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    flex: 1,
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e74c3c',
  },
  billDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billDueDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  billFlags: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  riskBadge: {
    padding: 2,
  },
  riskText: {
    fontSize: 12,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
});