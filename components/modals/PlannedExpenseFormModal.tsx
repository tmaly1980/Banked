import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InlineAlert } from '@/components/InlineAlert';
import { useInlineAlert } from '@/hooks/useInlineAlert';
import { usePlannedExpenses } from '@/contexts/PlannedExpensesContext';
import { PlannedExpense } from '@/types';
import AmountInput from '@/components/AmountInput';
import DateInput from '@/components/DateInput';
import { globalStyles } from '@/lib/globalStyles';

interface PlannedExpenseFormModalProps {
  visible: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  editingExpense?: PlannedExpense | null;
}

export default function PlannedExpenseFormModal({
  visible,
  onClose,
  onSuccess,
  editingExpense,
}: PlannedExpenseFormModalProps) {
  const { alert, showError, showSuccess, hideAlert } = useInlineAlert();
  const { createPlannedExpense, updatePlannedExpense, deletePlannedExpense } = usePlannedExpenses();
  
  const [name, setName] = useState(editingExpense?.name || '');
  const [budgetedAmount, setBudgetedAmount] = useState(editingExpense?.budgeted_amount?.toString() || '');
  const [fundedAmount, setFundedAmount] = useState(editingExpense?.funded_amount?.toString() || '');
  const [plannedDate, setPlannedDate] = useState(editingExpense?.planned_date || '');
  const [isScheduled, setIsScheduled] = useState(editingExpense?.is_scheduled || false);
  const [notes, setNotes] = useState(editingExpense?.notes || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingExpense) {
      setName(editingExpense.name);
      setBudgetedAmount(editingExpense.budgeted_amount?.toString() || '');
      setFundedAmount(editingExpense.funded_amount?.toString() || '');
      setPlannedDate(editingExpense.planned_date || '');
      setIsScheduled(editingExpense.is_scheduled || false);
      setNotes(editingExpense.notes || '');
    }
  }, [editingExpense]);

  useEffect(() => {
    if (alert.visible) {
      hideAlert();
    }
  }, [name, budgetedAmount, fundedAmount, plannedDate, isScheduled, notes]);

  const resetForm = () => {
    setName('');
    setBudgetedAmount('');
    setFundedAmount('');
    setPlannedDate('');
    setIsScheduled(false);
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const validateForm = () => {
    if (!name.trim()) {
      showError('Please enter a name');
      return false;
    }
    
    if (!budgetedAmount.trim()) {
      showError('Please enter a budgeted amount');
      return false;
    }

    const budgetedNum = parseFloat(budgetedAmount);
    if (isNaN(budgetedNum) || budgetedNum <= 0) {
      showError('Please enter a valid budgeted amount');
      return false;
    }

    if (fundedAmount.trim()) {
      const fundedNum = parseFloat(fundedAmount);
      if (isNaN(fundedNum) || fundedNum < 0) {
        showError('Please enter a valid funded amount');
        return false;
      }
      if (fundedNum > budgetedNum) {
        showError('Funded amount cannot exceed budgeted amount');
        return false;
      }
    }

    if (!plannedDate) {
      showError('Please select a planned date');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const expenseData = {
        name: name.trim(),
        budgeted_amount: parseFloat(budgetedAmount),
        funded_amount: fundedAmount.trim() ? parseFloat(fundedAmount) : 0,
        planned_date: plannedDate,
        is_scheduled: isScheduled,
        notes: notes.trim() || undefined,
      };

      if (editingExpense) {
        const { error } = await updatePlannedExpense(editingExpense.id, expenseData);
        if (error) throw error;
      } else {
        const { error } = await createPlannedExpense(expenseData);
        if (error) throw error;
      }

      showSuccess(`Planned expense ${editingExpense ? 'updated' : 'added'} successfully`);
      
      resetForm();
      onSuccess?.();
      onClose?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingExpense) return;

    Alert.alert(
      'Delete Planned Expense',
      `Are you sure you want to delete "${editingExpense.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await deletePlannedExpense(editingExpense.id);
              if (error) throw error;
              
              showSuccess('Planned expense deleted successfully');
              resetForm();
              onSuccess?.();
              onClose?.();
            } catch (error) {
              showError(error instanceof Error ? error.message : 'An error occurred');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {editingExpense ? 'Edit Planned Expense' : 'Add Planned Expense'}
            </Text>
            <TouchableOpacity 
              onPress={handleSubmit} 
              style={styles.headerButton}
              disabled={loading}
            >
              <Text style={[styles.saveText, loading && styles.saveTextDisabled]}>
                {loading ? 'Saving...' : editingExpense ? 'Save' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <InlineAlert alert={alert} />

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Vacation, Home Repair"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* Budgeted Amount */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Budgeted Amount</Text>
              <AmountInput
                value={budgetedAmount}
                onChangeText={setBudgetedAmount}
                placeholder="0.00"
              />
            </View>

            {/* Funded Amount */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Funded Amount</Text>
              <AmountInput
                value={fundedAmount}
                onChangeText={setFundedAmount}
                placeholder="0.00"
              />
            </View>

            {/* Planned Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Planned Date</Text>
              <DateInput
                label=""
                value={plannedDate}
                onChange={setPlannedDate}
                placeholder="Select date"
              />
            </View>

            {/* Is Scheduled Toggle */}
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.switchLabel}>Is Scheduled</Text>
                <Text style={styles.switchSubLabel}>
                  Mark if this is a confirmed scheduled expense
                </Text>
              </View>
              <Switch
                value={isScheduled}
                onValueChange={setIsScheduled}
                trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                thumbColor={isScheduled ? '#fff' : '#f4f3f4'}
              />
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add any additional details..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Delete Button (if editing) */}
            {editingExpense && (
              <TouchableOpacity
                style={[styles.deleteButton, loading && styles.buttonDisabled]}
                onPress={handleDelete}
                disabled={loading}
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
                <Text style={styles.deleteButtonText}>Delete Planned Expense</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  headerButton: {
    padding: 4,
    minWidth: 60,
  },
  cancelText: {
    fontSize: 16,
    color: '#6b7280',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
    textAlign: 'right',
  },
  saveTextDisabled: {
    color: '#9ca3af',
  },
  scrollContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  switchSubLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    padding: 14,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
