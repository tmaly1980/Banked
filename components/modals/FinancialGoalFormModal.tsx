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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FinancialGoal, Bill, BillSuggestion } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useBills } from '@/contexts/BillsContext';
import { format, addMonths, addWeeks, startOfWeek, addDays, isBefore, parseISO } from 'date-fns';
import DateInput from '@/components/DateInput';

interface FinancialGoalFormModalProps {
  visible: boolean;
  goal: FinancialGoal | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FinancialGoalFormModal({
  visible,
  goal,
  onClose,
  onSuccess,
}: FinancialGoalFormModalProps) {
  const { user } = useAuth();
  const { bills } = useBills();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [dueMonth, setDueMonth] = useState('');
  const [dueWeek, setDueWeek] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [status, setStatus] = useState<'pending' | 'paid' | 'active' | 'completed' | 'cancelled'>('pending');
  const [billSuggestions, setBillSuggestions] = useState<BillSuggestion[]>([]);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Generate next 12 months
  const getNextMonths = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = addMonths(new Date(), i);
      months.push({
        label: format(date, 'MMMM yyyy'),
        value: format(date, 'yyyy-MM'),
      });
    }
    return months;
  };

  // Generate next 8 weeks
  const getNextWeeks = () => {
    const weeks = [];
    for (let i = 0; i < 8; i++) {
      const date = addWeeks(new Date(), i);
      const weekStart = startOfWeek(date, { weekStartsOn: 0 });
      weeks.push({
        label: `Week of ${format(weekStart, 'MMM d, yyyy')}`,
        value: format(weekStart, "yyyy-'W'ww"),
      });
    }
    return weeks;
  };

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setDescription(goal.description || '');
      setTargetAmount(goal.target_amount.toString());
      setDueMonth(goal.due_month || '');
      setDueWeek(goal.due_week || '');
      setDueDate(goal.due_date || '');
      setSelectedBillId(goal.bill_id || null);
      setStatus(goal.status);
    } else {
      resetForm();
      // Pre-select current month
      setDueMonth(format(new Date(), 'yyyy-MM'));
    }
  }, [goal, visible]);

  // Search bills by name
  useEffect(() => {
    if (name.trim().length >= 2) {
      searchBillsByName(name.trim());
    } else {
      setBillSuggestions([]);
    }
  }, [name]);

  // Search bills by amount
  useEffect(() => {
    if (targetAmount && parseFloat(targetAmount) > 0 && !selectedBillId) {
      searchBillsByAmount(parseFloat(targetAmount));
    }
  }, [targetAmount, selectedBillId]);

  const searchBillsByName = async (searchTerm: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user.id)
        .textSearch('search_vector', searchTerm, {
          type: 'websearch',
          config: 'english',
        })
        .limit(5);

      if (error) throw error;

      const suggestions: BillSuggestion[] = (data || []).map(bill => ({
        bill,
        relevance: 'name_match' as const,
        score: 1,
      }));

      setBillSuggestions(suggestions);
    } catch (err) {
      console.error('Error searching bills by name:', err);
    }
  };

  const searchBillsByAmount = async (amount: number) => {
    if (!user) return;

    const tolerance = 0.05; // 5% tolerance
    const minAmount = amount * (1 - tolerance);
    const maxAmount = amount * (1 + tolerance);

    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user.id)
        .gte('amount', minAmount)
        .lte('amount', maxAmount)
        .limit(5);

      if (error) throw error;

      // Sort by closest match
      const suggestions: BillSuggestion[] = (data || [])
        .map(bill => ({
          bill,
          relevance: 'amount_match' as const,
          score: 1 - Math.abs(bill.amount - amount) / amount,
        }))
        .sort((a, b) => b.score - a.score);

      // Combine with existing name matches, prioritizing name matches
      setBillSuggestions(prev => {
        const nameMatches = prev.filter(s => s.relevance === 'name_match');
        const amountMatches = suggestions.filter(
          s => !nameMatches.some(nm => nm.bill.id === s.bill.id)
        );
        return [...nameMatches, ...amountMatches];
      });
    } catch (err) {
      console.error('Error searching bills by amount:', err);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setTargetAmount('');
    setDueMonth(format(new Date(), 'yyyy-MM')); // Pre-select current month
    setDueWeek('');
    setDueDate('');
    setSelectedBillId(null);
    setStatus('pending');
    setBillSuggestions([]);
  };

  const selectBill = (billId: string) => {
    setSelectedBillId(billId);
    setBillSuggestions([]);
    
    // Auto-fill target amount from bill
    const bill = bills.find(b => b.id === billId);
    if (bill) {
      setTargetAmount(bill.amount.toString());
      
      // If bill has a due_date, use it (even if overdue)
      if (bill.due_date) {
        setDueDate(bill.due_date);
      } else if (bill.due_day) {
        // Recurring bill with due_day
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        // Create date for this month's due day
        let dueThisMonth = new Date(currentYear, currentMonth, bill.due_day);
        
        // If already passed this month, use this month's date (overdue)
        // Otherwise use this month's upcoming date
        setDueDate(format(dueThisMonth, 'yyyy-MM-dd'));
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a goal name');
      return;
    }

    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid target amount');
      return;
    }

    setLoading(true);

    try {
      const goalData: any = {
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        target_amount: parseFloat(targetAmount),
        due_month: dueMonth || null,
        due_week: dueWeek || null,
        due_date: dueDate || null,
        bill_id: selectedBillId,
        status,
        sort_order: goal?.sort_order || 0,
      };

      if (goal) {
        const { error } = await supabase
          .from('financial_goals')
          .update(goalData)
          .eq('id', goal.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('financial_goals')
          .insert(goalData);

        if (error) throw error;
      }

      Alert.alert('Success', `Goal ${goal ? 'updated' : 'created'} successfully`);
      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      console.error('Error saving goal:', err);
      Alert.alert('Error', 'Failed to save goal');
    } finally {
      setLoading(false);
    }
  };

  const selectedBill = bills.find(b => b.id === selectedBillId);

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {goal ? 'Edit' : 'Add'} Financial Goal
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={loading}>
              <Text style={[styles.saveButton, loading && styles.saveButtonDisabled]}>
                {loading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Goal Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Save for vacation"
                placeholderTextColor="#95a5a6"
              />
            </View>

            {/* Bill Suggestions */}
            {billSuggestions.length > 0 && !selectedBillId && (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Related Bills:</Text>
                {billSuggestions.map(({ bill, relevance }) => (
                  <View key={bill.id} style={styles.suggestionItem}>
                    <View style={styles.suggestionInfo}>
                      <Text style={styles.suggestionName}>{bill.name}</Text>
                      <Text style={styles.suggestionAmount}>
                        ${bill.amount?.toFixed(2)}
                      </Text>
                      <Text style={styles.suggestionRelevance}>
                        {relevance === 'name_match' ? '📝 Name match' : '💰 Amount match'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.selectButton}
                      onPress={() => selectBill(bill.id)}
                    >
                      <Text style={styles.selectButtonText}>Select</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Selected Bill Display */}
            {selectedBill && (
              <View style={styles.selectedBillContainer}>
                <View style={styles.selectedBillInfo}>
                  <Text style={styles.selectedBillLabel}>Linked Bill:</Text>
                  <Text style={styles.selectedBillName}>{selectedBill.name}</Text>
                  <Text style={styles.selectedBillAmount}>
                    ${selectedBill.amount?.toFixed(2)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedBillId(null)}>
                  <Ionicons name="close-circle" size={24} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Target Amount *</Text>
              <TextInput
                style={styles.input}
                value={targetAmount}
                onChangeText={setTargetAmount}
                placeholder="0.00"
                placeholderTextColor="#95a5a6"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Due Month</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowMonthPicker(!showMonthPicker)}
              >
                <Text style={styles.pickerButtonText}>
                  {dueMonth
                    ? getNextMonths().find(m => m.value === dueMonth)?.label
                    : 'Select month'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#7f8c8d" />
              </TouchableOpacity>
              {showMonthPicker && (
                <View style={styles.pickerOptions}>
                  {getNextMonths().map(month => (
                    <TouchableOpacity
                      key={month.value}
                      style={styles.pickerOption}
                      onPress={() => {
                        setDueMonth(month.value);
                        setShowMonthPicker(false);
                      }}
                    >
                      <Text style={styles.pickerOptionText}>{month.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Due Week</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowWeekPicker(!showWeekPicker)}
              >
                <Text style={styles.pickerButtonText}>
                  {dueWeek
                    ? getNextWeeks().find(w => w.value === dueWeek)?.label
                    : 'Select week'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#7f8c8d" />
              </TouchableOpacity>
              {showWeekPicker && (
                <View style={styles.pickerOptions}>
                  {getNextWeeks().map(week => (
                    <TouchableOpacity
                      key={week.value}
                      style={styles.pickerOption}
                      onPress={() => {
                        setDueWeek(week.value);
                        setShowWeekPicker(false);
                      }}
                    >
                      <Text style={styles.pickerOptionText}>{week.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <DateInput
              label="Due Date (Optional)"
              value={dueDate}
              onChangeDate={setDueDate}
              placeholder="MM/DD/YYYY"
            />

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Add details about this goal..."
                placeholderTextColor="#95a5a6"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusButtons}>
                {['pending', 'paid', 'active', 'completed', 'cancelled'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusButton,
                      status === s && styles.statusButtonActive,
                    ]}
                    onPress={() => setStatus(s as any)}
                  >
                    <Text
                      style={[
                        styles.statusButtonText,
                        status === s && styles.statusButtonTextActive,
                      ]}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
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
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  cancelButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498db',
  },
  saveButtonDisabled: {
    color: '#95a5a6',
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  pickerOptions: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    backgroundColor: 'white',
    maxHeight: 200,
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  suggestionsContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  suggestionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 2,
  },
  suggestionRelevance: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  selectButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  selectButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  selectedBillContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  selectedBillInfo: {
    flex: 1,
  },
  selectedBillLabel: {
    fontSize: 12,
    color: '#155724',
    marginBottom: 2,
  },
  selectedBillName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 2,
  },
  selectedBillAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  statusButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  statusButtonTextActive: {
    color: 'white',
  },
});
