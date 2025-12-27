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

type PaymentMode = 'pay' | 'partial' | 'defer';

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
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('pay');
  const [loading, setLoading] = useState(false);
  
  // Payment form fields
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [appliedMonthYear, setAppliedMonthYear] = useState('');
  const [additionalFees, setAdditionalFees] = useState('');
  
  // Defer form fields
  const [deferMonthYear, setDeferMonthYear] = useState('');
  const [decideByDate, setDecideByDate] = useState('');
  const [lossDate, setLossDate] = useState('');
  const [deferReason, setDeferReason] = useState('');

  useEffect(() => {
    if (visible && billId) {
      // Reset form
      setPaymentMode(isDeferred ? 'defer' : 'pay');
      setPaymentAmount(billAmount.toString());
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      setAdditionalFees('');
      setDeferReason('');
      setDecideByDate('');
      setLossDate('');
      
      // Set default applied month and defer month to current month
      const now = new Date();
      const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setAppliedMonthYear(currentMonthYear);
      setDeferMonthYear(currentMonthYear);
    }
  }, [visible, billId, billAmount, isDeferred]);

  const handleMakePayment = async () => {
    if (!billId || !user) return;
    
    setLoading(true);
    try {
      const amount = parseFloat(paymentAmount) + parseFloat(additionalFees || '0');
      
      const { error: paymentError } = await supabase.from('bill_payments').insert({
        bill_id: billId,
        user_id: user.id,
        amount,
        payment_date: paymentDate,
        applied_month_year: appliedMonthYear,
        is_paid: true,
      });

      if (paymentError) throw paymentError;

      // Note: Don't auto-reset deferrals - user must manually remove via swipe

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error making payment:', error);
      alert('Failed to make payment');
    } finally {
      setLoading(false);
    }
  };

  const handlePartialWithDefer = async () => {
    if (!billId || !user) return;
    
    setLoading(true);
    try {
      const amount = parseFloat(paymentAmount) + parseFloat(additionalFees || '0');
      
      // Make the partial payment
      const { error: paymentError } = await supabase.from('bill_payments').insert({
        bill_id: billId,
        user_id: user.id,
        amount,
        payment_date: paymentDate,
        applied_month_year: appliedMonthYear,
        is_paid: true,
      });

      if (paymentError) throw paymentError;

      // Create the deferment for remaining balance
      const { error: deferError } = await supabase
        .from('bill_deferments')
        .insert({
          bill_id: billId,
          user_id: user.id,
          month_year: deferMonthYear,
          decide_by_date: decideByDate,
          loss_date: lossDate || null,
          reason: deferReason || null,
          is_active: true,
        });

      if (deferError) throw deferError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error making partial payment with defer:', error);
      alert('Failed to process payment and deferral');
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
          decide_by_date: decideByDate,
          loss_date: lossDate || null,
          reason: deferReason || null,
          is_active: true,
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
      // Set is_active to false for all deferments for this bill
      const { error } = await supabase
        .from('bill_deferments')
        .update({ is_active: false })
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

  const handleSubmit = () => {
    if (paymentMode === 'pay') {
      handleMakePayment();
    } else if (paymentMode === 'partial') {
      handlePartialWithDefer();
    } else {
      handleDeferPayment();
    }
  };

  const isFormValid = () => {
    if (paymentMode === 'pay') {
      return paymentAmount && paymentDate && appliedMonthYear;
    } else if (paymentMode === 'partial') {
      return paymentAmount && paymentDate && appliedMonthYear && deferMonthYear && decideByDate;
    } else {
      return deferMonthYear && decideByDate;
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

            {/* Tab Buttons */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, paymentMode === 'pay' && styles.tabButtonActive]}
                onPress={() => setPaymentMode('pay')}
              >
                <Text style={[styles.tabText, paymentMode === 'pay' && styles.tabTextActive]}>
                  Pay
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, paymentMode === 'partial' && styles.tabButtonActive]}
                onPress={() => setPaymentMode('partial')}
              >
                <Text style={[styles.tabText, paymentMode === 'partial' && styles.tabTextActive]}>
                  Partial Pay+Defer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, paymentMode === 'defer' && styles.tabButtonActive]}
                onPress={() => setPaymentMode('defer')}
              >
                <Text style={[styles.tabText, paymentMode === 'defer' && styles.tabTextActive]}>
                  Defer
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {paymentMode === 'defer' ? (
                // Defer Only Mode
                <View style={styles.deferContent}>
                  <View style={styles.inputRow}>
                    <View style={styles.halfInputGroup}>
                      <MonthYearInput
                        label="Defer For Month"
                        value={deferMonthYear}
                        onChangeValue={setDeferMonthYear}
                        preselectedDate={nextDueDate}
                        showClearButton={false}
                      />
                    </View>

                    <View style={styles.halfInputGroup}>
                      <DateInput
                        label="Decide By"
                        value={decideByDate}
                        onChange={setDecideByDate}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <DateInput
                      label="Loss Date (Optional)"
                      value={lossDate}
                      onChange={setLossDate}
                    />
                    <Text style={styles.helpText}>
                      Date when utility or service will be shut off
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
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              ) : (
                // Payment Mode (Pay or Partial Pay+Defer)
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
                        onChange={setPaymentDate}
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

                  {/* Show defer fields only in Partial mode */}
                  {paymentMode === 'partial' && (
                    <>
                      <View style={styles.divider} />
                      <Text style={styles.sectionTitle}>Defer Remaining Balance</Text>
                      
                      <View style={styles.inputRow}>
                        <View style={styles.halfInputGroup}>
                          <MonthYearInput
                            label="Defer For Month"
                            value={deferMonthYear}
                            onChangeValue={setDeferMonthYear}
                            preselectedDate={nextDueDate}
                            showClearButton={false}
                          />
                        </View>

                        <View style={styles.halfInputGroup}>
                          <DateInput
                            label="Decide By"
                            value={decideByDate}
                            onChange={setDecideByDate}
                          />
                        </View>
                      </View>

                      <View style={styles.inputGroup}>
                        <DateInput
                          label="Loss Date (Optional)"
                          value={lossDate}
                          onChange={setLossDate}
                        />
                        <Text style={styles.helpText}>
                          Date when utility or service will be shut off
                        </Text>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Reason (Optional)</Text>
                        <TextInput
                          style={styles.textArea}
                          value={deferReason}
                          onChangeText={setDeferReason}
                          placeholder="Why are you deferring the remaining balance?"
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                        />
                      </View>
                    </>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Footer Button */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!isFormValid() || loading) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={!isFormValid() || loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {paymentMode === 'defer' 
                      ? 'Save Deferred Status' 
                      : paymentMode === 'partial'
                      ? 'Save Payment & Defer'
                      : 'Save Payment'}
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
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#3498db',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  tabTextActive: {
    color: 'white',
  },
  content: {
    maxHeight: 500,
    paddingHorizontal: 20,
  },
  deferContent: {
    paddingVertical: 16,
  },
  paymentForm: {
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 20,
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
    minHeight: 80,
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
  divider: {
    height: 1,
    backgroundColor: '#ecf0f1',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
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
