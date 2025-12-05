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
} from 'react-native';
import SelectPicker from '@/components/SelectPicker';
import { ExpenseType } from '@/types';
import { format } from 'date-fns';

interface AddPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  expenseTypes: ExpenseType[];
  onSuccess: (data: { title: string; expense_type_id: string; amount: number; purchase_date: string; notes?: string }) => void;
}

export default function AddPurchaseModal({
  visible,
  onClose,
  expenseTypes,
  onSuccess,
}: AddPurchaseModalProps) {
  const [title, setTitle] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      setTitle('');
      setSelectedTypeId('');
      setAmount('');
      setPurchaseDate(format(new Date(), 'yyyy-MM-dd'));
      setNotes('');
    }
  }, [visible]);

  const handleClose = () => {
    setTitle('');
    setSelectedTypeId('');
    setAmount('');
    setPurchaseDate(format(new Date(), 'yyyy-MM-dd'));
    setNotes('');
    onClose();
  };

  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || !selectedTypeId || !amount || isNaN(parsedAmount) || parsedAmount <= 0) return;

    onSuccess({
      title: title.trim(),
      expense_type_id: selectedTypeId,
      amount: parsedAmount,
      purchase_date: purchaseDate,
      notes: notes.trim() || undefined,
    });
  };

  const isValid = title.trim() && selectedTypeId && amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;

  const pickerItems = expenseTypes.map(type => ({
    label: type.name,
    value: type.id,
  }));

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
          <Text style={styles.title}>Add Purchase</Text>
          <TouchableOpacity onPress={handleSave} disabled={!title.trim() || !selectedTypeId}>
            <Text style={[styles.saveButton, (!title.trim() || !selectedTypeId) && styles.disabledButton]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Weekly Groceries"
              placeholderTextColor="#999"
              autoFocus
            />
          </View>

          <View style={styles.inputGroup}>
            <SelectPicker
              label="Expense Type"
              value={selectedTypeId}
              onValueChange={setSelectedTypeId}
              items={pickerItems}
              placeholder="Select expense type..."
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any additional details..."
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
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
    height: 80,
    textAlignVertical: 'top',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
});
