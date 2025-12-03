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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useBills } from '@/contexts/BillsContext';
import { BillPayment } from '@/types';
import { BillModel } from '@/models/BillModel';
import { getBillDueDate } from '@/lib/utils';
import { format } from 'date-fns';
import DateInput from '@/components/DateInput';
import { dateToTimestamp, timestampToDate, localDate } from '@/lib/dateUtils';

interface BillDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onEdit?: () => void;
  bill: BillModel | null;
}
export default function BillDetailsModal({
  visible,
  onClose,
  onSuccess,
  onEdit,
  bill,
}: BillDetailsModalProps) {
  const { loadBillPayments, addBillPayment, updateBillPayment } = useBills();
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(localDate(new Date()));
  const [scheduledPaymentId, setScheduledPaymentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const loadPayments = async () => {
    if (!bill) return;

    try {
      const data = await loadBillPayments(bill.id);
      // Sort payments in reverse chronological order (newest first)
      const sortedPayments = data.sort((a, b) => {
        return new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime();
      });
      setPayments(sortedPayments);
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  useEffect(() => {
    if (visible && bill) {
      loadPayments();
      setShowPaymentForm(false);
      loadScheduledPayment();
    }
  }, [visible, bill]);

  const loadScheduledPayment = () => {
    if (!bill) return;
    
    // Check for existing scheduled payment (payment_date > today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const scheduledPayment = bill.payments.find(payment => {
      const paymentDate = new Date(payment.payment_date);
      paymentDate.setHours(0, 0, 0, 0);
      return paymentDate > today;
    });
    
    if (scheduledPayment) {
      setScheduledPaymentId(scheduledPayment.id);
      setPaymentAmount(scheduledPayment.amount.toString());
      setPaymentDate(timestampToDate(scheduledPayment.payment_date));
    } else {
      setScheduledPaymentId(null);
      setPaymentAmount(bill.amount.toString());
      setPaymentDate(localDate(new Date()));
    }
  };

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
      if (scheduledPaymentId) {
        // Update existing scheduled payment
        const { error } = await updateBillPayment(
          scheduledPaymentId,
          amount,
          dateToTimestamp(paymentDate)
        );
        if (error) throw error;
        Toast.show({ type: 'success', text1: 'Payment updated successfully' });
      } else {
        // Create new payment
        const { error } = await addBillPayment(
          bill.id,
          amount,
          dateToTimestamp(paymentDate)
        );
        if (error) throw error;
        Toast.show({ type: 'success', text1: 'Payment saved successfully' });
      }

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

  // Determine payment button state based on payment date
  const getPaymentButtonState = () => {
    if (!bill || !paymentDate) return { text: 'Make Payment', color: '#27ae60' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedDate = new Date(dateToTimestamp(paymentDate));
    selectedDate.setHours(0, 0, 0, 0);
    
    const nextDueDate = bill.nextDueDate;
    
    // Make Payment (green) - today or in past
    if (selectedDate <= today) {
      return { text: 'Make Payment', color: '#27ae60' };
    }
    
    // Defer Payment (orange) - beyond next due date
    if (nextDueDate) {
      const dueDate = new Date(nextDueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      if (selectedDate > dueDate) {
        return { text: 'Defer Payment', color: '#f39c12' };
      }
    }
    
    // Schedule Payment (blue) - between now and due date
    return { text: 'Schedule', color: '#3498db' };
  };

  const dueDate = bill ? bill.next_date : null;
  const buttonState = getPaymentButtonState();

  // Separate scheduled payments from payment history
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const scheduledPayments = payments.filter(payment => {
    const paymentDate = new Date(payment.payment_date);
    paymentDate.setHours(0, 0, 0, 0);
    return paymentDate > today;
  });

  const paymentHistory = payments.filter(payment => {
    const paymentDate = new Date(payment.payment_date);
    paymentDate.setHours(0, 0, 0, 0);
    return paymentDate <= today;
  });

  // Get last payment (only from payment history, not scheduled)
  const lastPaymentDate = paymentHistory.length > 0 ? paymentHistory[0].payment_date : null;

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
          {onEdit && (
            <TouchableOpacity onPress={onEdit}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          )}
          {!onEdit && <View style={{ width: 50 }} />}
        </View>

        <ScrollView style={styles.content}>
          {/* Bill Info */}
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
                </View>
              )}
            </View>
          </View>

          {/* Notes */}
          {bill.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <View style={styles.notesContainer}>
                <Text style={styles.notesText}>{bill.notes}</Text>
              </View>
            </View>
          )}

          {/* Scheduled Payments */}
          {scheduledPayments.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Scheduled Payments</Text>
              {scheduledPayments.map((payment) => (
                <View key={payment.id} style={styles.scheduledPaymentItem}>
                  <Text style={styles.scheduledPaymentDate}>
                    {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                  </Text>
                  <Text style={styles.scheduledPaymentAmount}>{formatAmount(payment.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Payment History */}
          {paymentHistory.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment History</Text>
              {paymentHistory.map((payment) => (
                <View key={payment.id} style={styles.paymentItem}>
                  <Text style={styles.paymentDate}>
                    {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                  </Text>
                  <Text style={styles.paymentAmount}>{formatAmount(payment.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Payment Form */}
          {showPaymentForm && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {scheduledPaymentId ? 'Edit/Make Payment' : 'Make/Schedule Payment'}
              </Text>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <DateInput
                    label="Payment Date"
                    value={paymentDate}
                    onChangeDate={setPaymentDate}
                  />
                </View>

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
              </View>

              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowPaymentForm(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: buttonState.color }, loading && styles.disabledButton]}
                  onPress={handleAddPayment}
                  disabled={loading}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? 'Saving...' : buttonState.text}
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
              onPress={() => {
                loadScheduledPayment();
                setShowPaymentForm(true);
              }}
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
  editButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
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
  paymentDate: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#27ae60',
  },
  emptyPayments: {
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  emptyPaymentsText: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
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
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
  },
  notesText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
});