import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FinancialGoal } from '@/types';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import DateInput from '@/components/DateInput';
import BottomSheetModal from './BottomSheetModal';
import { useRouter } from 'expo-router';

interface FinancialGoalDetailsModalProps {
  visible: boolean;
  goal: FinancialGoal | null;
  onClose: () => void;
  onUpdate: () => void;
}

export default function FinancialGoalDetailsModal({
  visible,
  goal,
  onClose,
  onUpdate,
}: FinancialGoalDetailsModalProps) {
  const router = useRouter();
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [paidDate, setPaidDate] = useState('');
  const [paidAmount, setPaidAmount] = useState('');

  if (!goal) return null;

  const handleEdit = () => {
    onClose();
    // Navigate to edit - will be handled by parent component
    router.push({
      pathname: '/financial-goal-form',
      params: { goalId: goal.id },
    });
  };

  const toggleStatus = async () => {
    if (!goal) return;

    const newStatus = goal.status === 'paid' ? 'pending' : 'paid';
    
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'paid') {
        updateData.paid_at = new Date().toISOString();
        updateData.paid_amount = goal.target_amount;
      } else {
        updateData.paid_at = null;
        updateData.paid_amount = null;
      }

      const { error } = await supabase
        .from('financial_goals')
        .update(updateData)
        .eq('id', goal.id);

      if (error) throw error;

      onUpdate();
      Alert.alert('Success', `Goal marked as ${newStatus}`);
    } catch (err) {
      console.error('Error updating status:', err);
      Alert.alert('Error', 'Failed to update goal status');
    }
  };

  const handleMarkAsPaid = () => {
    setIsMarkingPaid(true);
    setPaidDate(format(new Date(), 'yyyy-MM-dd'));
    setPaidAmount(goal.target_amount.toString());
  };

  const handleCancelMarkPaid = () => {
    setIsMarkingPaid(false);
    setPaidDate('');
    setPaidAmount('');
  };

  const handlePayConfirm = async () => {
    if (!paidDate || !paidAmount) {
      Alert.alert('Error', 'Please enter paid date and amount');
      return;
    }

    try {
      const { error } = await supabase
        .from('financial_goals')
        .update({
          status: 'paid',
          paid_at: paidDate,
          paid_amount: parseFloat(paidAmount),
        })
        .eq('id', goal.id);

      if (error) throw error;

      setIsMarkingPaid(false);
      onUpdate();
      Alert.alert('Success', 'Goal marked as paid');
    } catch (err) {
      console.error('Error marking as paid:', err);
      Alert.alert('Error', 'Failed to mark goal as paid');
    }
  };

  const formatDueInfo = () => {
    if (goal.due_date) {
      return format(parseISO(goal.due_date), 'MMM d, yyyy');
    }
    if (goal.due_week) {
      return `Week ${goal.due_week}`;
    }
    if (goal.due_month) {
      return format(parseISO(goal.due_month + '-01'), 'MMMM yyyy');
    }
    return 'No due date';
  };

  const getStatusColor = () => {
    switch (goal.status) {
      case 'paid': return '#27ae60';
      case 'pending': return '#f39c12';
      case 'active': return '#3498db';
      case 'completed': return '#2ecc71';
      case 'cancelled': return '#95a5a6';
      default: return '#3498db';
    }
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title="Financial Goal"
    >
      <ScrollView style={styles.container}>
        {/* Edit Button in Top Right */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEdit}
        >
          <Ionicons name="pencil" size={20} color="#3498db" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{goal.status.toUpperCase()}</Text>
        </View>

        {/* Goal Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{goal.name}</Text>
        </View>

        {/* Description */}
        {goal.description && (
          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.value}>{goal.description}</Text>
          </View>
        )}

        {/* Target Amount */}
        <View style={styles.section}>
          <Text style={styles.label}>Target Amount</Text>
          <Text style={styles.amountValue}>${goal.target_amount.toFixed(2)}</Text>
        </View>

        {/* Due Date */}
        <View style={styles.section}>
          <Text style={styles.label}>Due</Text>
          <Text style={styles.value}>{formatDueInfo()}</Text>
        </View>

        {/* Payment Info - Show if paid */}
        {goal.status === 'paid' && goal.paid_at && (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>Paid Date</Text>
              <Text style={styles.value}>
                {format(parseISO(goal.paid_at), 'MMM d, yyyy')}
              </Text>
            </View>
            {goal.paid_amount && (
              <View style={styles.section}>
                <Text style={styles.label}>Paid Amount</Text>
                <Text style={styles.amountValue}>${goal.paid_amount.toFixed(2)}</Text>
              </View>
            )}
          </>
        )}

        {/* Mark as Paid Section */}
        {goal.status === 'pending' && !isMarkingPaid && (
          <TouchableOpacity
            style={styles.markPaidButton}
            onPress={handleMarkAsPaid}
          >
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <Text style={styles.markPaidButtonText}>Mark as Paid</Text>
          </TouchableOpacity>
        )}

        {/* Payment Input Form */}
        {isMarkingPaid && (
          <View style={styles.paymentForm}>
            <Text style={styles.paymentFormTitle}>Payment Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Paid Date</Text>
              <DateInput
                label=""
                value={paidDate}
                onChangeDate={setPaidDate}
                placeholder="Select date"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Paid Amount</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={paidAmount}
                  onChangeText={setPaidAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>
            </View>

            <View style={styles.paymentActions}>
              <TouchableOpacity
                style={[styles.paymentButton, styles.cancelButton]}
                onPress={handleCancelMarkPaid}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentButton, styles.confirmButton]}
                onPress={handlePayConfirm}
              >
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={styles.confirmButtonText}>Pay</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Toggle Paid/Pending Status - Quick toggle for already paid goals */}
        {goal.status === 'paid' && (
          <TouchableOpacity
            style={styles.toggleStatusButton}
            onPress={toggleStatus}
          >
            <Text style={styles.toggleStatusText}>Mark as Pending</Text>
          </TouchableOpacity>
        )}

        {/* Created Date */}
        <View style={[styles.section, styles.metaSection]}>
          <Text style={styles.metaLabel}>Created</Text>
          <Text style={styles.metaValue}>
            {format(parseISO(goal.created_at), 'MMM d, yyyy h:mm a')}
          </Text>
        </View>
      </ScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    zIndex: 10,
  },
  editButtonText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
    color: '#2c3e50',
  },
  amountValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  markPaidButton: {
    backgroundColor: '#27ae60',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginVertical: 20,
    gap: 8,
  },
  markPaidButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentForm: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginVertical: 20,
  },
  paymentFormTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    fontWeight: '600',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
  },
  dollarSign: {
    fontSize: 18,
    color: '#2c3e50',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    paddingVertical: 12,
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  paymentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  cancelButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#7f8c8d',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#27ae60',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleStatusButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#f39c12',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  toggleStatusText: {
    color: '#f39c12',
    fontSize: 14,
    fontWeight: '600',
  },
  metaSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  metaLabel: {
    fontSize: 12,
    color: '#95a5a6',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 12,
    color: '#95a5a6',
  },
});
