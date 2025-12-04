import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Paycheck } from '@/types';
import WeeklyPaycheckGroup from '@/components/Paychecks/WeeklyPaycheckGroup';
import { useToast } from '@/components/CustomToast';

interface ExpenseRow {
  id: string;
  expenseTypeId: string | null;
  expenseTypeName: string;
  amount: string;
  isNewType: boolean;
}

interface PaycheckWeekModalProps {
  visible: boolean;
  onClose: () => void;
  startDate: Date | null;
  endDate: Date | null;
  paychecks: Paycheck[];
  total: number;
  existingExpenseTypes: Array<{ id: string; name: string; default_amount?: number }>;
  existingWeeklyExpenses: Array<{ expense_type_id: string; amount: number }>;
  onSaveExpenses: (expenses: Array<{ expense_type_id: string | null; expense_type_name: string; amount: number }>) => Promise<void>;
  onViewPaycheck: (paycheck: Paycheck) => void;
  onEditPaycheck: (paycheck: Paycheck) => void;
  onDeletePaycheck: (paycheck: Paycheck) => void;
}

export default function PaycheckWeekModal({
  visible,
  onClose,
  startDate,
  endDate,
  paychecks,
  total,
  existingExpenseTypes,
  existingWeeklyExpenses,
  onSaveExpenses,
  onViewPaycheck,
  onEditPaycheck,
  onDeletePaycheck,
}: PaycheckWeekModalProps) {
  const toast = useToast();
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (visible && startDate) {
      initializeExpenseRows();
      setHasChanges(false);
    }
  }, [visible, startDate, existingExpenseTypes, existingWeeklyExpenses]);

  const initializeExpenseRows = () => {
    const initialRows: ExpenseRow[] = existingExpenseTypes.map(type => {
      const existingExpense = existingWeeklyExpenses.find(
        exp => exp.expense_type_id === type.id
      );
      
      return {
        id: type.id,
        expenseTypeId: type.id,
        expenseTypeName: type.name,
        amount: existingExpense ? existingExpense.allocated_amount.toString() : '',
        isNewType: false,
      };
    });

    setExpenseRows(initialRows);
  };

  const handleAddExpenseRow = () => {
    const newRow: ExpenseRow = {
      id: `new-${Date.now()}`,
      expenseTypeId: null,
      expenseTypeName: '',
      amount: '',
      isNewType: true,
    };
    setExpenseRows([...expenseRows, newRow]);
    setHasChanges(true);
  };

  const handleUpdateExpenseRow = (id: string, field: 'expenseTypeName' | 'amount', value: string) => {
    setExpenseRows(expenseRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const validRows = expenseRows.filter(row => {
      const hasName = row.expenseTypeName.trim().length > 0;
      const hasAmount = row.amount.trim().length > 0;
      return hasName && hasAmount;
    });

    for (const row of validRows) {
      const amount = parseFloat(row.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.show({
          type: 'error',
          text1: 'Invalid amount',
          text2: `Please enter a valid amount for ${row.expenseTypeName}`,
        });
        return;
      }
    }

    setLoading(true);
    try {
      const expenses = validRows.map(row => ({
        expense_type_id: row.expenseTypeId,
        expense_type_name: row.expenseTypeName.trim(),
        amount: parseFloat(row.amount),
      }));

      await onSaveExpenses(expenses);
      
      toast.show({
        type: 'success',
        text1: 'Weekly expenses saved',
      });
      
      setHasChanges(false);
    } catch (error) {
      console.error('[PaycheckWeekModal] Save error:', error);
      toast.show({
        type: 'error',
        text1: 'Error saving expenses',
        text2: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    initializeExpenseRows();
    setHasChanges(false);
  };

  if (!startDate || !endDate) return null;

  const formatAmount = (amount: number) => {
    const absAmount = Math.abs(amount);
    const formatted = `$${absAmount.toFixed(2)}`;
    return amount < 0 ? `-${formatted}` : formatted;
  };

  const calculateAdjustedTotal = () => {
    const expensesTotal = expenseRows.reduce((sum, row) => {
      const amount = parseFloat(row.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    return total - expensesTotal;
  };

  const adjustedTotal = calculateAdjustedTotal();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.header}>
              <TouchableOpacity 
                onPress={hasChanges ? handleCancel : onClose}
                style={styles.headerButton}
              >
                <Text style={styles.cancelButton}>
                  {hasChanges ? 'Cancel' : 'Close'}
                </Text>
              </TouchableOpacity>
              
              <Text style={styles.headerTitle}>Paychecks for Week</Text>
              
              {hasChanges ? (
                <TouchableOpacity 
                  onPress={handleSave}
                  disabled={loading}
                  style={styles.headerButton}
                >
                  <Text style={[styles.saveButton, loading && styles.disabledButton]}>
                    {loading ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.headerButton} />
              )}
            </View>

            <ScrollView 
              style={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              <WeeklyPaycheckGroup
                startDate={startDate}
                endDate={endDate}
                paychecks={paychecks}
                total={total}
                onViewPaycheck={onViewPaycheck}
                onEditPaycheck={onEditPaycheck}
                onDeletePaycheck={onDeletePaycheck}
              />

              <View style={styles.expensesSection}>
                <Text style={styles.sectionTitle}>Weekly Expenses</Text>
                
                {expenseRows.map((row) => (
                  <View key={row.id} style={styles.expenseInputRow}>
                    <TextInput
                      style={[styles.expenseNameInput, !row.isNewType && styles.inputDisabled]}
                      value={row.expenseTypeName}
                      onChangeText={(value) => handleUpdateExpenseRow(row.id, 'expenseTypeName', value)}
                      placeholder="Food, Gas, etc."
                      editable={row.isNewType}
                    />
                    
                    <TextInput
                      style={styles.expenseAmountInput}
                      value={row.amount}
                      onChangeText={(value) => handleUpdateExpenseRow(row.id, 'amount', value)}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>
                ))}

                <TouchableOpacity style={styles.addExpenseButton} onPress={handleAddExpenseRow}>
                  <Text style={styles.addExpenseButtonText}>Add Expense</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.adjustedTotalSection}>
                <Text style={styles.adjustedTotalLabel}>Adjusted Total</Text>
                <Text style={[
                  styles.adjustedTotalAmount,
                  adjustedTotal < 0 && styles.negativeAmount
                ]}>
                  {formatAmount(adjustedTotal)}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  headerButton: {
    minWidth: 60,
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
  content: {
    padding: 16,
  },
  expensesSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  expenseInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  expenseNameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  expenseAmountInput: {
    width: 100,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  addExpenseButton: {
    marginTop: 8,
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  addExpenseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  adjustedTotalSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  adjustedTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  adjustedTotalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3498db',
  },
  negativeAmount: {
    color: '#e74c3c',
  },
});
