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
import { Deposit } from '@/types';
import WeeklyDepositGroup from '@/components/Deposits/WeeklyDepositGroup';
import { useToast } from '@/components/CustomToast';
import { format } from 'date-fns';

interface ExpenseRow {
  id: string;
  expenseTypeId: string | null;
  expenseTypeName: string;
  amount: string;
  isNewType: boolean;
}

interface ExpensePurchase {
  id: string;
  description?: string;
  purchase_date?: string;
  purchase_amount?: number;
  estimated_amount?: number;
  expense_type_id: string;
}

interface DepositWeekModalProps {
  visible: boolean;
  onClose: () => void;
  startDate: Date | null;
  endDate: Date | null;
  deposits: Deposit[];
  total: number;
  existingExpenseTypes: Array<{ id: string; name: string; default_amount?: number }>;
  existingWeeklyExpenses: Array<{ expense_type_id: string; amount: number }>;
  expensePurchases: ExpensePurchase[];
  onSaveExpenses: (expenses: Array<{ expense_type_id: string | null; expense_type_name: string; amount: number }>) => Promise<void>;
  onViewDeposit: (deposit: Deposit) => void;
  onEditDeposit: (deposit: Deposit) => void;
  onDeleteDeposit: (deposit: Deposit) => void;
}

export default function DepositWeekModal({
  visible,
  onClose,
  startDate,
  endDate,
  deposits,
  total,
  existingExpenseTypes,
  existingWeeklyExpenses,
  expensePurchases,
  onSaveExpenses,
  onViewDeposit,
  onEditDeposit,
  onDeleteDeposit,
}: DepositWeekModalProps) {
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
        amount: existingExpense ? existingExpense.amount.toString() : '',
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
      console.error('[DepositWeekModal] Save error:', error);
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

  const getWeekExpensePurchases = () => {
    if (!startDate || !endDate) return [];
    
    return expensePurchases.filter(purchase => {
      if (!purchase.purchase_date) return false;
      // Parse date at noon to avoid timezone shifts
      const dateStr = purchase.purchase_date.split('T')[0];
      const [year, month, day] = dateStr.split('-').map(Number);
      const purchaseDate = new Date(year, month - 1, day, 12, 0, 0);
      return purchaseDate >= startDate && purchaseDate <= endDate;
    });
  };

  const calculateAdjustedTotal = () => {
    const expensesTotal = expenseRows.reduce((sum, row) => {
      const amount = parseFloat(row.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    const purchasesTotal = getWeekExpensePurchases().reduce((sum, purchase) => {
      return sum + (purchase.purchase_amount || purchase.estimated_amount || 0);
    }, 0);
    
    return total - expensesTotal - purchasesTotal;
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
              
              <Text style={styles.headerTitle}>Net Income</Text>
              
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
              <WeeklyDepositGroup
                startDate={startDate}
                endDate={endDate}
                deposits={deposits}
                total={total}
                onViewDeposit={onViewDeposit}
                onEditDeposit={onEditDeposit}
                onDeleteDeposit={onDeleteDeposit}
              />

              {/* Expense Purchases */}
              {getWeekExpensePurchases().length > 0 && (
                <View style={styles.purchasesSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Expense Purchases</Text>
                    <Text style={styles.sectionTotal}>
                      -{formatAmount(getWeekExpensePurchases().reduce((sum, p) => 
                        sum + (p.purchase_amount || p.estimated_amount || 0), 0
                      ))}
                    </Text>
                  </View>
                  {getWeekExpensePurchases().map(purchase => {
                    const amount = purchase.purchase_amount || purchase.estimated_amount || 0;
                    const expenseType = existingExpenseTypes.find(t => t.id === purchase.expense_type_id);
                    
                    // Format date
                    let dateDisplay = '';
                    if (purchase.purchase_date) {
                      const dateStr = purchase.purchase_date.split('T')[0];
                      const [year, month, day] = dateStr.split('-').map(Number);
                      dateDisplay = format(new Date(year, month - 1, day), 'MMM d');
                    }
                    
                    return (
                      <View key={purchase.id} style={styles.purchaseItem}>
                        <View style={styles.purchaseLeft}>
                          {dateDisplay && <Text style={styles.purchaseDate}>{dateDisplay}</Text>}
                          <Text style={styles.purchaseDescription}>
                            {purchase.description || expenseType?.name || 'Purchase'}
                          </Text>
                        </View>
                        <Text style={styles.purchaseAmount}>-{formatAmount(amount)}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Adjusted Total */}
              <View style={[styles.adjustedTotalSection, adjustedTotal < 0 && styles.negativeTotalSection]}>
                <Text style={styles.adjustedTotalLabel}>Net Total</Text>
                <Text style={[styles.adjustedTotalAmount, adjustedTotal < 0 && styles.negativeAmount]}>
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
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e74c3c',
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
  purchasesSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  purchaseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  purchaseLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  purchaseDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    minWidth: 45,
  },
  purchaseDescription: {
    fontSize: 15,
    color: '#2c3e50',
    flex: 1,
  },
  purchaseAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e74c3c',
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
  negativeTotalSection: {
    borderColor: '#e74c3c',
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
