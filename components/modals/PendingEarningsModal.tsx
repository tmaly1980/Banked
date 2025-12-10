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
import Calculator from '@/components/Calculator';
import BottomSheetModal from './BottomSheetModal';

interface PendingEarningsModalProps {
  visible: boolean;
  onClose: () => void;
  dailyEarningsGoal: number;
  onGoalUpdate: (newGoal: number) => void;
}

export default function PendingEarningsModal({ visible, onClose, dailyEarningsGoal, onGoalUpdate }: PendingEarningsModalProps) {
  const { incomeSources, updateIncomeSource } = useIncome();
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalValue, setGoalValue] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorSource, setCalculatorSource] = useState<IncomeSource | null>(null);

  const handleOpenCalculator = (source: IncomeSource) => {
    setCalculatorSource(source);
    setShowCalculator(true);
  };

  const handleCalculatorConfirm = async (value: number) => {
    if (!calculatorSource) return;
    
    try {
      await updateIncomeSource(calculatorSource.id, { pending_earnings: value });
      setCalculatorSource(null);
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
        <View style={styles.sourceInfo}>
          <Text style={styles.sourceName}>{item.name}</Text>
          <Text style={styles.sourceFrequency}>{item.frequency}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.amountContainer}
          onPress={() => handleOpenCalculator(item)}
        >
          <Text style={styles.amount}>${item.pending_earnings.toFixed(2)}</Text>
        </TouchableOpacity>
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

      <Calculator
        visible={showCalculator}
        onClose={() => {
          setShowCalculator(false);
          setCalculatorSource(null);
        }}
        initialValue={calculatorSource?.pending_earnings || 0}
        onConfirm={handleCalculatorConfirm}
        title={calculatorSource?.name || "Pending Earnings"}
      />
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
  amountActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  calculatorButton: {
    padding: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2ecc71',
    marginRight: 8,
  },
  editIcon: {
    marginLeft: 4,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
