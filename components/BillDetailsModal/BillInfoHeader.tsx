import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { BillModel } from '@/models/BillModel';
import { BillPayment } from '@/types';
import { formatAmount, getDaysLateBadge } from '@/utils/paymentHelpers';

interface BillInfoHeaderProps {
  bill: BillModel;
  lastPayment: BillPayment | null;
}

export default function BillInfoHeader({ bill, lastPayment }: BillInfoHeaderProps) {
  // Parse next_due_date manually to avoid timezone issues
  const nextDueDate = bill.next_due_date ? (() => {
    const [year, month, day] = bill.next_due_date.split('-').map(Number);
    return new Date(year, month - 1, day);
  })() : null;
  
  const isOverdue = bill.is_overdue;
  
  // Calculate days until due locally to avoid timezone issues
  const daysUntilDue = nextDueDate ? (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(nextDueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  })() : null;
  
  const lastPaymentDate = lastPayment ? lastPayment.payment_date : null;
  const daysLateBadge = lastPayment ? getDaysLateBadge(lastPayment, bill.due_day) : null;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitle}>            
          <Text style={styles.billName}>{bill.name}</Text>
          <Text style={styles.billAmount}>{formatAmount(bill.amount)}</Text>
        </View>
        {bill.category_name && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{bill.category_name}</Text>
          </View>
        )}
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Next Due Date</Text>
          <Text style={[styles.infoValue, isOverdue && styles.overdueText]}>
            {nextDueDate ? format(nextDueDate, 'MMM d, yyyy') : 'No due date'}
          </Text>
          {isOverdue && daysUntilDue !== null && (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueBadgeText}>{daysUntilDue} days overdue</Text>
            </View>
          )}
          {!isOverdue && daysUntilDue !== null && daysUntilDue >= 0 && (
            <Text style={styles.daysUntilText}>
              {daysUntilDue === 0 ? 'Due today' : `Due in ${daysUntilDue} days`}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    flex: 2,
  },
  headerTags: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  billName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  categoryText: {
    fontSize: 14,
    color: '#2980b9',
    fontWeight: '600',
  },
  billAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  daysLateBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  daysLateBadgeText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
  },
  overdueText: {
    color: '#e74c3c',
    fontWeight: '600',
  },
  overdueBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#e74c3c',
    alignSelf: 'flex-start',
  },
  overdueBadgeText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
  },
  daysUntilText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
});
