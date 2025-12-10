import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIncome } from '@/contexts/IncomeContext';
import { IncomeSource } from '@/types';
import { supabase } from '@/lib/supabase';
import SessionTimer from '@/components/SessionTimer';
import BottomSheetModal from './BottomSheetModal';

interface PendingEarningsModalProps {
  visible: boolean;
  onClose: () => void;
  dailyEarningsGoal: number;
  onGoalUpdate: (newGoal: number) => void;
  onOpenDetails?: (source: IncomeSource) => void;
}

export default function PendingEarningsModal({ visible, onClose, dailyEarningsGoal, onGoalUpdate, onOpenDetails }: PendingEarningsModalProps) {
  const { incomeSources, updateIncomeSource } = useIncome();
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalValue, setGoalValue] = useState('');
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  const handleOpenDetails = (source: IncomeSource) => {
    if (onOpenDetails) {
      onOpenDetails(source);
    }
  };

  const handleAmountChange = (sourceId: string, value: string) => {
    setEditingValues(prev => ({ ...prev, [sourceId]: value }));
  };

  const handleAmountSave = async (source: IncomeSource) => {
    const value = editingValues[source.id];
    if (value === undefined) return;
    
    const newAmount = parseFloat(value) || 0;
    try {
      await updateIncomeSource(source.id, { pending_earnings: newAmount });
      setEditingValues(prev => {
        const updated = { ...prev };
        delete updated[source.id];
        return updated;
      });
    } catch (err) {
      console.error('Error updating pending earnings:', err);
      alert('Failed to update earnings');
    }
  };

  const handleStartGoalEdit = () => {
    setEditingGoal(true);
    setGoalValue(dailyEarningsGoal.toFixed(2));
  };

  const handleSaveGoalEdit = async () => {
    const newGoal = parseFloat(goalValue) || 0;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('account_info')
        .update({ daily_earnings_goal: newGoal })
        .eq('user_id', user.id);

      if (error) throw error;

      onGoalUpdate(newGoal);
      setEditingGoal(false);
    } catch (err) {
      console.error('Error updating daily earnings goal:', err);
      alert('Failed to update goal');
    }
  };

  const handleCancelGoalEdit = () => {
    setEditingGoal(false);
    setGoalValue('');
  };

  const totalPendingEarnings = incomeSources.reduce(
    (sum, source) => sum + source.pending_earnings,
    0
  );

  const renderIncomeSource = ({ item }: { item: IncomeSource }) => {
    return (
      <View style={styles.sourceRow}>
        <TouchableOpacity
          style={styles.sourceInfo}
          onPress={() => handleOpenDetails(item)}
        >
          <Text style={styles.sourceName}>{item.name}</Text>
          <Text style={styles.sourceFrequency}>{item.frequency}</Text>
        </TouchableOpacity>
        
        <SessionTimer
          incomeSourceId={item.id}
          incomeSourceName={item.name}
        />
        
        <View style={styles.amountInputContainer}>
          <Text style={styles.dollarSign}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={editingValues[item.id] !== undefined ? editingValues[item.id] : item.pending_earnings.toFixed(2)}
            onChangeText={(value) => handleAmountChange(item.id, value)}
            onSubmitEditing={() => handleAmountSave(item)}
            onBlur={() => handleAmountSave(item)}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </View>
      </View>
    );
  };

  return (
    <>
      <BottomSheetModal
        visible={visible}
        onClose={onClose}
        title="Pending Earnings"
      >
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total Pending</Text>
          <Text style={styles.totalAmount}>${totalPendingEarnings.toFixed(2)}</Text>
        </View>

        <View style={styles.goalSection}>
          <Text style={styles.goalLabel}>Daily Earnings Goal</Text>
          {editingGoal ? (
            <View style={styles.editContainer}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.input}
                value={goalValue}
                onChangeText={setGoalValue}
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
                onSubmitEditing={handleSaveGoalEdit}
                onBlur={handleCancelGoalEdit}
              />
              <TouchableOpacity onPress={handleSaveGoalEdit}>
                <Ionicons name="checkmark" size={24} color="#27ae60" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.goalAmountContainer}
              onPress={handleStartGoalEdit}
            >
              <Text style={styles.goalAmount}>${dailyEarningsGoal.toFixed(2)}</Text>
              <Ionicons name="pencil" size={16} color="#95a5a6" style={styles.editIcon} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={incomeSources}
          renderItem={renderIncomeSource}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No income sources</Text>
              <Text style={styles.emptySubtext}>Add income sources in the Income tab</Text>
            </View>
          }
        />
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  totalSection: {
    backgroundColor: '#2ecc71',
    padding: 20,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  goalSection: {
    backgroundColor: '#3498db',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
  },
  goalAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  sourceFrequency: {
    fontSize: 13,
    color: '#7f8c8d',
    textTransform: 'capitalize',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  amountInput: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2ecc71',
    minWidth: 80,
    textAlign: 'right',
    paddingVertical: 4,
  },
  editIcon: {
    marginLeft: 4,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dollarSign: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginRight: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#3498db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    minWidth: 100,
    textAlign: 'right',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#3498db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    minWidth: 100,
    textAlign: 'right',
  },
  saveButton: {
    marginLeft: 8,
    padding: 4,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 4,
  },
});
