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
import { format, parseISO } from 'date-fns';

interface IncomeSourceEntry {
  income_source_id: string;
  income_source_name: string;
  amount: number;
  is_actual: boolean;
}

interface DayIncomeBreakdownModalProps {
  visible: boolean;
  onClose: () => void;
  date: string;
  entries: IncomeSourceEntry[];
  onUpdate: () => void;
}

export default function DayIncomeBreakdownModal({
  visible,
  onClose,
  date,
  entries,
  onUpdate,
}: DayIncomeBreakdownModalProps) {
  const { user } = useAuth();
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const formattedDate = date ? format(parseISO(date), 'EEEE, MMM d, yyyy') : '';

  const handleStartEdit = (sourceId: string, currentAmount: number) => {
    setEditingSourceId(sourceId);
    setEditAmount(currentAmount.toFixed(2));
  };

  const handleSaveAmount = async (sourceId: string) => {
    if (!user) return;

    try {
      const amountValue = parseFloat(editAmount);
      
      if (editAmount === '' || isNaN(amountValue)) {
        // Delete the actual earnings record if amount is cleared
        const { error } = await supabase
          .from('income_source_daily_earnings')
          .delete()
          .eq('user_id', user.id)
          .eq('income_source_id', sourceId)
          .eq('date', date);

        if (error) throw error;
      } else {
        // Upsert the actual earnings record
        const { error } = await supabase
          .from('income_source_daily_earnings')
          .upsert({
            user_id: user.id,
            income_source_id: sourceId,
            date: date,
            earnings_amount: amountValue,
          }, {
            onConflict: 'user_id,income_source_id,date'
          });

        if (error) throw error;
      }

      setEditingSourceId(null);
      setEditAmount('');
      onUpdate();
    } catch (error) {
      console.error('Error saving amount:', error);
      Alert.alert('Error', 'Failed to save amount');
    }
  };

  const handleCancelEdit = () => {
    setEditingSourceId(null);
    setEditAmount('');
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
            <Ionicons name="close" size={28} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.title}>Income Breakdown</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.dateHeader}>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>

        <ScrollView style={styles.content}>
          {entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No income scheduled for this day</Text>
            </View>
          ) : (
            entries.map((entry) => (
              <View key={entry.income_source_id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <View style={styles.sourceInfo}>
                    <Text style={styles.sourceName}>{entry.income_source_name}</Text>
                    <Text style={styles.sourceType}>
                      {entry.is_actual ? 'Actual' : 'Projected'}
                    </Text>
                  </View>

                  {editingSourceId === entry.income_source_id ? (
                    <View style={styles.editContainer}>
                      <TextInput
                        style={styles.amountInput}
                        value={editAmount}
                        onChangeText={setEditAmount}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        autoFocus
                        selectTextOnFocus
                      />
                      <TouchableOpacity
                        onPress={() => handleSaveAmount(entry.income_source_id)}
                        style={styles.iconButton}
                      >
                        <Ionicons name="checkmark" size={24} color="#2ecc71" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleCancelEdit}
                        style={styles.iconButton}
                      >
                        <Ionicons name="close" size={24} color="#e74c3c" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleStartEdit(entry.income_source_id, entry.amount)}
                      style={styles.amountButton}
                    >
                      <Text style={[styles.amount, entry.is_actual && styles.actualAmount]}>
                        ${entry.amount.toFixed(2)}
                      </Text>
                      <Ionicons name="pencil" size={16} color="#7f8c8d" style={styles.editIcon} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
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
  dateHeader: {
    backgroundColor: '#3498db',
    padding: 16,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  entryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  sourceType: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  amountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  actualAmount: {
    color: '#3498db',
  },
  editIcon: {
    opacity: 0.5,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 8,
    padding: 8,
    fontSize: 18,
    fontWeight: '600',
    minWidth: 100,
    textAlign: 'right',
  },
  iconButton: {
    padding: 4,
  },
});
