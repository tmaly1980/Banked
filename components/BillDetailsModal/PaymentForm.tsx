import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import DateInput from '@/components/DateInput';
import { BillModel } from '@/models/BillModel';

interface PaymentFormProps {
  paymentAmount: string;
  paymentDate: string;
  appliedDate: string;
  scheduledPaymentId: string | null;
  loading: boolean;
  buttonState: { text: string; color: string };
  onPaymentAmountChange: (amount: string) => void;
  onPaymentDateChange: (date: string) => void;
  onAppliedDateChange: (date: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function PaymentForm({
  paymentAmount,
  paymentDate,
  appliedDate,
  scheduledPaymentId,
  loading,
  buttonState,
  onPaymentAmountChange,
  onPaymentDateChange,
  onAppliedDateChange,
  onSubmit,
  onCancel,
}: PaymentFormProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {scheduledPaymentId ? 'Edit/Make Payment' : 'Make/Schedule Payment'}
      </Text>

      <View style={styles.inputGroup}>
        <DateInput
          label="Payment Date"
          value={paymentDate}
          onChangeDate={onPaymentDateChange}
        />
      </View>

      <View style={styles.inputGroup}>
        <DateInput
          label="Applied Date (Optional)"
          value={appliedDate}
          onChangeDate={onAppliedDateChange}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Payment Amount</Text>
        <TextInput
          style={styles.input}
          value={paymentAmount}
          onChangeText={onPaymentAmountChange}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.formButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: buttonState.color }, loading && styles.disabledButton]}
          onPress={onSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Saving...' : buttonState.text}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
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
  disabledButton: {
    opacity: 0.6,
  },
});
