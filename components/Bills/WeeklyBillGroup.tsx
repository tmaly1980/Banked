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
import { formatWeekLabel, getBillDueDate, formatAmount } from '@/lib/utils';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { Colors } from '@/constants/Colors';
import WeeklyCard from '@/components/WeeklyCard';
import ProgressBar from '@/components/ProgressBar';

interface WeeklyBillGroupProps {
  group: WeeklyGroup;
  onViewBill: (bill: BillModel) => void;
  onEditBill: (bill: BillModel) => void;
  onDeleteBill: (bill: BillModel) => void;
  onDepositTotalPress?: () => void;
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
  onDepositTotalPress,
}: WeeklyBillGroupProps) {
  const progressPercentage = group.totalBills > 0 
    ? Math.min((group.totalDeposits / group.totalBills) * 100, 100)
    : 0;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#e74c3c'; // red
      case 'medium': return '#e67e22'; // orange
      case 'low': return '#f39c12'; // yellow
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
    
    return daysToGo;
  };

  const daysToGo = getDaysToGo();

  const headerRight = daysToGo !== null && group.totalDeposits < group.totalBills ? (
    <Text style={styles.daysToGo}>
      {daysToGo === 0 ? 'Today' : daysToGo === 1 ? '1 day to go' : `${daysToGo} days to go`}
    </Text>
  ) : null;

  const subheading = (
    <ProgressBar
      current={group.totalDeposits}
      total={group.totalBills}
      formatAmount={formatAmount}
      onLeftPress={onDepositTotalPress}
      leftPressable={!!onDepositTotalPress}
    />
  );

  return (
    <WeeklyCard
      title={formatWeekLabel(group.startDate, group.endDate)}
      headerRight={headerRight}
      subheading={subheading}
    >
      {/* Bills List */}
      {group.bills.length > 0 ? (
        <View style={styles.billsList}>
          {group.bills.map((bill) => {
            // Always use getBillDueDate with week start date for proper context
            const displayDate = getBillDueDate(bill, group.startDate);
            const priorityColor = getPriorityColor(bill.priority);
            const priorityIcon = getPriorityIcon(bill.priority);
            
            // Calculate days until due
            const today = startOfDay(new Date());
            const daysUntilDue = displayDate ? differenceInDays(startOfDay(displayDate), today) : null;
            
            // Determine if paid: check for payment within this week's date range
            const isPaid = bill.payments.some(payment => {
              if (!payment.payment_date) return false;
              const paymentDate = new Date(payment.payment_date);
              return paymentDate >= group.startDate && paymentDate <= group.endDate;
            });
            
            const isOverdue = !isPaid && daysUntilDue !== null && daysUntilDue < 0;
            const isDueToday = !isPaid && daysUntilDue === 0;
            
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
                  {isPaid ? (
                    <MaterialCommunityIcons 
                      name="check-circle" 
                      size={20} 
                      color="#27ae60" 
                      style={styles.statusIcon}
                    />
                  ) : isDueToday || isOverdue ? (
                    <MaterialCommunityIcons 
                      name="alert-circle-outline" 
                      size={20} 
                      color="#e67e22" 
                      style={styles.statusIcon}
                    />
                  ) : daysUntilDue !== null && daysUntilDue > 0 && (
                    <View style={styles.daysBadge}>
                      <Text style={styles.daysBadgeText}>
                        {daysUntilDue}d
                      </Text>
                    </View>
                  )}
                  <MaterialCommunityIcons 
                    name={priorityIcon} 
                    size={16} 
                    color={priorityColor} 
                    style={styles.priorityIcon}
                  />
                  <Text style={styles.billDate}>
                    {displayDate ? format(displayDate, 'MMM d') : 'No date'}
                  </Text>
                  <Text style={styles.billName} numberOfLines={1}>
                    {bill.name}
                  </Text>
                  {bill.loss_risk_flag && (
                    <Text style={styles.urgentIcon}>⚠️</Text>
                  )}
                  <Text style={styles.billAmount}>
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
    </WeeklyCard>
  );
}

const styles = StyleSheet.create({
  daysToGo: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7f8c8d',
  },
  billsList: {
    paddingHorizontal: 16,
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
  daysBadge: {
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 28,
    alignItems: 'center',
  },
  daysBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  statusIcon: {
    width: 28,
    marginRight: -8,
  },
  priorityIcon: {
    width: 16,
  },
  billDate: {
    fontSize: 14,
    fontWeight: '500',
    width: 50,
    color: '#2c3e50',
  },
  billName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    color: '#2c3e50',
  },
  urgentIcon: {
    fontSize: 14,
  },
  billAmount: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 'auto',
    color: '#2c3e50',
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