import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BillModel } from '@/models/BillModel';
import { useBillPayments } from '@/hooks/useBillPayments';
import { useBills } from '@/contexts/BillsContext';
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
  const [showUpdateBalanceForm, setShowUpdateBalanceForm] = React.useState(false);
  const [newBalance, setNewBalance] = React.useState('');
  const [newMinimumDue, setNewMinimumDue] = React.useState('');
  const [additionalFees, setAdditionalFees] = React.useState('');
  const [showUrgentNoteInput, setShowUrgentNoteInput] = React.useState(false);
  const [urgentNote, setUrgentNote] = React.useState('');
  const [localUrgentNote, setLocalUrgentNote] = React.useState<string | null>(null);
  
  // Sync local urgent note with bill prop
  React.useEffect(() => {
    setLocalUrgentNote(bill?.urgent_note || null);
  }, [bill?.urgent_note, bill?.id]);
  
  const { createBillStatement, updateBill, loadBills } = useBills();

  const handleClearUrgentNote = async () => {
    if (!bill?.id) return;
    try {
      await updateBill(bill.id, { urgent_note: null });
      setLocalUrgentNote(null);
      setShowUrgentNoteInput(false);
      setUrgentNote('');
      await loadBills();
      onSuccess();
    } catch (error) {
      console.error('Error clearing urgent note:', error);
    }
  };
  
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
          <BillInfoHeader 
            bill={bill} 
            lastPayment={lastPayment}
          />

          {/* Notes */}
          {bill.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Info</Text>
              <View style={styles.notesContainer}>
                <Text style={styles.notesText}>{bill.notes}</Text>
              </View>
            </View>
          )}

          {/* Urgent Note Card */}
          {localUrgentNote && (
            <View style={styles.section}>
              <View style={styles.urgentNoteCard}>
                <View style={styles.urgentNoteHeader}>
                  <View style={styles.urgentNoteTitle}>
                    <MaterialCommunityIcons 
                      name="alert-outline" 
                      size={20} 
                      color="#e67e22" 
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.urgentNoteDisplayText}>{localUrgentNote}</Text>
                  </View>
                  <TouchableOpacity onPress={handleClearUrgentNote}>
                    <MaterialCommunityIcons 
                      name="trash-can-outline" 
                      size={20} 
                      color="#e67e22" 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Add Urgent Note Button */}
          {!localUrgentNote && !showUrgentNoteInput && (
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.makePaymentButton, styles.urgentNoteButton]}
                onPress={() => setShowUrgentNoteInput(true)}
              >
                <MaterialCommunityIcons name="alert-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.makePaymentButtonText}>Add Urgent Note</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Urgent Note Input */}
          {showUrgentNoteInput && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add Urgent Note</Text>
              <TextInput
                style={styles.urgentNoteInput}
                value={urgentNote}
                onChangeText={setUrgentNote}
                placeholder="Enter urgent note..."
                placeholderTextColor="#95a5a6"
                autoFocus
                multiline
                numberOfLines={2}
                onSubmitEditing={async () => {
                  if (!bill?.id || !urgentNote.trim()) return;
                  try {
                    const noteText = urgentNote.trim();
                    await updateBill(bill.id, { urgent_note: noteText });
                    setLocalUrgentNote(noteText);
                    setShowUrgentNoteInput(false);
                    setUrgentNote('');
                    await loadBills();
                    onSuccess();
                  } catch (error) {
                    console.error('Error adding urgent note:', error);
                  }
                }}
                blurOnSubmit={false}
                returnKeyType="done"
              />
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowUrgentNoteInput(false);
                    setUrgentNote('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: '#e67e22' }]}
                  onPress={async () => {
                    if (!bill?.id || !urgentNote.trim()) return;
                    try {
                      const noteText = urgentNote.trim();
                      await updateBill(bill.id, { urgent_note: noteText });
                      setLocalUrgentNote(noteText);
                      setShowUrgentNoteInput(false);
                      setUrgentNote('');
                      await loadBills();
                      onSuccess();
                    } catch (error) {
                      console.error('Error adding urgent note:', error);
                    }
                  }}
                >
                  <Text style={styles.submitButtonText}>Save</Text>
                </TouchableOpacity>
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
                      { width: `${Math.min(100, ((bill.partial_payment || 0) / (bill.amount || 1)) * 100)}%` }
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
              additionalFees={additionalFees}
              scheduledPaymentId={scheduledPaymentId}
              loading={loading}
              buttonState={buttonState}
              nextDueDate={bill.next_due_date ? new Date(bill.next_due_date) : undefined}
              onPaymentAmountChange={setPaymentAmount}
              onPaymentDateChange={setPaymentDate}
              onAppliedMonthYearChange={setAppliedMonthYear}
              onAdditionalFeesChange={setAdditionalFees}
              onSubmit={() => handleAddPayment(onSuccess)}
              onCancel={() => setShowPaymentForm(false)}
            />
          )}

          {/* Update Balance Form */}
          {showUpdateBalanceForm && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Update Statement Balance</Text>
              
              <View style={styles.inputRow}>
                <View style={styles.halfInputGroup}>
                  <Text style={styles.label}>New Balance</Text>
                  <TextInput
                    style={styles.input}
                    value={newBalance}
                    onChangeText={setNewBalance}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                </View>

                <View style={styles.halfInputGroup}>
                  <Text style={styles.label}>Minimum Due</Text>
                  <TextInput
                    style={styles.input}
                    value={newMinimumDue}
                    onChangeText={setNewMinimumDue}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowUpdateBalanceForm(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: '#27ae60' }]}
                  onPress={async () => {
                    if (!bill?.id || !newBalance) return;
                    
                    try {
                      const { error } = await createBillStatement(
                        bill.id,
                        parseFloat(newBalance),
                        newMinimumDue ? parseFloat(newMinimumDue) : undefined
                      );
                      
                      if (error) throw error;
                      
                      setShowUpdateBalanceForm(false);
                      onSuccess();
                    } catch (error) {
                      console.error('Error updating balance:', error);
                    }
                  }}
                >
                  <Text style={styles.submitButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions */}
        {!showPaymentForm && !showUpdateBalanceForm && !showUrgentNoteInput && (
          <View style={styles.bottomActions}>
            <View style={styles.buttonRow}>
              {bill?.is_variable && (
                <TouchableOpacity
                  style={[styles.makePaymentButton, styles.updateBalanceButton, styles.halfButton]}
                  onPress={() => {
                    setNewBalance(bill.statement_balance?.toString() || '');
                    setNewMinimumDue(bill.statement_minimum_due?.toString() || '');
                    setShowUpdateBalanceForm(true);
                  }}
                >
                  <Text style={styles.makePaymentButtonText}>Update Balance</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.makePaymentButton, bill?.is_variable && styles.halfButton]}
                onPress={() => {
                  loadScheduledPayment();
                  // Pre-fill with minimum due for variable bills
                  if (bill?.is_variable && bill.statement_minimum_due) {
                    setPaymentAmount(bill.statement_minimum_due.toFixed(2));
                  } else if (bill?.is_variable && bill.updated_balance) {
                    setPaymentAmount(bill.updated_balance.toFixed(2));
                  }
                  setShowPaymentForm(true);
                }}
              >
                <Text style={styles.makePaymentButtonText}>Make a Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}
