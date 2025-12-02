import React, { useState } from 'react';
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
import Toast from 'react-native-toast-message';
import { Chip } from 'react-native-paper';
import { useBills } from '@/contexts/BillsContext';
import { Bill } from '@/types';
import DateInput from '@/components/DateInput';
import DayOfMonthInput from '@/components/DayOfMonthInput';

interface BillFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type: 'bill' | 'paycheck';
  editingBill?: Bill | null;
}

export default function BillFormModal({
  visible,
  onClose,
  onSuccess,
  type,
  editingBill,
}: BillFormModalProps) {
  const { createBill, updateBill, createPaycheck } = useBills();
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
    onClose();
  };

  const validateForm = () => {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter a name' });
      return false;
    }
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Toast.show({ type: 'error', text1: 'Please enter a valid amount' });
      return false;
    }

    if (type === 'bill' && isRecurring && dueDay) {
      const dayNum = parseInt(dueDay);
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
        Toast.show({ type: 'error', text1: 'Please enter a valid due day (1-31)' });
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

      if (type === 'paycheck') {
        const { error } = await createPaycheck({
          amount: amountNum,
          date: dueDate || new Date().toISOString().split('T')[0],
          notes: notes.trim() || undefined,
        });

        if (error) throw error;
      } else {
        const hasDueDate = isRecurring ? !!dueDay : !!dueDate;
        const billData = {
          name: name.trim(),
          amount: amountNum,
          due_date: isRecurring ? undefined : (dueDate || undefined),
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
      }

      Toast.show({
        type: 'success',
        text1: `${type === 'paycheck' ? 'Paycheck' : 'Bill'} ${
          editingBill ? 'updated' : 'added'
        } successfully`,
      });
      
      resetForm();
      onSuccess();
      onClose();
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

  React.useEffect(() => {
    if (visible && editingBill) {
      setName(editingBill.name);
      setAmount(editingBill.amount.toString());
      setDueDate(editingBill.due_date || '');
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
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {editingBill ? 'Edit' : 'Add'} {type === 'paycheck' ? 'Paycheck' : 'Bill'}
          </Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            <Text style={[styles.saveButton, loading && styles.disabledButton]}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {type === 'paycheck' ? 'Description' : 'Bill Name'}
            </Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={type === 'paycheck' ? 'Salary, Side job, etc.' : 'Electric Bill, Rent, etc.'}
            />
          </View>

          {type === 'paycheck' && (
            <DateInput
              label="Date"
              value={dueDate}
              onChangeDate={setDueDate}
            />
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>

          {type === 'paycheck' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any notes or reminders..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          )}

          {type === 'bill' && (
            <>
              <View style={styles.switchGroup}>
                <Text style={styles.label}>Recurring Monthly</Text>
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Priority</Text>
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
                <Text style={styles.label}>Loss Risk</Text>
                <Switch value={lossRiskFlag} onValueChange={setLossRiskFlag} />
              </View>

              <View style={styles.switchGroup}>
                <Text style={styles.label}>Deferred</Text>
                <Switch value={deferredFlag} onValueChange={setDeferredFlag} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any notes or reminders..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </>
          )}
        </ScrollView>
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
  cancelButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  saveButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  form: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
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