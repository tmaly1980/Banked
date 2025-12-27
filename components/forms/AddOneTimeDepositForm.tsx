import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import DateInput from '@/components/DateInput';
import { Deposit, RecurringDeposit } from '@/types';
import { formatDateForDB } from '@/utils/depositHelpers';
import { timestampToDate } from '@/lib/dateUtils';

interface AddOneTimeDepositFormProps {
  editingDeposit?: Deposit | null;
  editingRecurring?: RecurringDeposit | null;
  onFormChange?: () => void;
}

export interface OneTimeDepositFormData {
  name: string;
  amount: string;
  date: string;
  notes: string;
}

export interface OneTimeDepositFormRef {
  getFormData: () => OneTimeDepositFormData;
  resetForm: () => void;
  validateForm: () => boolean;
}

const AddOneTimeDepositForm = forwardRef<OneTimeDepositFormRef, AddOneTimeDepositFormProps>(
  ({ editingDeposit, editingRecurring, onFormChange }, ref) => {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [notes, setNotes] = useState('');

    // Notify parent when any field changes
    useEffect(() => {
      onFormChange?.();
    }, [name, amount, date, notes]);

    // Load editing data - handle both editing existing deposit and switching from recurring
    useEffect(() => {
      console.log('[AddOneTimeDepositForm] Loading data:', { editingDeposit, editingRecurring });
      if (editingDeposit) {
        console.log('[AddOneTimeDepositForm] Populating with deposit:', editingDeposit);
        setName(editingDeposit.name || '');
        setAmount(editingDeposit.amount.toString());
        setDate(editingDeposit.date ? timestampToDate(editingDeposit.date) : '');
        setNotes(editingDeposit.notes || '');
      } else if (editingRecurring) {
        // When switching from recurring to once, pre-fill with recurring data
        console.log('[AddOneTimeDepositForm] Populating with recurring:', editingRecurring);
        setName('');
        setAmount(editingRecurring.amount.toString());
        setDate(editingRecurring.start_date);
        setNotes('');
      } else {
        // Clear form when not editing
        setName('');
        setAmount('');
        setDate('');
        setNotes('');
      }
    }, [editingDeposit, editingRecurring]);

    // Expose form data and reset method
    useImperativeHandle(ref, () => ({
      getFormData: (): OneTimeDepositFormData => ({
        name,
        amount,
        date,
        notes,
      }),
      resetForm: () => {
        setName('');
        setAmount('');
        setDate('');
        setNotes('');
      },
      validateForm: (): boolean => {
        const amountNum = parseFloat(amount);
        return !isNaN(amountNum) && amountNum > 0;
      },
    }));

    return (
      <View>
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
          onChange={setDate}
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
      </View>
    );
  }
);

AddOneTimeDepositForm.displayName = 'AddOneTimeDepositForm';

export default AddOneTimeDepositForm;

const styles = StyleSheet.create({
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
