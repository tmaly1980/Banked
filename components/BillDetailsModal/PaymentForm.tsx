import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateInput from '@/components/DateInput';
import AmountInput from '@/components/AmountInput';
import MonthYearInput from '@/components/MonthYearInput';
import { BillModel } from '@/models/BillModel';
import { format } from 'date-fns';

interface PaymentFormProps {
  paymentAmount: string;
  paymentDate: string;
  appliedMonthYear: string;
  additionalFees: string;
  scheduledPaymentId: string | null;
  loading: boolean;
  buttonState: { text: string; color: string };
  nextDueDate?: Date;
  onPaymentAmountChange: (amount: string) => void;
  onPaymentDateChange: (date: string) => void;
  onAppliedMonthYearChange: (monthYear: string) => void;
  onAdditionalFeesChange: (fees: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function PaymentForm({
  paymentAmount,
  paymentDate,
  appliedMonthYear,
  additionalFees,
  scheduledPaymentId,
  loading,
  buttonState,
  nextDueDate,
  onPaymentAmountChange,
  onPaymentDateChange,
  onAppliedMonthYearChange,
  onAdditionalFeesChange,
  onSubmit,
  onCancel,
}: PaymentFormProps) {
  // Set default Applied Month to current month/year if not set
  React.useEffect(() => {
    if (!appliedMonthYear) {
      const now = new Date();
      const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      onAppliedMonthYearChange(currentMonthYear);
    }
  }, [appliedMonthYear, onAppliedMonthYearChange]);

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {scheduledPaymentId ? 'Edit/Make Payment' : 'Make/Schedule Payment'}
        </Text>

        <View style={styles.inputRow}>
          <View style={styles.halfInputGroup}>
            <Text style={styles.label}>Payment Amount</Text>
            <AmountInput
              value={paymentAmount}
              onChangeText={onPaymentAmountChange}
              placeholder="0.00"
            />
          </View>

          <View style={styles.halfInputGroup}>
            <DateInput
              label="Payment Date"
              value={paymentDate}
              onChange={onPaymentDateChange}
            />
          </View>
        </View>

        <View style={styles.inputRow}>
          <View style={styles.halfInputGroup}>
            <Text style={styles.label}>Additional Fees</Text>
            <AmountInput
              value={additionalFees}
              onChangeText={onAdditionalFeesChange}
              placeholder="0.00"
            />
            <Text style={styles.helpText}>Late fees, etc.</Text>
          </View>

          <View style={styles.halfInputGroup}>
            <MonthYearInput
              label="Applied Month"
              value={appliedMonthYear}
              onChangeValue={onAppliedMonthYearChange}
              preselectedDate={nextDueDate}
              showClearButton={false}
            />
          </View>
        </View>
      </View>

      <View style={styles.fixedFooter}>
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
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    flex: 1,
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
  halfInputGroup: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  fixedFooter: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },
  helpText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
    fontStyle: 'italic',
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
