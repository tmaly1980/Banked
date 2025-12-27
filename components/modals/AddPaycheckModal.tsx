import React, { useState, useEffect } from 'react';
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

interface IncomeSource {
  id: string;
  name: string;
}

interface AddPaycheckModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddPaycheckModal({
  visible,
  onClose,
  onSuccess,
}: AddPaycheckModalProps) {
  const { user } = useAuth();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [matchingSources, setMatchingSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadIncomeSources();
      resetForm();
    }
  }, [visible]);

  useEffect(() => {
    if (sourceName.length >= 2) {
      const matches = incomeSources.filter(source =>
        source.name.toLowerCase().includes(sourceName.toLowerCase())
      );
      setMatchingSources(matches);
    } else {
      setMatchingSources([]);
    }
  }, [sourceName, incomeSources]);

  const loadIncomeSources = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('income_sources')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setIncomeSources(data || []);
    } catch (error) {
      console.error('Error loading income sources:', error);
    }
  };

  const resetForm = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setAmount('');
    setSourceName('');
    setSourceId(null);
    setMatchingSources([]);
  };

  const selectSource = (source: IncomeSource) => {
    setSourceName(source.name);
    setSourceId(source.id);
    setMatchingSources([]);
  };

  const handleSave = async () => {
    if (!user || !sourceName || !amount || !date) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum < 0) {
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

      // Upsert the paycheck
      const { error } = await supabase
        .from('income_source_daily_earnings')
        .upsert({
          user_id: user.id,
          income_source_id: finalSourceId,
          date: date,
          earnings_amount: amountNum,
        }, {
          onConflict: 'user_id,income_source_id,date'
        });

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving paycheck:', error);
      Alert.alert('Error', 'Failed to save paycheck');
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.title}>Add Paycheck</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            <Text style={[styles.saveButton, loading && styles.disabled]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Date */}
          <View style={styles.field}>
            <DateInput
              label="Date"
              value={date}
              onChange={setDate}
              placeholder="Select date"
              required
            />
          </View>

          {/* Income Source */}
          <View style={styles.field}>
            <Text style={styles.label}>Income Source *</Text>
            <TextInput
              style={styles.input}
              value={sourceName}
              onChangeText={setSourceName}
              placeholder="Enter or select income source"
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

          {/* Amount */}
          <View style={styles.field}>
            <Text style={styles.label}>Amount *</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  cancelButton: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  saveButton: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
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
});
