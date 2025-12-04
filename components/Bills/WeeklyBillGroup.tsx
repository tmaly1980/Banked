import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WeeklyGroup } from '@/types';
import { BillModel } from '@/models/BillModel';
import { formatWeekLabel, getBillDueDate } from '@/lib/utils';
import { format } from 'date-fns';
import { Colors } from '@/constants/Colors';

interface WeeklyBillGroupProps {
  group: WeeklyGroup;
  onViewBill: (bill: BillModel) => void;
  onEditBill: (bill: BillModel) => void;
  onDeleteBill: (bill: BillModel) => void;
  onPaycheckTotalPress?: () => void;
}

const getProgressBarColor = (progressPercentage: number) => {
  const getColor = () => {
    if (progressPercentage >= 100) return Colors.progressSuccess;
    if (progressPercentage >= 75) return Colors.progressModerate;
    if (progressPercentage >= 50) return Colors.progressInfo;
    if (progressPercentage >= 25) return Colors.progressWarning;
    return Colors.progressDanger;
  }

  const color = getColor();
  // console.log(`Progress: ${progressPercentage}%, Color: ${color}`);
  return color;
};

export default function WeeklyBillGroup({
  group,
  onViewBill,
  onEditBill,
  onDeleteBill,
  onPaycheckTotalPress,
}: WeeklyBillGroupProps) {
  const progressPercentage = group.totalBills > 0 
    ? Math.min((group.totalPaychecks / group.totalBills) * 100, 100)
    : 0;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return Colors.danger;
      case 'medium': return Colors.warning;
      case 'low': return Colors.text;
      default: return Colors.secondary;
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
    const absAmount = Math.abs(amount);
    const formattedAmount = absAmount.toFixed(0);
    return amount < 0 ? `-$${formattedAmount}` : `$${formattedAmount}`;
  };

  const getDaysToGo = () => {
    if (group.bills.length === 0) return null;

    // Find the last bill due date in this week
    // Always use getBillDueDate with the week's startDate for context
    const billDates = group.bills
      .map(bill => getBillDueDate(bill, group.startDate))
      .filter(date => date !== null) as Date[];
    
    if (billDates.length === 0) return null;

    const lastBillDate = new Date(Math.max(...billDates.map(d => d.getTime())));
    lastBillDate.setHours(0, 0, 0, 0);
    
    // Calculate from today to last bill date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const daysToGo = Math.ceil((lastBillDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Debug logging
    console.log('=== Days To Go Calculation ===');
    console.log('Week:', formatWeekLabel(group.startDate, group.endDate));
    console.log('Today:', today.toISOString());
    console.log('Last Bill Date:', lastBillDate.toISOString());
    console.log('Bill Dates:', billDates.map(d => d.toISOString()));
    console.log('Bills:', group.bills.map(b => ({ name: b.name, due_day: b.due_day, due_date: b.due_date })));
    console.log('Days To Go:', daysToGo);
    console.log('=============================');
    
    return daysToGo;
  };

  const daysToGo = getDaysToGo();

  return (
    <View style={styles.container}>
      {/* Week Header - moved outside card */}
      <View style={styles.headerRow}>
        <Text style={styles.weekLabel}>
          {formatWeekLabel(group.startDate, group.endDate)}
        </Text>
        {daysToGo !== null && group.totalPaychecks < group.totalBills && (
          <Text style={styles.daysToGo}>
            {daysToGo === 0 ? 'Today' : daysToGo === 1 ? '1 day to go' : `${daysToGo} days to go`}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        {/* Progress Bar with Embedded Totals */}
        <View style={styles.progressContainer}>
          <View style={styles.progressWrapper}>
            <View style={styles.progressBackground}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${progressPercentage}%`, backgroundColor: getProgressBarColor(progressPercentage) }
                ]} 
              />
            </View>
            {/* Paychecks - always on left, touchable */}
            <TouchableOpacity 
              style={styles.paychecksTextWrapper}
              onPress={onPaycheckTotalPress}
              activeOpacity={onPaycheckTotalPress ? 0.7 : 1}
              disabled={!onPaycheckTotalPress}
            >
              <Text style={styles.paychecksText}>
                {formatAmount(group.totalPaychecks)}
              </Text>
            </TouchableOpacity>
            {/* Payments - always on right */}
            <Text style={[
              styles.paymentsText,
              (group.totalPaychecks - group.totalBills) >= 0 && styles.paymentsTextNonNegative
            ]}>
              {group.totalPaychecks - group.totalBills >= 0 
                ? '$0' 
                : formatAmount(group.totalPaychecks - group.totalBills)}
            </Text>
          </View>
        </View>

        {/* Bills List */}
        {group.bills.length > 0 ? (
          <View style={styles.billsList}>
          {group.bills.map((bill) => {
            // Always use getBillDueDate with week start date for proper context
            const displayDate = getBillDueDate(bill, group.startDate);
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
                    {displayDate ? format(displayDate, 'MMM d') : 'No date'}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  weekLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  daysToGo: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7f8c8d',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    borderRadius: 8,
  },
  paychecksTextWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    paddingLeft: 12,
    justifyContent: 'center',
    zIndex: 2,
  },
  paychecksText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  paymentsText: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    fontSize: 16,
    fontWeight: '700',
    color: '#ff0000',
    textAlignVertical: 'center',
    lineHeight: 40,
    zIndex: 2,
  },
  paymentsTextNonNegative: {
    color: '#000000',
  },
  billsList: {
    borderTopWidth: 1,
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