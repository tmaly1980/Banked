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
} from 'react-native';
import { InlineAlert } from '@/components/InlineAlert';
import { useInlineAlert } from '@/hooks/useInlineAlert';
import { Chip } from 'react-native-paper';
import { useBills } from '@/contexts/BillsContext';
import { BillModel } from '@/models/BillModel';
import DateInput from '@/components/DateInput';
import DayOfMonthInput from '@/components/DayOfMonthInput';
import { dateToTimestamp, timestampToDate } from '@/lib/dateUtils';
import { globalStyles } from '@/lib/globalStyles';

interface BillFormModalProps {
  visible: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  editingBill?: BillModel | null;
}

export default function BillFormModal({
  visible,
  onClose,
  onSuccess,
  editingBill,
}: BillFormModalProps) {
  const { alert, showError, showSuccess, hideAlert } = useInlineAlert();
  const { createBill, updateBill } = useBills();
  const [name, setName] = useState(editingBill?.name || '');
  const [amount, setAmount] = useState(editingBill?.amount?.toString() || '');
  const [dueDate, setDueDate] = useState(editingBill?.due_date || '');
  const [dueDay, setDueDay] = useState(editingBill?.due_day?.toString() || '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(
    editingBill?.priority || 'medium'
  );
  const [lossRiskFlag, setLossRiskFlag] = useState(editingBill?.loss_risk_flag || false);
  const [deferredFlag, setDeferredFlag] = useState(editingBill?.deferred_flag || false);
  const [notes, setNotes] = useState(editingBill?.notes || '');
  const [isRecurring, setIsRecurring] = useState(!!editingBill?.due_day);
  const [loading, setLoading] = useState(false);

  // Auto-hide alert when form values change
  useEffect(() => {
    if (alert.visible) {
      hideAlert();
    }
  }, [name, amount, dueDate, dueDay, priority, lossRiskFlag, deferredFlag, notes, isRecurring]);

  const resetForm = () => {
    setName('');
    setAmount('');
    setDueDate('');
    setDueDay('');
    setPriority('medium');
    setLossRiskFlag(false);
    setDeferredFlag(false);
    setNotes('');
    setIsRecurring(false);
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
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showError('Please enter a valid amount');
      return false;
    }

    if (isRecurring && dueDay) {
      const dayNum = parseInt(dueDay);
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
        showError('Please enter a valid due day (1-31)');
        return false;
      }
    }

    return true;
  };
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const amountNum = parseFloat(amount);
      const hasDueDate = isRecurring ? !!dueDay : !!dueDate;
      const billData = {
        name: name.trim(),
        amount: amountNum,
        due_date: isRecurring ? undefined : (dueDate ? dateToTimestamp(dueDate) : undefined),
        due_day: isRecurring ? (dueDay ? parseInt(dueDay) : undefined) : undefined,
        priority,
        loss_risk_flag: lossRiskFlag,
        deferred_flag: !hasDueDate ? true : deferredFlag,
        notes: notes.trim() || undefined,
      };

      if (editingBill) {
        const { error } = await updateBill(editingBill.id, billData);
        if (error) throw error;
      } else {
        const { error } = await createBill(billData);
        if (error) throw error;
      }

      showSuccess(`Bill ${editingBill ? 'updated' : 'added'} successfully`);
      
      resetForm();
      onSuccess?.();
      onClose?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (visible && editingBill) {
      setName(editingBill.name);
      setAmount(editingBill.amount.toString());
      setDueDate(editingBill.due_date ? timestampToDate(editingBill.due_date) : '');
      setDueDay(editingBill.due_day?.toString() || '');
      setPriority(editingBill.priority);
      setLossRiskFlag(editingBill.loss_risk_flag);
      setDeferredFlag(editingBill.deferred_flag);
      setNotes(editingBill.notes || '');
      setIsRecurring(!!editingBill.due_day);
    }
  }, [visible, editingBill]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={globalStyles.modalContainer}
      >
        <View style={globalStyles.modalHeader}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={globalStyles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={globalStyles.modalTitle}>
            {editingBill ? 'Edit' : 'Add'} Bill
          </Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            <Text style={[globalStyles.saveButton, loading && globalStyles.disabledButton]}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={globalStyles.form}>
          <InlineAlert
            type={alert.type}
            message={alert.message}
            visible={alert.visible}
            onDismiss={hideAlert}
          />

          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.label}>Bill Name</Text>
            <TextInput
              style={globalStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="Electric Bill, Rent, etc."
            />
          </View>

          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.label}>Amount</Text>
            <TextInput
              style={globalStyles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.switchGroup}>
            <Text style={globalStyles.label}>Recurring Monthly</Text>
            <Switch value={isRecurring} onValueChange={setIsRecurring} />
          </View>

          {isRecurring ? (
            <DayOfMonthInput
              label="Day of Month"
              value={dueDay}
              onChangeDay={setDueDay}
            />
          ) : (
            <DateInput
              label="Due Date"
              value={dueDate}
              onChangeDate={setDueDate}
            />
          )}

          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.label}>Priority</Text>
            <View style={styles.chipContainer}>
              <Chip
                mode={priority === 'low' ? 'flat' : 'outlined'}
                selected={priority === 'low'}
                onPress={() => setPriority('low')}
                style={[styles.chip, priority === 'low' && styles.chipSelectedLow]}
                textStyle={priority === 'low' ? styles.chipTextSelected : styles.chipText}
              >
                Low
              </Chip>
              <Chip
                mode={priority === 'medium' ? 'flat' : 'outlined'}
                selected={priority === 'medium'}
                onPress={() => setPriority('medium')}
                style={[styles.chip, priority === 'medium' && styles.chipSelectedMedium]}
                textStyle={priority === 'medium' ? styles.chipTextSelected : styles.chipText}
              >
                Medium
              </Chip>
              <Chip
                mode={priority === 'high' ? 'flat' : 'outlined'}
                selected={priority === 'high'}
                onPress={() => setPriority('high')}
                style={[styles.chip, priority === 'high' && styles.chipSelectedHigh]}
                textStyle={priority === 'high' ? styles.chipTextSelected : styles.chipText}
              >
                High
              </Chip>
            </View>
          </View>

          <View style={styles.switchGroup}>
            <Text style={globalStyles.label}>Loss Risk</Text>
            <Switch value={lossRiskFlag} onValueChange={setLossRiskFlag} />
          </View>

          <View style={styles.switchGroup}>
            <Text style={globalStyles.label}>Deferred</Text>
            <Switch value={deferredFlag} onValueChange={setDeferredFlag} />
          </View>

          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.label}>Notes</Text>
            <TextInput
              style={[globalStyles.input, globalStyles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes or reminders..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    borderColor: '#ddd',
  },
  chipSelectedLow: {
    backgroundColor: '#27ae60',
  },
  chipSelectedMedium: {
    backgroundColor: '#f39c12',
  },
  chipSelectedHigh: {
    backgroundColor: '#e74c3c',
  },
  chipText: {
    color: '#666',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
});