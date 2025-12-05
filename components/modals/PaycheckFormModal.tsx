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
import { useRecurringPaychecks } from '@/hooks/useRecurringPaychecks';
import { Paycheck } from '@/types';
import { dateToTimestamp } from '@/lib/dateUtils';
import { InlineAlert } from '@/components/InlineAlert';
import { useInlineAlert } from '@/hooks/useInlineAlert';
import PillPicker from '@/components/PillPicker';
import AddOneTimePaycheckForm from '@/components/forms/AddOneTimePaycheckForm';
import AddRecurringPaycheckForm from '@/components/forms/AddRecurringPaycheckForm';

type PaycheckMode = 'once' | 'recurring';

const PAYCHECK_MODES = [
  { label: 'Once', value: 'once' as PaycheckMode },
  { label: 'Recurring', value: 'recurring' as PaycheckMode },
];

interface PaycheckFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingPaycheck?: Paycheck | null;
  editingRecurringId?: string | null;
}

export default function PaycheckFormModal({
  visible,
  onClose,
  onSuccess,
  editingPaycheck,
  editingRecurringId,
}: PaycheckFormModalProps) {
  const { alert, showError, showSuccess, hideAlert } = useInlineAlert();
  const { createPaycheck, updatePaycheck, deletePaycheck } = useBills();
  const { createRecurringPaycheck, updateRecurringPaycheck, recurringPaychecks, deleteRecurringPaycheck } = useRecurringPaychecks();
  const [mode, setMode] = useState<PaycheckMode>('once');
  const [loading, setLoading] = useState(false);
  
  const oneTimeFormRef = useRef<any>(null);
  const recurringFormRef = useRef<any>(null);

  // Get the recurring paycheck being edited
  const editingRecurring = editingRecurringId 
    ? recurringPaychecks.find(rp => rp.id === editingRecurringId) 
    : null;

  console.log('[PaycheckFormModal] State:', {
    visible,
    editingRecurringId,
    editingRecurring: editingRecurring?.id,
    recurringPaychecksCount: recurringPaychecks.length,
    allRecurringIds: recurringPaychecks.map(rp => rp.id),
  });

  // Reset mode when modal opens/closes
  useEffect(() => {
    if (visible) {
      // If editing recurring, set to recurring mode, otherwise use once
      const initialMode = editingRecurringId ? 'recurring' : 'once';
      console.log('[PaycheckFormModal] Setting initial mode:', initialMode, {
        editingRecurringId,
        editingPaycheck: editingPaycheck?.id,
        editingRecurring: editingRecurring?.id,
      });
      setMode(initialMode);
    }
  }, [visible, editingPaycheck, editingRecurringId]);

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
        
        const paycheckData = {
          name: formData.name.trim() || undefined,
          amount: amountNum,
          date: formData.date ? dateToTimestamp(formData.date) : null,
          notes: formData.notes.trim() || undefined,
        };

        console.log('[PaycheckFormModal] Submitting one-time paycheck:', {
          editingPaycheck: editingPaycheck?.id,
          paycheckData,
        });

        if (editingPaycheck) {
          const { error } = await updatePaycheck(editingPaycheck.id, paycheckData);
          console.log('[PaycheckFormModal] Update result:', { error });
          if (error) throw error;
        } else {
          const { error } = await createPaycheck(paycheckData);
          console.log('[PaycheckFormModal] Create result:', { error });
          if (error) throw error;
        }

        showSuccess(`Paycheck ${editingPaycheck ? 'updated' : 'added'} successfully`);
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

        console.log('[PaycheckFormModal] Submitting recurring paycheck:', {
          editingRecurringId,
          recurringData,
        });

        if (editingRecurringId) {
          const { error } = await updateRecurringPaycheck(editingRecurringId, recurringData);
          console.log('[PaycheckFormModal] Recurring update result:', { error });
          if (error) throw error;
          showSuccess('Recurring paycheck updated successfully');
        } else {
          const { error } = await createRecurringPaycheck(recurringData);
          console.log('[PaycheckFormModal] Recurring create result:', { error });
          if (error) throw error;
          showSuccess('Recurring paycheck created successfully');
        }
      }
      
      handleClose();
      onSuccess();
    } catch (error) {
      console.error('[PaycheckFormModal] Error:', error);
      showError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    console.log('[PaycheckFormModal] Delete clicked:', { editingRecurringId, editingRecurring: editingRecurring?.id, editingPaycheck: editingPaycheck?.id });
    const formatAmount = (amount: number) => `$${amount.toFixed(2)}`;
    
    if (editingRecurringId) {
      // Delete recurring paycheck - use editingRecurring if available, otherwise just confirm with ID
      const message = editingRecurring
        ? `Are you sure you want to delete this recurring paycheck of ${formatAmount(editingRecurring.amount)}? This will remove all future instances.`
        : 'Are you sure you want to delete this recurring paycheck? This will remove all future instances.';
        
      Alert.alert(
        'Delete Recurring Paycheck',
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
                console.log('[PaycheckFormModal] Deleting recurring paycheck:', editingRecurringId);
                const { error } = await deleteRecurringPaycheck(editingRecurringId);
                if (error) throw error;

                showSuccess('Recurring paycheck deleted successfully');

                handleClose();
                onSuccess();
              } catch (error) {
                console.error('[PaycheckFormModal] Delete recurring error:', error);
                showError(error instanceof Error ? error.message : 'An error occurred');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } else if (editingPaycheck) {
      Alert.alert(
        'Delete Paycheck',
        `Are you sure you want to delete this paycheck of ${formatAmount(editingPaycheck.amount)}?`,
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
                const { error } = await deletePaycheck(editingPaycheck.id);
                if (error) throw error;

                showSuccess('Paycheck deleted successfully');

                handleClose();
                onSuccess();
              } catch (error) {
                console.error('[PaycheckFormModal] Delete error:', error);
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
            {editingPaycheck || editingRecurringId ? 'Edit' : 'Add'} {editingRecurringId ? 'Recurring ' : ''}Paycheck
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

          {!editingPaycheck && (
            <View style={styles.modePickerGroup}>
              <PillPicker
                options={PAYCHECK_MODES}
                selectedValue={mode}
                onSelect={(value) => setMode(value as PaycheckMode)}
              />
            </View>
          )}

          {mode === 'once' ? (
            <AddOneTimePaycheckForm
              ref={oneTimeFormRef}
              editingPaycheck={editingPaycheck}
              editingRecurring={editingRecurring}
              onFormChange={() => hideAlert()}
            />
          ) : (
            <AddRecurringPaycheckForm
              ref={recurringFormRef}
              editingRecurring={editingRecurring}
              onFormChange={() => hideAlert()}
            />
          )}
        </ScrollView>

        {(editingPaycheck || editingRecurringId) && (
          <View style={styles.deleteButtonContainer}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={loading}
            >
              <Text style={styles.deleteButtonText}>
                Delete {editingRecurringId ? 'Recurring ' : ''}Paycheck
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
