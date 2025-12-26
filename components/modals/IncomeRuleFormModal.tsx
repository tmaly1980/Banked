import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import DateInput from '@/components/DateInput';
import DayOfMonthInput from '@/components/DayOfMonthInput';

interface IncomeRule {
  id: string;
  income_source_id: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  days_of_week: number[] | null;
  start_date: string;
  end_date: string | null;
}

interface IncomeRuleFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  incomeRule?: IncomeRule | null;
}

export default function IncomeRuleFormModal({
  visible,
  onClose,
  onSuccess,
  incomeRule,
}: IncomeRuleFormModalProps) {
  const { user } = useAuth();
  const [sourceName, setSourceName] = useState('');
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [matchingSources, setMatchingSources] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const dayLabels = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];

  useEffect(() => {
    if (visible && incomeRule) {
      loadRuleData();
    } else if (visible) {
      resetForm();
    }
  }, [visible, incomeRule]);

  useEffect(() => {
    if (sourceName.length >= 2) {
      searchIncomeSources(sourceName);
    } else {
      setMatchingSources([]);
    }
  }, [sourceName]);

  const loadRuleData = async () => {
    if (!incomeRule) return;

    try {
      const { data: source } = await supabase
        .from('income_sources')
        .select('id, name')
        .eq('id', incomeRule.income_source_id)
        .single();

      if (source) {
        setSourceName(source.name);
        setSourceId(source.id);
      }

      setAmount(incomeRule.amount.toString());
      setFrequency(incomeRule.frequency);
      if (incomeRule.frequency === 'monthly' && incomeRule.days_of_week && incomeRule.days_of_week.length > 0) {
        setDayOfMonth(incomeRule.days_of_week[0]);
      } else {
        setSelectedDays(incomeRule.days_of_week || []);
      }
      setStartDate(incomeRule.start_date);
      setEndDate(incomeRule.end_date || '');
    } catch (error) {
      console.error('Error loading rule data:', error);
    }
  };

  const resetForm = () => {
    setSourceName('');
    setSourceId(null);
    setMatchingSources([]);
    setAmount('');
    setFrequency('daily');
    setSelectedDays([]);
    setDayOfMonth(undefined);
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setEndDate('');
  };

  const searchIncomeSources = async (query: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('income_sources')
        .select('id, name')
        .eq('user_id', user.id)
        .ilike('name', `%${query}%`)
        .limit(5);

      if (error) throw error;
      setMatchingSources(data || []);
    } catch (error) {
      console.error('Error searching income sources:', error);
    }
  };

  const selectSource = (source: any) => {
    setSourceName(source.name);
    setSourceId(source.id);
    setMatchingSources([]);
  };

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const handleSave = async () => {
    if (!user || !sourceName || !amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (frequency === 'weekly' && selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one day for weekly frequency');
      return;
    }

    if (frequency === 'monthly' && !dayOfMonth) {
      Alert.alert('Error', 'Please select a day of month');
      return;
    }

    setLoading(true);
    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      // Get or create income source
      let finalSourceId = sourceId;
      if (!finalSourceId) {
        const { data: newSource, error: sourceError } = await supabase
          .from('income_sources')
          .insert({ user_id: user.id, name: sourceName })
          .select()
          .single();

        if (sourceError) throw sourceError;
        finalSourceId = newSource.id;
      }

      const ruleData = {
        user_id: user.id,
        income_source_id: finalSourceId,
        amount: amountNum,
        frequency,
        days_of_week: frequency === 'daily' || frequency === 'weekly' ? (selectedDays.length > 0 ? selectedDays : null) : frequency === 'monthly' && dayOfMonth ? [dayOfMonth] : null,
        start_date: startDate,
        end_date: endDate || null,
      };

      if (incomeRule) {
        // Update existing rule
        const { error } = await supabase
          .from('income_rules')
          .update(ruleData)
          .eq('id', incomeRule.id);

        if (error) throw error;
      } else {
        // Create new rule
        const { error } = await supabase
          .from('income_rules')
          .insert(ruleData);

        if (error) throw error;
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error saving income rule:', error);
      Alert.alert('Error', 'Failed to save income rule');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!incomeRule) return;

    Alert.alert(
      'Delete Income Rule',
      'Are you sure you want to delete this income rule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('income_rules')
                .delete()
                .eq('id', incomeRule.id);

              if (error) throw error;
              onSuccess?.();
            } catch (error) {
              console.error('Error deleting income rule:', error);
              Alert.alert('Error', 'Failed to delete income rule');
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
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {incomeRule ? 'Edit Income Rule' : 'Add Income Rule'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            <Text style={[styles.saveButton, loading && styles.disabled]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Income Source Name and Amount Side by Side */}
          <View style={styles.rowFields}>
            <View style={styles.flexField}>
              <Text style={styles.label}>Income Source *</Text>
              <TextInput
                style={styles.input}
                value={sourceName}
                onChangeText={setSourceName}
                placeholder="Enter income source name"
                autoCapitalize="words"
              />
              {matchingSources.length > 0 && (
                <View style={styles.dropdown}>
                  {matchingSources.map(source => (
                    <TouchableOpacity
                      key={source.id}
                      style={styles.dropdownItem}
                      onPress={() => selectSource(source)}
                    >
                      <Text style={styles.dropdownText}>{source.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.amountField}>
              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Frequency */}
          <View style={styles.field}>
            <Text style={styles.label}>Frequency *</Text>
            <View style={styles.frequencyButtons}>
              {(['daily', 'weekly', 'monthly'] as const).map(freq => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyButton,
                    frequency === freq && styles.frequencyButtonActive,
                  ]}
                  onPress={() => setFrequency(freq)}
                >
                  <Text
                    style={[
                      styles.frequencyButtonText,
                      frequency === freq && styles.frequencyButtonTextActive,
                    ]}
                  >
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Days of Week (if daily or weekly) */}
          {(frequency === 'daily' || frequency === 'weekly') && (
            <View style={styles.field}>
              <Text style={styles.label}>
                Days of Week {frequency === 'weekly' ? '*' : '(Optional)'}
              </Text>
              <View style={styles.daysButtons}>
                {dayLabels.map((label, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayButton,
                      selectedDays.includes(index) && styles.dayButtonActive,
                    ]}
                    onPress={() => toggleDay(index)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        selectedDays.includes(index) && styles.dayButtonTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Day of Month (if monthly) */}
          {frequency === 'monthly' && (
            <View style={styles.field}>
              <Text style={styles.label}>Day of Month *</Text>
              <DayOfMonthInput
                value={dayOfMonth}
                onChange={setDayOfMonth}
              />
            </View>
          )}

          {/* Start and End Date Side by Side */}
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <DateInput
                label="Start Date *"
                value={startDate}
                onChangeDate={setStartDate}
                required
              />
            </View>
            <View style={styles.dateField}>
              <DateInput
                label="End Date"
                value={endDate}
                onChangeDate={setEndDate}
              />
            </View>
          </View>

          {/* Delete Button (if editing) */}
          {incomeRule && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color="white" />
              <Text style={styles.deleteButtonText}>Delete Rule</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  cancelButton: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498db',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
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
    backgroundColor: 'white',
  },
  dropdown: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  dropdownText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  frequencyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  frequencyButtonText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  frequencyButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  daysButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  dayButtonText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  dayButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dateField: {
    flex: 1,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  flexField: {
    flex: 1,
  },
  amountField: {
    width: 120,
  },
  clearButton: {
    marginTop: -12,
    marginBottom: 20,
    padding: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#e74c3c',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e74c3c',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
