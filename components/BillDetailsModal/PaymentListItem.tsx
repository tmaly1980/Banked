import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { format } from 'date-fns';
import { BillPayment } from '@/types';
import { formatAmount } from '@/utils/paymentHelpers';

interface PaymentListItemProps {
  payment: BillPayment;
  isScheduled?: boolean;
  onDelete: (paymentId: string) => void;
  onMarkAsPaid: (paymentId: string) => void;
}

export default function PaymentListItem({ 
  payment, 
  isScheduled = false,
  onDelete, 
  onMarkAsPaid 
}: PaymentListItemProps) {
  const renderRightActions = () => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => onDelete(payment.id)}
      >
        <MaterialCommunityIcons name="delete" size={24} color="white" />
        <Text style={styles.deleteActionText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const containerStyle = isScheduled ? styles.scheduledPaymentItem : styles.paymentItem;
  const dateStyle = isScheduled ? styles.scheduledPaymentDate : styles.paymentDate;
  const amountStyle = isScheduled ? styles.scheduledPaymentAmount : styles.paymentAmount;

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      <View style={containerStyle}>
        <View style={styles.paymentInfo}>
          <Text style={dateStyle}>
            {format(new Date(payment.payment_date), 'MMM d, yyyy')}
          </Text>
          <Text style={amountStyle}>{formatAmount(payment.amount)}</Text>
        </View>
        <View style={styles.paymentStatus}>
          {payment.is_paid ? (
            <MaterialCommunityIcons name="check-circle" size={24} color="#27ae60" />
          ) : (
            <TouchableOpacity
              style={styles.payButton}
              onPress={() => onMarkAsPaid(payment.id)}
            >
              <Text style={styles.payButtonText}>Pay</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  scheduledPaymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
  },
  scheduledPaymentDate: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  scheduledPaymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498db',
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentStatus: {
    marginLeft: 12,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  payButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  payButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentDate: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#27ae60',
    marginTop: 2,
  },
  deleteAction: {
    backgroundColor: '#dc3545',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  deleteActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
