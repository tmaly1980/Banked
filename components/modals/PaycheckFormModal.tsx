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
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useBills } from '@/contexts/BillsContext';
import { Paycheck } from '@/types';
import DateInput from '@/components/DateInput';
import { timestampToDate, dateToTimestamp } from '@/lib/dateUtils';

interface PaycheckFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingPaycheck?: Paycheck | null;
}

export default function PaycheckFormModal({
  visible,
  onClose,
  onSuccess,
  editingPaycheck,
}: PaycheckFormModalProps) {
  const { createPaycheck, updatePaycheck } = useBills();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Toast.show({ type: 'error', text1: 'Please enter a valid amount' });
      return false;
    }

    if (!date) {
      Toast.show({ type: 'error', text1: 'Please enter a date' });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const amountNum = parseFloat(amount);
      const paycheckData = {
        name: name.trim() || undefined,
        amount: amountNum,
        date: dateToTimestamp(date),
        notes: notes.trim() || undefined,
      };

      if (editingPaycheck) {
        const { error } = await updatePaycheck(editingPaycheck.id, paycheckData);
        if (error) throw error;
      } else {
        const { error } = await createPaycheck(paycheckData);
        if (error) throw error;
      }

      Toast.show({
        type: 'success',
        text1: `Paycheck ${editingPaycheck ? 'updated' : 'added'} successfully`,
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
    if (visible && editingPaycheck) {
      setName(editingPaycheck.name || '');
      setAmount(editingPaycheck.amount.toString());
      setDate(timestampToDate(editingPaycheck.date));
      setNotes(editingPaycheck.notes || '');
    } else if (visible && !editingPaycheck) {
      resetForm();
    }
  }, [visible, editingPaycheck]);

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
            {editingPaycheck ? 'Edit' : 'Add'} Paycheck
          </Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            <Text style={[styles.saveButton, loading && styles.disabledButton]}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Salary, Side job, Bonus, etc."
            />
          </View>

          <DateInput
            label="Date"
            value={date}
            onChangeDate={setDate}
          />

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
  textArea: {
    height: 100,
    paddingTop: 12,
  },
});
