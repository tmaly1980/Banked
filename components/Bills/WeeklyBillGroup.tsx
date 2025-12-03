import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
      case 'low': return '#000000';
      default: return '#95a5a6';
    }
  };

  const getPriorityIcon = (priority: string): 'signal-cellular-1' | 'signal-cellular-2' | 'signal-cellular-3' => {
    switch (priority) {
      case 'high': return 'signal-cellular-3';
      case 'medium': return 'signal-cellular-2';
      case 'low': return 'signal-cellular-1';
      default: return 'signal-cellular-1';
    }
  };

  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <View style={styles.container}>
      {/* Week Header - moved outside card */}
      <Text style={styles.weekLabel}>
        {formatWeekLabel(group.startDate, group.endDate)}
      </Text>

      <View style={styles.card}>
        {/* Progress Bar with Embedded Totals */}
        <View style={styles.progressContainer}>
          <View style={styles.progressWrapper}>
            <View style={styles.progressBackground}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${progressPercentage}%` }
                ]} 
              />
            </View>
            {/* Paychecks - always on left */}
            <Text style={[styles.paychecksText, styles.paychecksOverlay]}>
              {formatAmount(group.totalPaychecks)}
            </Text>
            {/* Payments - positioned based on progress */}
            <Text style={[
              styles.paymentsText,
              progressPercentage >= 50 ? styles.paymentsInside : styles.paymentsOutside
            ]}>
              {formatAmount(group.totalBills)}
            </Text>
          </View>
        </View>

        {/* Bills List */}
        {group.bills.length > 0 ? (
          <View style={styles.billsList}>
          {group.bills.map((bill) => {
            const dueDate = getBillDueDate(bill);
            const priorityColor = getPriorityColor(bill.priority);
            const priorityIcon = getPriorityIcon(bill.priority);
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
                <View style={styles.billRow}>
                  <MaterialCommunityIcons 
                    name={priorityIcon} 
                    size={16} 
                    color={priorityColor} 
                    style={styles.priorityIcon}
                  />
                  <Text style={[styles.billDate, { color: priorityColor }]}>
                    {dueDate ? format(dueDate, 'MMM d') : 'No date'}
                  </Text>
                  <Text style={[styles.billName, { color: priorityColor }]} numberOfLines={1}>
                    {bill.name}
                  </Text>
                  {bill.loss_risk_flag && (
                    <Text style={styles.urgentIcon}>⚠️</Text>
                  )}
                  <Text style={[styles.billAmount, { color: priorityColor }]}>
                    {formatAmount(bill.amount)}
                  </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  weekLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 16,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressWrapper: {
    position: 'relative',
    height: 40,
  },
  progressBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 8,
  },
  paychecksText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e8449',
  },
  paychecksOverlay: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    textAlignVertical: 'center',
    lineHeight: 40,
    zIndex: 2,
  },
  paymentsText: {
    fontSize: 16,
    fontWeight: '700',
  },
  paymentsInside: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    textAlignVertical: 'center',
    lineHeight: 40,
    color: 'white',
    zIndex: 2,
  },
  paymentsOutside: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    textAlignVertical: 'center',
    lineHeight: 40,
    color: '#e74c3c',
    zIndex: 1,
  },
  billsList: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
    paddingTop: 8,
  },
  billItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityIcon: {
    width: 16,
  },
  billDate: {
    fontSize: 14,
    fontWeight: '500',
    width: 50,
  },
  billName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  urgentIcon: {
    fontSize: 14,
  },
  billAmount: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  emptyState: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
});