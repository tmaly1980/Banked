import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateInput from '@/components/DateInput';
import AmountInput from '@/components/AmountInput';
import MonthYearInput from '@/components/MonthYearInput';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface BillPaymentSheetProps {
  visible: boolean;
  billId: string | null;
  billName: string;
  billAmount: number;
  isVariable: boolean;
  isDeferred: boolean;
  nextDueDate?: Date;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BillPaymentSheet({
  visible,
  billId,
  billName,
  billAmount,
  isVariable,
  isDeferred,
  nextDueDate,
  onClose,
  onSuccess,
}: BillPaymentSheetProps) {
  const { user } = useAuth();
  const [isDeferMode, setIsDeferMode] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Payment form fields
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [appliedMonthYear, setAppliedMonthYear] = useState('');
  const [additionalFees, setAdditionalFees] = useState('');
  
  // Defer form fields
  const [deferReason, setDeferReason] = useState('');
  const [deferMonthYear, setDeferMonthYear] = useState('');

  useEffect(() => {
    if (visible && billId) {
      // Reset form
      setIsDeferMode(isDeferred);
      setPaymentAmount(billAmount.toString());
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      setAdditionalFees('');
      setDeferReason('');
      
      // Set default defer month-year and applied month to current month
      const now = new Date();
      const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setDeferMonthYear(currentMonthYear);
      setAppliedMonthYear(currentMonthYear);
    }
  }, [visible, billId, billAmount, isDeferred]);

  const handleMakePayment = async () => {
    if (!billId || !user) return;
    
    setLoading(true);
    try {
      const amount = parseFloat(paymentAmount) + parseFloat(additionalFees || '0');
      
      const { error } = await supabase.from('bill_payments').insert({
        bill_id: billId,
        user_id: user.id,
        amount,
        payment_date: paymentDate,
        applied_month_year: appliedMonthYear,
        is_paid: true,
      });

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error making payment:', error);
      alert('Failed to make payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDeferPayment = async () => {
    if (!billId || !user) return;
    
    setLoading(true);
    try {
      // Insert into bill_deferments table
      const { error } = await supabase
        .from('bill_deferments')
        .insert({
          bill_id: billId,
          user_id: user.id,
          month_year: deferMonthYear,
          reason: deferReason || null,
        });

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error deferring payment:', error);
      alert('Failed to defer payment');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDeferred = async () => {
    if (!billId || !user) return;
    
    setLoading(true);
    try {
      // Delete all deferments for this bill
      const { error } = await supabase
        .from('bill_deferments')
        .delete()
        .eq('bill_id', billId)
        .eq('user_id', user.id);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error removing deferred status:', error);
      alert('Failed to remove deferred status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.headerCenter}>
                <Text style={styles.billName}>{billName}</Text>
              </View>
              <View style={styles.headerRight}>
                {isDeferred && (
                  <TouchableOpacity onPress={handleRemoveDeferred} disabled={loading}>
                    <Ionicons name="trash-outline" size={24} color="#e74c3c" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Toggle Buttons */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, !isDeferMode && styles.toggleButtonActive]}
                onPress={() => setIsDeferMode(false)}
              >
                <Text style={[styles.toggleText, !isDeferMode && styles.toggleTextActive]}>
                  Make Payment
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, isDeferMode && styles.toggleButtonActive]}
                onPress={() => setIsDeferMode(true)}
              >
                <Text style={[styles.toggleText, isDeferMode && styles.toggleTextActive]}>
                  Defer Payment
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {isDeferMode ? (
                // Defer Mode
                <View style={styles.deferContent}>
                  <View style={styles.inputGroup}>
                    <MonthYearInput
                      label="Defer For Month"
                      value={deferMonthYear}
                      onChangeValue={setDeferMonthYear}
                      preselectedDate={nextDueDate}
                      showClearButton={false}
                    />
                    <Text style={styles.helpText}>
                      Bill will be excluded from calculations for this month
                    </Text>
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Reason (Optional)</Text>
                    <TextInput
                      style={styles.textArea}
                      value={deferReason}
                      onChangeText={setDeferReason}
                      placeholder="Why are you deferring this bill?"
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              ) : (
                // Payment Mode
                <View style={styles.paymentForm}>
                  <View style={styles.inputRow}>
                    <View style={styles.halfInputGroup}>
                      <Text style={styles.label}>Payment Amount</Text>
                      <AmountInput
                        value={paymentAmount}
                        onChangeText={setPaymentAmount}
                        placeholder="0.00"
                      />
                    </View>

                    <View style={styles.halfInputGroup}>
                      <DateInput
                        label="Payment Date"
                        value={paymentDate}
                        onChangeDate={setPaymentDate}
                      />
                    </View>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={styles.halfInputGroup}>
                      <Text style={styles.label}>Additional Fees</Text>
                      <AmountInput
                        value={additionalFees}
                        onChangeText={setAdditionalFees}
                        placeholder="0.00"
                      />
                      <Text style={styles.helpText}>Late fees, etc.</Text>
                    </View>

                    <View style={styles.halfInputGroup}>
                      <MonthYearInput
                        label="Applied Month"
                        value={appliedMonthYear}
                        onChangeValue={setAppliedMonthYear}
                        preselectedDate={nextDueDate}
                        showClearButton={false}
                      />
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Footer Button */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={isDeferMode ? handleDeferPayment : handleMakePayment}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {isDeferMode ? 'Save Deferred Status' : 'Save Payment'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '90%',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  cancelButton: {
    padding: 4,
  },
  cancelText: {
    fontSize: 16,
    color: '#3498db',
  },
  billName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#3498db',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  toggleTextActive: {
    color: 'white',
  },
  content: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  deferContent: {
    paddingVertical: 16,
  },
  paymentForm: {
    paddingVertical: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: 'white',
    minHeight: 120,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInputGroup: {
    flex: 1,
  },
  helpText: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  submitButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
