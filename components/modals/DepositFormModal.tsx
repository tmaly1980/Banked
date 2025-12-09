import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useBills } from '@/contexts/BillsContext';
import { useRecurringDeposits } from '@/hooks/useRecurringDeposits';
import { Deposit } from '@/types';
import { dateToTimestamp } from '@/lib/dateUtils';
import { InlineAlert } from '@/components/InlineAlert';
import { useInlineAlert } from '@/hooks/useInlineAlert';
import PillPicker from '@/components/PillPicker';
import AddOneTimeDepositForm from '@/components/forms/AddOneTimeDepositForm';
import AddRecurringDepositForm from '@/components/forms/AddRecurringDepositForm';

type DepositMode = 'once' | 'recurring';

const DEPOSIT_MODES = [
  { label: 'Once', value: 'once' as DepositMode },
  { label: 'Recurring', value: 'recurring' as DepositMode },
];

interface DepositFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingDeposit?: Deposit | null;
  editingRecurringId?: string | null;
}

export default function DepositFormModal({
  visible,
  onClose,
  onSuccess,
  editingDeposit,
  editingRecurringId,
}: DepositFormModalProps) {
  const { alert, showError, showSuccess, hideAlert } = useInlineAlert();
  const { createDeposit, updateDeposit, deleteDeposit } = useBills();
  const { createRecurringDeposit, updateRecurringDeposit, recurringDeposits, deleteRecurringDeposit } = useRecurringDeposits();
  const [mode, setMode] = useState<DepositMode>('once');
  const [loading, setLoading] = useState(false);
  
  const oneTimeFormRef = useRef<any>(null);
  const recurringFormRef = useRef<any>(null);

  // Get the recurring deposit being edited
  const editingRecurring = editingRecurringId 
    ? recurringDeposits.find(rd => rd.id === editingRecurringId) 
    : null;

  // console.log('[DepositFormModal] State:', {
  //   visible,
  //   editingRecurringId,
  //   editingRecurring: editingRecurring?.id,
  //   recurringDepositsCount: recurringDeposits.length,
  //   allRecurringIds: recurringDeposits.map(rd => rd.id),
  // });

  // Reset mode when modal opens/closes
  useEffect(() => {
    if (visible) {
      // If editing recurring, set to recurring mode, otherwise use once
      const initialMode = editingRecurringId ? 'recurring' : 'once';
      console.log('[DepositFormModal] Setting initial mode:', initialMode, {
        editingRecurringId,
        editingDeposit: editingDeposit?.id,
        editingRecurring: editingRecurring?.id,
      });
      setMode(initialMode);
    }
  }, [visible, editingDeposit, editingRecurringId]);

  // Auto-hide alert when mode changes
  useEffect(() => {
    if (alert.visible) {
      hideAlert();
    }
  }, [mode]);

  const handleClose = () => {
    oneTimeFormRef.current?.resetForm();
    recurringFormRef.current?.resetForm();
    setMode('once');
    onClose();
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      if (mode === 'once') {
        // Validate one-time form
        if (!oneTimeFormRef.current?.validateForm()) {
          showError('Please enter a valid amount');
          setLoading(false);
          return;
        }

        const formData = oneTimeFormRef.current.getFormData();
        const amountNum = parseFloat(formData.amount);
        
        const depositData = {
          name: formData.name.trim() || undefined,
          amount: amountNum,
          date: formData.date ? dateToTimestamp(formData.date) : null,
          notes: formData.notes.trim() || undefined,
        };

        console.log('[DepositFormModal] Submitting one-time deposit:', {
          editingDeposit: editingDeposit?.id,
          depositData,
        });

        if (editingDeposit) {
          const { error } = await updateDeposit(editingDeposit.id, depositData);
          console.log('[DepositFormModal] Update result:', { error });
          if (error) throw error;
        } else {
          const { error } = await createDeposit(depositData);
          console.log('[DepositFormModal] Create result:', { error });
          if (error) throw error;
        }

        showSuccess(`Deposit ${editingDeposit ? 'updated' : 'added'} successfully`);
      } else {
        // Validate recurring form
        if (!recurringFormRef.current?.validateForm()) {
          showError('Please fill in all required fields');
          setLoading(false);
          return;
        }

        const formData = recurringFormRef.current.getFormData();
        const amountNum = parseFloat(formData.amount);
        const intervalNum = parseInt(formData.interval);

        const recurringData = {
          amount: amountNum,
          start_date: formData.startDate,
          end_date: formData.endDate || undefined,
          recurrence_unit: formData.recurrenceUnit,
          interval: intervalNum,
          day_of_week: formData.dayOfWeek || undefined,
          day_of_month: formData.dayOfMonth ? parseInt(formData.dayOfMonth) : undefined,
          last_day_of_month: formData.lastDayOfMonth,
          last_business_day_of_month: formData.lastBusinessDayOfMonth,
        };

        console.log('[DepositFormModal] Submitting recurring deposit:', {
          editingRecurringId,
          recurringData,
        });

        if (editingRecurringId) {
          const { error } = await updateRecurringDeposit(editingRecurringId, recurringData);
          console.log('[DepositFormModal] Recurring update result:', { error });
          if (error) throw error;
          showSuccess('Recurring deposit updated successfully');
        } else {
          const { error } = await createRecurringDeposit(recurringData);
          console.log('[DepositFormModal] Recurring create result:', { error });
          if (error) throw error;
          showSuccess('Recurring deposit created successfully');
        }
      }
      
      handleClose();
      onSuccess();
    } catch (error) {
      console.error('[DepositFormModal] Error:', error);
      showError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    console.log('[DepositFormModal] Delete clicked:', { editingRecurringId, editingRecurring: editingRecurring?.id, editingDeposit: editingDeposit?.id });
    const formatAmount = (amount: number) => `$${amount.toFixed(2)}`;
    
    if (editingRecurringId) {
      // Delete recurring deposit - use editingRecurring if available, otherwise just confirm with ID
      const message = editingRecurring
        ? `Are you sure you want to delete this recurring deposit of ${formatAmount(editingRecurring.amount)}? This will remove all future instances.`
        : 'Are you sure you want to delete this recurring deposit? This will remove all future instances.';
        
      Alert.alert(
        'Delete Recurring Deposit',
        message,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              try {
                console.log('[DepositFormModal] Deleting recurring deposit:', editingRecurringId);
                const { error } = await deleteRecurringDeposit(editingRecurringId);
                if (error) throw error;

                showSuccess('Recurring deposit deleted successfully');

                handleClose();
                onSuccess();
              } catch (error) {
                console.error('[DepositFormModal] Delete recurring error:', error);
                showError(error instanceof Error ? error.message : 'An error occurred');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } else if (editingDeposit) {
      Alert.alert(
        'Delete Deposit',
        `Are you sure you want to delete this deposit of ${formatAmount(editingDeposit.amount)}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              try {
                const { error } = await deleteDeposit(editingDeposit.id);
                if (error) throw error;

                showSuccess('Deposit deleted successfully');

                handleClose();
                onSuccess();
              } catch (error) {
                console.error('[DepositFormModal] Delete error:', error);
                showError(error instanceof Error ? error.message : 'An error occurred');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    }
  };

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
          <Text style={styles.title}>
            {editingDeposit || editingRecurringId ? 'Edit' : 'Add'} {editingRecurringId ? 'Recurring ' : ''}Deposit
          </Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            <Text style={[styles.saveButton, loading && styles.disabledButton]}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <InlineAlert
            type={alert.type}
            message={alert.message}
            visible={alert.visible}
            onDismiss={hideAlert}
          />

          {!editingDeposit && (
            <View style={styles.modePickerGroup}>
              <PillPicker
                options={DEPOSIT_MODES}
                selectedValue={mode}
                onSelect={(value) => setMode(value as DepositMode)}
              />
            </View>
          )}

          {mode === 'once' ? (
            <AddOneTimeDepositForm
              ref={oneTimeFormRef}
              editingDeposit={editingDeposit}
              editingRecurring={editingRecurring}
              onFormChange={() => hideAlert()}
            />
          ) : (
            <AddRecurringDepositForm
              ref={recurringFormRef}
              editingRecurring={editingRecurring}
              onFormChange={() => hideAlert()}
            />
          )}
        </ScrollView>

        {(editingDeposit || editingRecurringId) && (
          <View style={styles.deleteButtonContainer}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={loading}
            >
              <Text style={styles.deleteButtonText}>
                Delete {editingRecurringId ? 'Recurring ' : ''}Deposit
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
  },
  formContent: {
    padding: 20,
    paddingBottom: 40,
  },
  modePickerGroup: {
    marginBottom: 24,
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
    height: 100,
    paddingTop: 12,
  },
  deleteButtonContainer: {
    padding: 20,
    paddingTop: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
