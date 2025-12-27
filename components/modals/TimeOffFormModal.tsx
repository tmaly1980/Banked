import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateInput from '@/components/DateInput';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface TimeOffFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingTimeOff?: any;
}

export default function TimeOffFormModal({
  visible,
  onClose,
  onSuccess,
  editingTimeOff,
}: TimeOffFormModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('100');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingTimeOff) {
      setName(editingTimeOff.name || '');
      setDescription(editingTimeOff.description || '');
      setCapacity(editingTimeOff.capacity?.toString() || '100');
      setStartDate(editingTimeOff.start_date ? new Date(editingTimeOff.start_date) : null);
      setEndDate(editingTimeOff.end_date ? new Date(editingTimeOff.end_date) : null);
    } else {
      resetForm();
    }
  }, [editingTimeOff, visible]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setCapacity('100');
    setStartDate(null);
    setEndDate(null);
  };

  const handleSave = async () => {
    if (!user) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    if (!startDate || !endDate) {
      Alert.alert('Error', 'Please select start and end dates');
      return;
    }

    if (endDate < startDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    const capacityNum = parseInt(capacity);
    if (isNaN(capacityNum) || capacityNum < 0 || capacityNum > 100) {
      Alert.alert('Error', 'Capacity must be between 0 and 100');
      return;
    }

    setSaving(true);
    try {
      const timeOffData = {
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        capacity: capacityNum,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      };

      if (editingTimeOff) {
        // Update existing
        const { error } = await supabase
          .from('time_off')
          .update(timeOffData)
          .eq('id', editingTimeOff.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('time_off')
          .insert([timeOffData]);

        if (error) throw error;
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error saving time off:', error);
      Alert.alert('Error', 'Failed to save time off');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTimeOff) return;

    Alert.alert(
      'Delete Time Off',
      'Are you sure you want to delete this time off entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('time_off')
                .delete()
                .eq('id', editingTimeOff.id);

              if (error) throw error;

              onSuccess();
              onClose();
              resetForm();
            } catch (error) {
              console.error('Error deleting time off:', error);
              Alert.alert('Error', 'Failed to delete time off');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {editingTimeOff ? 'Edit Time Off' : 'Add Time Off'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#2c3e50" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form}>
            {/* Name and Capacity Row */}
            <View style={styles.rowGroup}>
              <View style={styles.inputGroupLeft}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Vacation, Holiday"
                  placeholderTextColor="#95a5a6"
                />
              </View>

              <View style={styles.inputGroupRight}>
                <Text style={styles.label}>Capacity % *</Text>
                <TextInput
                  style={styles.input}
                  value={capacity}
                  onChangeText={setCapacity}
                  placeholder="100"
                  placeholderTextColor="#95a5a6"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Start Date and End Date Row */}
            <View style={styles.rowGroup}>
              <View style={styles.dateInputLeft}>
                <DateInput
                  label="Start Date *"
                  value={startDate ? startDate.toISOString().split('T')[0] : ''}
                  onChange={(dateStr) => setStartDate(dateStr ? new Date(dateStr) : null)}
                  placeholder="MM/DD/YYYY"
                />
              </View>

              <View style={styles.dateInputRight}>
                <DateInput
                  label="End Date *"
                  value={endDate ? endDate.toISOString().split('T')[0] : ''}
                  onChange={(dateStr) => setEndDate(dateStr ? new Date(dateStr) : null)}
                  placeholder="MM/DD/YYYY"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional notes"
                placeholderTextColor="#95a5a6"
                multiline
                numberOfLines={3}
              />
              <Text style={styles.helperText}>
                Capacity: % of normal income reduction (100% = full time off, 0% = no reduction)
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {editingTimeOff && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={20} color="white" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.saveButton, editingTimeOff && styles.saveButtonSmall]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    padding: 4,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  rowGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  inputGroupLeft: {
    flex: 3,
  },
  inputGroupRight: {
    flex: 2,
  },
  dateInputLeft: {
    flex: 1,
  },
  dateInputRight: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    gap: 12,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#e74c3c',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonSmall: {
    flex: 1,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
