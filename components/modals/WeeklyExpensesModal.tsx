import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { format } from 'date-fns';

interface ExpenseRow {
  id: string;
  expenseTypeId: string | null;
  expenseTypeName: string;
  amount: string;
  isNewType: boolean;
}

interface WeeklyExpensesModalProps {
  visible: boolean;
  onClose: () => void;
  weekStartDate: Date | null;
  weekEndDate: Date | null;
  existingExpenseTypes: Array<{ id: string; name: string; default_amount?: number }>;
  existingWeeklyExpenses: Array<{ expense_type_id: string; amount: number }>;
  onSave: (expenses: Array<{ expense_type_id: string | null; expense_type_name: string; amount: number }>) => Promise<void>;
}

export default function WeeklyExpensesModal({
  visible,
  onClose,
  weekStartDate,
  weekEndDate,
  existingExpenseTypes,
  existingWeeklyExpenses,
  onSave,
}: WeeklyExpensesModalProps) {
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && weekStartDate) {
      initializeRows();
    }
  }, [visible, weekStartDate, existingExpenseTypes, existingWeeklyExpenses]);

  const initializeRows = () => {
    const initialRows: ExpenseRow[] = existingExpenseTypes.map(type => {
      const existingExpense = existingWeeklyExpenses.find(
        exp => exp.expense_type_id === type.id
      );
      
      return {
        id: type.id,
        expenseTypeId: type.id,
        expenseTypeName: type.name,
        amount: existingExpense ? existingExpense.amount.toString() : '',
        isNewType: false,
      };
    });

    setRows(initialRows);
  };

  const handleAddRow = () => {
    const newRow: ExpenseRow = {
      id: `new-${Date.now()}`,
      expenseTypeId: null,
      expenseTypeName: '',
      amount: '',
      isNewType: true,
    };
    setRows([...rows, newRow]);
  };

  const handleUpdateRow = (id: string, field: 'expenseTypeName' | 'amount', value: string) => {
    setRows(rows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const handleDeleteRow = (id: string) => {
    setRows(rows.filter(row => row.id !== id));
  };

  const handleSave = async () => {
    // Filter out empty rows and validate
    const validRows = rows.filter(row => {
      const hasName = row.expenseTypeName.trim().length > 0;
      const hasAmount = row.amount.trim().length > 0;
      return hasName && hasAmount;
    });

    if (validRows.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'No expenses to save',
        text2: 'Add at least one expense with a name and amount',
      });
      return;
    }

    // Validate amounts
    for (const row of validRows) {
      const amount = parseFloat(row.amount);
      if (isNaN(amount) || amount <= 0) {
        Toast.show({
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

      await onSave(expenses);
      
      Toast.show({
        type: 'success',
        text1: 'Weekly expenses saved',
      });
      
      onClose();
    } catch (error) {
      console.error('[WeeklyExpensesModal] Save error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error saving expenses',
        text2: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatWeekLabel = () => {
    if (!weekStartDate || !weekEndDate) return '';
    return `${format(weekStartDate, 'MMM d')} - ${format(weekEndDate, 'MMM d, yyyy')}`;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Weekly Expenses</Text>
            <Text style={styles.subtitle}>{formatWeekLabel()}</Text>
          </View>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            <Text style={[styles.saveButton, loading && styles.disabledButton]}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <Text style={styles.instructions}>
            Add or update your weekly expenses. Tap + to add a new expense type.
          </Text>

          {rows.map((row, index) => (
            <View key={row.id} style={styles.expenseRow}>
              <View style={styles.rowNumber}>
                <Text style={styles.rowNumberText}>{index + 1}</Text>
              </View>
              
              <View style={styles.rowContent}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Expense Type</Text>
                  <TextInput
                    style={[styles.input, !row.isNewType && styles.inputDisabled]}
                    value={row.expenseTypeName}
                    onChangeText={(value) => handleUpdateRow(row.id, 'expenseTypeName', value)}
                    placeholder="Food, Gas, Entertainment, etc."
                    editable={row.isNewType}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Amount</Text>
                  <TextInput
                    style={styles.input}
                    value={row.amount}
                    onChangeText={(value) => handleUpdateRow(row.id, 'amount', value)}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {row.isNewType && (
                <TouchableOpacity
                  style={styles.deleteRowButton}
                  onPress={() => handleDeleteRow(row.id)}
                >
                  <MaterialCommunityIcons name="close-circle" size={24} color="#ff3b30" />
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.addButton} onPress={handleAddRow}>
            <MaterialCommunityIcons name="plus-circle" size={24} color="#007AFF" />
            <Text style={styles.addButtonText}>Add Expense Type</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  form: {
    flex: 1,
  },
  formContent: {
    padding: 20,
    paddingBottom: 40,
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  rowNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 24,
  },
  rowNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  rowContent: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },
  input: {
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
  deleteRowButton: {
    marginLeft: 8,
    marginTop: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  addButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
