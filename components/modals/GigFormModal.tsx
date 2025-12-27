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
import { useBills } from '@/contexts/BillsContext';
import { GigWithDeposits } from '@/types';
import { format, parseISO, endOfWeek, startOfWeek } from 'date-fns';
import DateInput from '@/components/DateInput';
import { InlineAlert } from '@/components/InlineAlert';
import { useInlineAlert } from '@/hooks/useInlineAlert';

interface GigFormModalProps {
  visible: boolean;
  gig: GigWithDeposits | null;
  onClose: () => void;
  defaultStartDate?: string;
  defaultEndDate?: string;
}

export default function GigFormModal({ visible, gig, onClose, defaultStartDate, defaultEndDate }: GigFormModalProps) {
  const { createGig, updateGig } = useBills();
  const { alert, showError, showSuccess, hideAlert } = useInlineAlert();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalHours, setTotalHours] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && gig) {
      // Editing existing gig
      setName(gig.name);
      setDescription(gig.description || '');
      setEndDate(gig.due_date);
      setTotalHours(gig.est_hours_total?.toString() || '');
    } else if (visible) {
      // Adding new gig
      resetForm();
      // Pre-fill end date if provided
      if (defaultEndDate) setEndDate(defaultEndDate);
    }
  }, [visible, gig, defaultStartDate, defaultEndDate]);

  // Auto-hide alert when form changes
  useEffect(() => {
    if (alert.visible) {
      hideAlert();
    }
  }, [name, description, endDate, totalHours]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setEndDate('');
    setTotalHours('');
    hideAlert();
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      showError('Please enter a gig name');
      return;
    }

    if (!endDate) {
      showError('Please select a due date');
      return;
    }

    const hours = totalHours.trim() ? parseFloat(totalHours) : undefined;
    if (hours !== undefined && (isNaN(hours) || hours < 0)) {
      showError('Please enter valid total hours');
      return;
    }

    setSaving(true);

    // Use end date as the due date
    const gigData = {
      name: name.trim(),
      description: description.trim() || undefined,
      due_date: endDate,
      est_hours_total: hours || 0,
    };

    try {
      if (gig) {
        // Update existing gig
        const { error } = await updateGig(gig.id, gigData);
        if (error) throw error;
        showSuccess('Gig updated successfully');
      } else {
        // Create new gig
        const { error } = await createGig(gigData);
        if (error) throw error;
        showSuccess('Gig created successfully');
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('[GigFormModal] Error saving gig:', error);
      showError(error instanceof Error ? error.message : 'Failed to save gig');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} disabled={saving}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {gig ? 'Edit Gig' : 'Add Gig'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.saveButton, saving && styles.disabledButton]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Alert */}
          {alert.visible && (
            <InlineAlert
              type={alert.type}
              message={alert.message}
              visible={alert.visible}
              onDismiss={hideAlert}
            />
          )}

          {/* Form */}
          <ScrollView style={styles.formContainer}>
            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Web Development Project"
                placeholderTextColor="#95a5a6"
                autoCapitalize="words"
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional description"
                placeholderTextColor="#95a5a6"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Total Hours and Due Date Row */}
            <View style={styles.rowContainer}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Total Hours</Text>
                <TextInput
                  style={styles.input}
                  value={totalHours}
                  onChangeText={setTotalHours}
                  placeholder="e.g., 40"
                  placeholderTextColor="#95a5a6"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Due Date *</Text>
                <DateInput
                  label=""
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="MM/DD/YYYY"
                  required={true}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  cancelButton: {
    color: '#007AFF',
    fontSize: 16,
    minWidth: 60,
  },
  saveButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },
  disabledButton: {
    opacity: 0.6,
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: 'white',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  dollarSign: {
    fontSize: 16,
    color: '#2c3e50',
    paddingLeft: 12,
    fontWeight: '500',
  },
  amountInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  helperText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
