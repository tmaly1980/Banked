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
import { GigWithPaychecks } from '@/types';
import { format, parseISO, endOfWeek, startOfWeek } from 'date-fns';
import DateInput from '@/components/DateInput';
import { InlineAlert } from '@/components/InlineAlert';
import { useInlineAlert } from '@/hooks/useInlineAlert';

interface GigFormModalProps {
  visible: boolean;
  gig: GigWithPaychecks | null;
  onClose: () => void;
}

export default function GigFormModal({ visible, gig, onClose }: GigFormModalProps) {
  const { createGig, updateGig } = useBills();
  const { alert, showError, showSuccess, hideAlert } = useInlineAlert();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalHours, setTotalHours] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && gig) {
      // Editing existing gig
      setName(gig.name);
      setDescription(gig.description || '');
      setStartDate(gig.start_date);
      setEndDate(gig.end_date);
      setTotalHours(gig.total_hours?.toString() || '');
      setTotalAmount(gig.total_amount.toString());
    } else if (visible) {
      // Adding new gig
      resetForm();
    }
  }, [visible, gig]);

  // Auto-hide alert when form changes
  useEffect(() => {
    if (alert.visible) {
      hideAlert();
    }
  }, [name, description, startDate, endDate, totalHours, totalAmount]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setTotalHours('');
    setTotalAmount('');
    hideAlert();
  };

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    // If no end date set, default to end of week
    if (date && !endDate) {
      const weekEnd = endOfWeek(parseISO(date), { weekStartsOn: 0 });
      setEndDate(format(weekEnd, 'yyyy-MM-dd'));
    }
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      showError('Please enter a gig name');
      return;
    }

    if (!startDate) {
      showError('Please select a start date');
      return;
    }

    if (!endDate) {
      showError('Please select an end date');
      return;
    }

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    if (end < start) {
      showError('End date must be after start date');
      return;
    }

    if (!totalAmount.trim() || isNaN(parseFloat(totalAmount)) || parseFloat(totalAmount) <= 0) {
      showError('Please enter a valid total amount');
      return;
    }

    const hours = totalHours.trim() ? parseFloat(totalHours) : undefined;
    if (hours !== undefined && (isNaN(hours) || hours < 0)) {
      showError('Please enter valid total hours');
      return;
    }

    setSaving(true);

    const gigData = {
      name: name.trim(),
      description: description.trim() || undefined,
      start_date: startDate,
      end_date: endDate,
      total_hours: hours,
      total_amount: parseFloat(totalAmount),
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
      showError(error instanceof Error ? error.message : 'Failed to save gig');
    } finally {
      setSaving(false);
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {gig ? 'Edit Gig' : 'Add Gig'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#2c3e50" />
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

            {/* Start Date and End Date Row */}
            <View style={styles.rowContainer}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Start Date *</Text>
                <DateInput
                  label=""
                  value={startDate}
                  onChangeDate={handleStartDateChange}
                  placeholder="Start date"
                  required={true}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>End Date *</Text>
                <DateInput
                  label=""
                  value={endDate}
                  onChangeDate={setEndDate}
                  placeholder="End date"
                  required={true}
                />
                {startDate && !gig && (
                  <Text style={styles.helperText}>
                    Defaults to end of week
                  </Text>
                )}
              </View>
            </View>

            {/* Total Hours and Total Amount Row */}
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
                <Text style={styles.label}>Total Amount *</Text>
                <View style={styles.amountInputWrapper}>
                  <Text style={styles.dollarSign}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={totalAmount}
                    onChangeText={setTotalAmount}
                    placeholder="0.00"
                    placeholderTextColor="#95a5a6"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.button, styles.cancelButton]}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={[styles.button, styles.saveButton]}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : gig ? 'Update' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    padding: 4,
  },
  formContainer: {
    padding: 16,
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
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  saveButton: {
    backgroundColor: '#3498db',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
