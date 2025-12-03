import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { BillModel } from '@/models/BillModel';
import { BillPayment } from '@/types';
import { getPriorityColor, getPriorityIcon, formatAmount, getDaysLateBadge } from '@/utils/paymentHelpers';

interface BillInfoHeaderProps {
  bill: BillModel;
  lastPayment: BillPayment | null;
}

export default function BillInfoHeader({ bill, lastPayment }: BillInfoHeaderProps) {
  const dueDate = bill.next_date;
  const lastPaymentDate = lastPayment ? lastPayment.payment_date : null;
  const daysLateBadge = lastPayment ? getDaysLateBadge(lastPayment) : null;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitle}>            
          <Text style={styles.billName}>{bill.name}</Text>
          <Text style={styles.billAmount}>{formatAmount(bill.amount)}</Text>
        </View>
        <View style={styles.headerTags}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(bill.priority) }]}>
            <MaterialCommunityIcons 
              name={getPriorityIcon(bill.priority)} 
              size={14} 
              color="white" 
              style={styles.priorityIcon}
            />
            <Text style={styles.priorityText}>{bill.priority.toUpperCase()}</Text>
          </View>
          {bill.loss_risk_flag && (
            <View style={styles.lossRiskBadge}>
              <Text style={styles.lossRiskText}>⚠️ Loss Risk</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Due Date</Text>
          <Text style={styles.infoValue}>
            {dueDate ? format(dueDate, 'MMM d, yyyy') : 'No due date'}
          </Text>
        </View>
        
        {lastPaymentDate && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Last Payment</Text>
            <Text style={styles.infoValue}>
              {format(new Date(lastPaymentDate), 'MMM d, yyyy')}
            </Text>
            {daysLateBadge && (
              <View style={[styles.daysLateBadge, { backgroundColor: daysLateBadge.color }]}>
                <Text style={styles.daysLateBadgeText}>{daysLateBadge.days} days late</Text>
              </View>
            )}
          </View>
        )}
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
  lossRiskBadge: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  lossRiskText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
  },
  billAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e74c3c',
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
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  priorityIcon: {
    marginRight: 2,
  },
  priorityText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
});
