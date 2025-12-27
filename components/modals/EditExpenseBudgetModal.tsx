import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpenseType, ExpenseBudget } from '@/types';
import { format } from 'date-fns';
import PillPicker from '@/components/PillPicker';
import DateInput from '@/components/DateInput';
import { globalStyles } from '@/lib/globalStyles';

interface EditExpenseBudgetModalProps {
  visible: boolean;
  onClose: () => void;
  expenseType: ExpenseType | null;
  existingBudget: ExpenseBudget | null;
  onSave: (data: {
    expense_type_id: string;
    effective_from: string;
    effective_to?: string;
    start_mmdd?: string;
    end_mmdd?: string;
    frequency: 'once' | 'weekly' | 'monthly' | 'yearly';
    amount: number;
    notes?: string;
  }) => Promise<void>;
}

const FREQUENCY_OPTIONS = ['once', 'weekly', 'monthly', 'yearly'] as const;
const FREQUENCY_LABELS: Record<typeof FREQUENCY_OPTIONS[number], string> = {
  once: 'Once',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export default function EditExpenseBudgetModal({
  visible,
  onClose,
  expenseType,
  existingBudget,
  onSave,
}: EditExpenseBudgetModalProps) {
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [startDay, setStartDay] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [endDay, setEndDay] = useState('');
  const [frequency, setFrequency] = useState<'once' | 'weekly' | 'monthly' | 'yearly'>('once');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (existingBudget) {
        setEffectiveFrom(existingBudget.effective_from);
        setEffectiveTo(existingBudget.effective_to || '');
        setFrequency(existingBudget.frequency);
        setAmount(existingBudget.amount.toString());
        setNotes(existingBudget.notes || '');
        
        if (existingBudget.start_mmdd) {
          setStartMonth(existingBudget.start_mmdd.substring(0, 2));
          setStartDay(existingBudget.start_mmdd.substring(2, 4));
        } else {
          setStartMonth('');
          setStartDay('');
        }
        
        if (existingBudget.end_mmdd) {
          setEndMonth(existingBudget.end_mmdd.substring(0, 2));
          setEndDay(existingBudget.end_mmdd.substring(2, 4));
        } else {
          setEndMonth('');
          setEndDay('');
        }
      } else {
        // New budget - prefill effective_from to today
        setEffectiveFrom(format(new Date(), 'yyyy-MM-dd'));
        setEffectiveTo('');
        setStartMonth('');
        setStartDay('');
        setEndMonth('');
        setEndDay('');
        setFrequency('once');
        setAmount('');
        setNotes('');
      }
    }
  }, [visible, existingBudget]);

  const handleSave = async () => {
    if (!expenseType || !effectiveFrom || !amount) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) return;

    setSaving(true);
    try {
      const data: any = {
        expense_type_id: expenseType.id,
        effective_from: effectiveFrom,
        effective_to: effectiveTo || undefined,
        frequency,
        amount: parsedAmount,
        notes: notes || undefined,
      };

      // Add start_mmdd and end_mmdd only for yearly frequency
      if (frequency === 'yearly') {
        if (startMonth && startDay) {
          const mm = startMonth.padStart(2, '0');
          const dd = startDay.padStart(2, '0');
          data.start_mmdd = mm + dd;
        }
        if (endMonth && endDay) {
          const mm = endMonth.padStart(2, '0');
          const dd = endDay.padStart(2, '0');
          data.end_mmdd = mm + dd;
        }
      }

      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Failed to save budget:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!expenseType) return null;

  const canSave = effectiveFrom && amount && parseFloat(amount) >= 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={globalStyles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={globalStyles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={globalStyles.modalTitle}>Edit {expenseType.name} Budget</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!canSave || saving}
            >
              <Text style={[
                globalStyles.saveButton,
                (!canSave || saving) && globalStyles.disabledButton
              ]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Amount */}
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

            {/* Frequency */}
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Frequency</Text>
              <PillPicker
                options={FREQUENCY_OPTIONS}
                value={frequency}
                onChange={setFrequency}
                labels={FREQUENCY_LABELS}
              />
            </View>

            {/* Effective From */}
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Effective From</Text>
              <DateInput
                label=""
                value={effectiveFrom}
                onChange={setEffectiveFrom}
                placeholder="Select date"
              />
            </View>

            {/* Effective To */}
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Effective To (Optional)</Text>
              <DateInput
                label=""
                value={effectiveTo}
                onChange={setEffectiveTo}
                placeholder="Leave blank for ongoing"
              />
            </View>

            {/* Yearly-specific fields */}
            {frequency === 'yearly' && (
              <>
                <View style={globalStyles.inputGroup}>
                  <Text style={globalStyles.label}>Start Month/Day</Text>
                  <View style={styles.mmddRow}>
                    <TextInput
                      style={[globalStyles.input, styles.mmddInput]}
                      value={startMonth}
                      onChangeText={(text) => {
                        const num = parseInt(text);
                        if (text === '' || (num >= 1 && num <= 12)) {
                          setStartMonth(text);
                        }
                      }}
                      placeholder="MM"
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                    <Text style={styles.mmddSeparator}>/</Text>
                    <TextInput
                      style={[globalStyles.input, styles.mmddInput]}
                      value={startDay}
                      onChangeText={(text) => {
                        const num = parseInt(text);
                        if (text === '' || (num >= 1 && num <= 31)) {
                          setStartDay(text);
                        }
                      }}
                      placeholder="DD"
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                </View>

                <View style={globalStyles.inputGroup}>
                  <Text style={globalStyles.label}>End Month/Day (Optional)</Text>
                  <View style={styles.mmddRow}>
                    <TextInput
                      style={[globalStyles.input, styles.mmddInput]}
                      value={endMonth}
                      onChangeText={(text) => {
                        const num = parseInt(text);
                        if (text === '' || (num >= 1 && num <= 12)) {
                          setEndMonth(text);
                        }
                      }}
                      placeholder="MM"
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                    <Text style={styles.mmddSeparator}>/</Text>
                    <TextInput
                      style={[globalStyles.input, styles.mmddInput]}
                      value={endDay}
                      onChangeText={(text) => {
                        const num = parseInt(text);
                        if (text === '' || (num >= 1 && num <= 31)) {
                          setEndDay(text);
                        }
                      }}
                      placeholder="DD"
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                </View>
              </>
            )}

            {/* Notes */}
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Notes (Optional)</Text>
              <TextInput
                style={[globalStyles.input, globalStyles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes..."
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  mmddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mmddInput: {
    flex: 1,
    textAlign: 'center',
  },
  mmddSeparator: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7f8c8d',
  },
});
