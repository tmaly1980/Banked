import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { BillModel } from '@/models/BillModel';
import { useBillPayments } from '@/hooks/useBillPayments';
import { separatePaymentsBySchedule } from '@/utils/paymentHelpers';
import { styles } from '@/styles/billDetailsStyles';
import BillInfoHeader from '@/components/BillDetailsModal/BillInfoHeader';
import PaymentListItem from '@/components/BillDetailsModal/PaymentListItem';
import PaymentForm from '@/components/BillDetailsModal/PaymentForm';

interface BillDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onEdit?: () => void;
  bill: BillModel | null;
}

export default function BillDetailsModal({
  visible,
  onClose,
  onSuccess,
  onEdit,
  bill,
}: BillDetailsModalProps) {
  const {
    payments,
    paymentAmount,
    paymentDate,
    appliedMonthYear,
    scheduledPaymentId,
    loading,
    showPaymentForm,
    setPaymentAmount,
    setPaymentDate,
    setAppliedMonthYear,
    setShowPaymentForm,
    loadScheduledPayment,
    handleAddPayment,
    handleDeletePayment,
    handleMarkAsPaid,
    getPaymentButtonState,
  } = useBillPayments(bill, visible);

  if (!bill) return null;

  const { scheduledPayments, paymentHistory } = separatePaymentsBySchedule(payments);
  const lastPayment = paymentHistory.length > 0 ? paymentHistory[0] : null;
  const buttonState = getPaymentButtonState();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Bill Details</Text>
          {onEdit && (
            <TouchableOpacity onPress={onEdit}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          )}
          {!onEdit && <View style={{ width: 50 }} />}
        </View>

        <ScrollView style={styles.content}>
          {/* Bill Info */}
          <BillInfoHeader bill={bill} lastPayment={lastPayment} />

          {/* Notes */}
          {bill.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <View style={styles.notesContainer}>
                <Text style={styles.notesText}>{bill.notes}</Text>
              </View>
            </View>
          )}

          {/* Scheduled Payments */}
          {scheduledPayments.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Scheduled Payments</Text>
              {scheduledPayments.map((payment) => (
                <PaymentListItem
                  key={payment.id}
                  payment={payment}
                  isScheduled={true}
                  onDelete={(id) => handleDeletePayment(id, onSuccess)}
                  onMarkAsPaid={(id) => handleMarkAsPaid(id, onSuccess)}
                />
              ))}
            </View>
          )}

          {/* Current Period Progress */}
          {bill.partial_payment !== undefined && bill.partial_payment > 0 && 
           bill.remaining_amount !== undefined && bill.remaining_amount > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Period Progress</Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(100, ((bill.partial_payment || 0) / bill.amount) * 100)}%` }
                    ]}
                  />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressValue}>${(bill.partial_payment || 0).toFixed(2)}</Text>
                  <Text style={styles.progressValueRemaining}>-${(bill.remaining_amount || 0).toFixed(2)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Payment History */}
          {paymentHistory.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment History</Text>
              {paymentHistory.map((payment) => (
                <PaymentListItem
                  key={payment.id}
                  payment={payment}
                  isScheduled={false}
                  onDelete={(id) => handleDeletePayment(id, onSuccess)}
                  onMarkAsPaid={(id) => handleMarkAsPaid(id, onSuccess)}
                />
              ))}
            </View>
          )}

          {/* Payment Form */}
          {showPaymentForm && (
            <PaymentForm
              paymentAmount={paymentAmount}
              paymentDate={paymentDate}
              appliedMonthYear={appliedMonthYear}
              scheduledPaymentId={scheduledPaymentId}
              loading={loading}
              buttonState={buttonState}
              nextDueDate={bill.next_due_date ? new Date(bill.next_due_date) : undefined}
              onPaymentAmountChange={setPaymentAmount}
              onPaymentDateChange={setPaymentDate}
              onAppliedMonthYearChange={setAppliedMonthYear}
              onSubmit={() => handleAddPayment(onSuccess)}
              onCancel={() => setShowPaymentForm(false)}
            />
          )}
        </ScrollView>

        {/* Bottom Actions */}
        {!showPaymentForm && (
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={styles.makePaymentButton}
              onPress={() => {
                loadScheduledPayment();
                setShowPaymentForm(true);
              }}
            >
              <Text style={styles.makePaymentButtonText}>Make a Payment</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}
