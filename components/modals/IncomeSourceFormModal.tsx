import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { IncomeSource } from '@/types';
import { useIncome } from '@/contexts/IncomeContext';

interface IncomeSourceFormModalProps {
  visible: boolean;
  onClose: () => void;
  incomeSource?: IncomeSource | null;
}

const FREQUENCY_OPTIONS: Array<{ label: string; value: IncomeSource['frequency'] }> = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Bi-Weekly', value: 'bi-weekly' },
  { label: 'Monthly', value: 'monthly' },
];

export default function IncomeSourceFormModal({ visible, onClose, incomeSource }: IncomeSourceFormModalProps) {
  const { addIncomeSource, updateIncomeSource } = useIncome();
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<IncomeSource['frequency']>('monthly');
  const [pendingEarnings, setPendingEarnings] = useState('0.00');

  useEffect(() => {
    if (incomeSource) {
      setName(incomeSource.name);
      setFrequency(incomeSource.frequency);
      setPendingEarnings(incomeSource.pending_earnings.toFixed(2));
    } else {
      setName('');
      setFrequency('monthly');
      setPendingEarnings('0.00');
    }
  }, [incomeSource, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a name for the income source');
      return;
    }

    const earnings = parseFloat(pendingEarnings) || 0;

    try {
      if (incomeSource) {
        await updateIncomeSource(incomeSource.id, {
          name: name.trim(),
          frequency,
          pending_earnings: earnings,
        });
      } else {
        await addIncomeSource({
          name: name.trim(),
          frequency,
          pending_earnings: earnings,
        });
      }
      onClose();
    } catch (err) {
      console.error('Error saving income source:', err);
      alert('Failed to save income source');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {incomeSource ? 'Edit Income Source' : 'Add Income Source'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.modalButton, styles.saveButton]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Main Job, Freelance Work"
                placeholderTextColor="#95a5a6"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Frequency</Text>
              <View style={styles.frequencyButtons}>
                {FREQUENCY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.frequencyButton,
                      frequency === option.value && styles.frequencyButtonActive,
                    ]}
                    onPress={() => setFrequency(option.value)}
                  >
                    <Text
                      style={[
                        styles.frequencyButtonText,
                        frequency === option.value && styles.frequencyButtonTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Pending Earnings</Text>
              <TextInput
                style={styles.input}
                value={pendingEarnings}
                onChangeText={setPendingEarnings}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#95a5a6"
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  saveButton: {
    color: '#3498db',
  },
  modalContent: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dce1e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: 'white',
  },
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dce1e6',
    backgroundColor: 'white',
  },
  frequencyButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  frequencyButtonTextActive: {
    color: 'white',
  },
});
