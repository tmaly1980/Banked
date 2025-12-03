import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useBills } from '@/contexts/BillsContext';
import { Bill, BillPayment } from '@/types';
import { getBillDueDate } from '@/lib/utils';
import { format } from 'date-fns';
import DateInput from '@/components/DateInput';
import { dateToTimestamp } from '@/lib/dateUtils';

interface BillDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bill: Bill | null;
}

export default function BillDetailsModal({
  visible,
  onClose,
  onSuccess,
  bill,
}: BillDetailsModalProps) {
  const { loadBillPayments, addBillPayment } = useBills();
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const loadPayments = async () => {
    if (!bill) return;

    try {
      const data = await loadBillPayments(bill.id);
      setPayments(data);
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  useEffect(() => {
    if (visible && bill) {
      loadPayments();
      setPaymentAmount(bill.amount.toString());
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setShowPaymentForm(false);
    }
  }, [visible, bill]);

  const handleAddPayment = async () => {
    if (!bill) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Toast.show({ type: 'error', text1: 'Please enter a valid payment amount' });
      return;
    }

    if (!paymentDate) {
      Toast.show({ type: 'error', text1: 'Please enter a payment date' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await addBillPayment(bill.id, amount, dateToTimestamp(paymentDate));
      if (error) throw error;

      Toast.show({ type: 'success', text1: 'Payment added successfully' });
      setShowPaymentForm(false);
      loadPayments();
      onSuccess();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = () => {
    if (!bill) return;

    Alert.alert(
      'Mark as Paid',
      `Mark "${bill.name}" as fully paid for $${bill.amount.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await addBillPayment(bill.id, bill.amount, dateToTimestamp(paymentDate));
              if (error) throw error;

              Toast.show({ type: 'success', text1: 'Bill marked as paid' });
              setShowPaymentForm(false);
              loadPayments();
              onSuccess();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error instanceof Error ? error.message : 'An error occurred',
              });
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

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

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = Math.max(0, (bill?.amount || 0) - totalPaid);
  const lastPaymentDate = payments.length > 0 ? payments[0].applied_date : null;
  const dueDate = bill ? getBillDueDate(bill) : null;

  if (!bill) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Bill Details</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Bill Info */}
          <View style={styles.section}>
            <Text style={styles.billName}>{bill.name}</Text>
            <Text style={styles.billAmount}>{formatAmount(bill.amount)}</Text>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Due Date</Text>
                <Text style={styles.infoValue}>
                  {dueDate ? format(dueDate, 'MMM d, yyyy') : 'No due date'}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Priority</Text>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(bill.priority) }]}>
                  <Text style={styles.priorityText}>{bill.priority.toUpperCase()}</Text>
                </View>
              </View>
              
              {bill.due_day && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Recurring</Text>
                  <Text style={styles.infoValue}>Monthly on day {bill.due_day}</Text>
                </View>
              )}
              
              {lastPaymentDate && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Last Payment</Text>
                  <Text style={styles.infoValue}>
                    {format(new Date(lastPaymentDate), 'MMM d, yyyy')}
                  </Text>
                </View>
              )}
            </View>

            {/* Flags */}
            <View style={styles.flagsContainer}>
              {bill.loss_risk_flag && (
                <View style={styles.flag}>
                  <Text style={styles.flagText}>⚠️ Loss Risk</Text>
                </View>
              )}
              {bill.deferred_flag && (
                <View style={styles.flag}>
                  <Text style={styles.flagText}>📅 Deferred</Text>
                </View>
              )}
            </View>

            {/* Notes */}
            {bill.notes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Notes</Text>
                <Text style={styles.notesText}>{bill.notes}</Text>
              </View>
            )}
          </View>

          {/* Payment Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Summary</Text>
            <View style={styles.paymentSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Amount:</Text>
                <Text style={styles.summaryValue}>{formatAmount(bill.amount)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Paid:</Text>
                <Text style={[styles.summaryValue, { color: '#27ae60' }]}>
                  {formatAmount(totalPaid)}
                </Text>
              </View>
              {lastPaymentDate && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Last Paid:</Text>
                  <Text style={styles.summaryValue}>
                    {format(new Date(lastPaymentDate), 'MMM d, yyyy')}
                  </Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                <Text style={styles.summaryLabelTotal}>Remaining:</Text>
                <Text style={[styles.summaryValueTotal, { color: remainingAmount > 0 ? '#e74c3c' : '#27ae60' }]}>
                  {formatAmount(remainingAmount)}
                </Text>
              </View>
            </View>
          </View>

          {/* Payment History */}
          {payments.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment History</Text>
              {payments.map((payment) => (
                <View key={payment.id} style={styles.paymentItem}>
                  <Text style={styles.paymentAmount}>{formatAmount(payment.amount)}</Text>
                  <Text style={styles.paymentDate}>
                    {format(new Date(payment.applied_date), 'MMM d, yyyy')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Payment Form */}
          {showPaymentForm && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add Payment</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Payment Amount</Text>
                <TextInput
                  style={styles.input}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
              
              <DateInput
                label="Payment Date"
                value={paymentDate}
                onChangeDate={setPaymentDate}
              />

              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowPaymentForm(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.disabledButton]}
                  onPress={handleAddPayment}
                  disabled={loading}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? 'Adding...' : 'Add Payment'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions */}
        {!showPaymentForm && (
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={styles.makePaymentButton}
              onPress={() => setShowPaymentForm(true)}
            >
              <Text style={styles.makePaymentButtonText}>Make a Payment</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  billName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
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
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  priorityText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  flagsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  flag: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  flagText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  paymentSummary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryRowTotal: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    marginTop: 4,
    marginBottom: 0,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  summaryLabelTotal: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  summaryValueTotal: {
    fontSize: 18,
    fontWeight: 'bold',
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
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#27ae60',
  },
  paymentDate: {
    fontSize: 14,
    color: '#6c757d',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
    gap: 12,
  },
  makePaymentButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  makePaymentButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  markPaidButton: {
    backgroundColor: '#27ae60',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  markPaidButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  notesContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
  },
  notesLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 6,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  notesText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
});