import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBills } from '@/contexts/BillsContext';
import SelectPicker from '@/components/SelectPicker';
import { ExpenseType, ExpenseBudget, ExpensePurchase } from '@/types';
import { format } from 'date-fns';
import { InlineAlert } from '@/components/InlineAlert';
import { useInlineAlert } from '@/hooks/useInlineAlert';

interface ExpenseRow {
  type: ExpenseType;
  totalPurchases: number;
  budget: number;
  purchases: ExpensePurchase[];
}

export default function ExpensesScreen() {
  const { 
    expenseBudgets, 
    expensePurchases, 
    expenseTypes, 
    loading, 
    refreshData,
    createExpenseBudget,
    updateExpenseBudget,
    createExpensePurchase,
    updateExpensePurchase,
    deleteExpensePurchase
  } = useBills();
  
  const { alert, showError, showSuccess, hideAlert } = useInlineAlert();
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [purchaseListVisible, setPurchaseListVisible] = useState(false);
  const [selectedExpenseType, setSelectedExpenseType] = useState<ExpenseType | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  // Group data by expense type
  const expenseRows = useMemo(() => {
    const rows: ExpenseRow[] = [];
    const typeIds = new Set<string>();

    // Collect all expense types that have budgets or purchases
    expenseBudgets.forEach(budget => typeIds.add(budget.expense_type_id));
    expensePurchases.forEach(purchase => typeIds.add(purchase.expense_type_id));

    typeIds.forEach(typeId => {
      const type = expenseTypes.find(t => t.id === typeId);
      if (!type) return;

      const typePurchases = expensePurchases.filter(p => p.expense_type_id === typeId);
      const typeBudget = expenseBudgets.find(b => b.expense_type_id === typeId);
      
      const totalPurchases = typePurchases.reduce((sum, p) => sum + p.amount, 0);
      const budget = typeBudget?.amount || 0;

      rows.push({
        type,
        totalPurchases,
        budget,
        purchases: typePurchases.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
      });
    });

    return rows.sort((a, b) => a.type.order - b.type.order);
  }, [expenseBudgets, expensePurchases, expenseTypes]);

  const handleAddBudget = () => {
    setBudgetModalVisible(true);
  };

  const handleAddPurchase = () => {
    setPurchaseModalVisible(true);
  };

  const handleRowPress = (row: ExpenseRow) => {
    setSelectedExpenseType(row.type);
    setPurchaseListVisible(true);
  };

  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Expenses</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: '#3498db' }]}
            onPress={handleAddBudget}
          >
            <Text style={styles.headerButtonText}>Budget</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: '#27ae60' }]}
            onPress={handleAddPurchase}
          >
            <Text style={styles.headerButtonText}>Purchase</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshData} />
        }
      >
        <InlineAlert
          type={alert.type}
          message={alert.message}
          visible={alert.visible}
          onDismiss={hideAlert}
        />

        {expenseRows.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={64} color="#bdc3c7" />
            <Text style={styles.emptyStateText}>No expenses yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add a budget or purchase to get started
            </Text>
          </View>
        ) : (
          expenseRows.map((row) => (
            <TouchableOpacity
              key={row.type.id}
              style={styles.expenseRow}
              onPress={() => handleRowPress(row)}
            >
              <View style={styles.expenseRowContent}>
                <Text style={styles.expenseTypeName}>{row.type.name}</Text>
                <Text style={[
                  styles.expenseAmount,
                  row.totalPurchases > row.budget && styles.overBudget
                ]}>
                  {formatAmount(row.totalPurchases)} / {formatAmount(row.budget)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#7f8c8d" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Budget Modal */}
      <BudgetModal
        visible={budgetModalVisible}
        onClose={() => setBudgetModalVisible(false)}
        expenseTypes={expenseTypes}
        expenseBudgets={expenseBudgets}
        onSuccess={async (data) => {
          try {
            const existingBudget = expenseBudgets.find(
              b => b.expense_type_id === data.expense_type_id
            );

            if (existingBudget) {
              const { error } = await updateExpenseBudget(existingBudget.id, {
                amount: data.amount,
              });
              if (error) throw error;
            } else {
              const { error } = await createExpenseBudget(data);
              if (error) throw error;
            }

            showSuccess('Budget saved successfully');
            setBudgetModalVisible(false);
            await refreshData();
          } catch (error) {
            showError(error instanceof Error ? error.message : 'Failed to save budget');
          }
        }}
      />

      {/* Purchase Modal */}
      <PurchaseModal
        visible={purchaseModalVisible}
        onClose={() => setPurchaseModalVisible(false)}
        expenseTypes={expenseTypes}
        onSuccess={async (data) => {
          try {
            const { error } = await createExpensePurchase(data);
            if (error) throw error;
            
            showSuccess('Purchase added successfully');
            setPurchaseModalVisible(false);
            await refreshData();
          } catch (error) {
            showError(error instanceof Error ? error.message : 'Failed to add purchase');
          }
        }}
      />

      {/* Purchase List Modal */}
      <PurchaseListModal
        visible={purchaseListVisible}
        onClose={() => {
          setPurchaseListVisible(false);
          setSelectedExpenseType(null);
        }}
        expenseType={selectedExpenseType}
        purchases={selectedExpenseType ? 
          expensePurchases.filter(p => p.expense_type_id === selectedExpenseType.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          : []
        }
        onDelete={async (id) => {
          try {
            const { error } = await deleteExpensePurchase(id);
            if (error) throw error;
            
            showSuccess('Purchase deleted');
            await refreshData();
          } catch (error) {
            showError(error instanceof Error ? error.message : 'Failed to delete purchase');
          }
        }}
      />
    </View>
  );
}

// Budget Modal Component
interface BudgetModalProps {
  visible: boolean;
  onClose: () => void;
  expenseTypes: ExpenseType[];
  expenseBudgets: ExpenseBudget[];
  onSuccess: (data: { expense_type_id: string; amount: number; start_date: string }) => void;
}

function BudgetModal({ visible, onClose, expenseTypes, expenseBudgets, onSuccess }: BudgetModalProps) {
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (visible) {
      console.log('Budget types:', expenseTypes);
      setSelectedTypeId(null);
      setAmount('');
    }
  }, [visible, expenseTypes]);

  useEffect(() => {
    if (selectedTypeId) {
      const existingBudget = expenseBudgets.find(b => b.expense_type_id === selectedTypeId);
      if (existingBudget) {
        setAmount(existingBudget.amount.toString());
      } else {
        setAmount('');
      }
    }
  }, [selectedTypeId, expenseBudgets]);

  const handleSave = () => {
    if (!selectedTypeId || !amount) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) return;

    onSuccess({
      expense_type_id: selectedTypeId,
      amount: parsedAmount,
      start_date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const pickerItems = expenseTypes.map(type => ({
    label: type.name,
    value: type.id,
  }));

  console.log('[PickerItems]: ', pickerItems);

  const handleClose = () => {
    setSelectedTypeId(null);
    setAmount('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Set Budget</Text>
          <TouchableOpacity onPress={handleSave} disabled={!selectedTypeId || !amount}>
            <Text style={[styles.saveButton, (!selectedTypeId || !amount) && styles.disabledButton]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          <View style={styles.inputGroup}>
            <SelectPicker
              label="Expense Type"
              value={selectedTypeId || ''}
              onValueChange={setSelectedTypeId}
              items={pickerItems}
              placeholder="Select expense type..."
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Budget Amount</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Purchase Modal Component
interface PurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  expenseTypes: ExpenseType[];
  onSuccess: (data: { expense_type_id: string; amount: number; date: string; notes?: string }) => void;
}

function PurchaseModal({ visible, onClose, expenseTypes, onSuccess }: PurchaseModalProps) {
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      setSelectedTypeId(null);
      setAmount('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setNotes('');
    }
  }, [visible]);

  const handleSave = () => {
    if (!selectedTypeId || !amount || !date) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) return;

    onSuccess({
      expense_type_id: selectedTypeId,
      amount: parsedAmount,
      date,
      notes: notes.trim() || undefined,
    });
  };

  const pickerItems = expenseTypes.map(type => ({
    label: type.name,
    value: type.id,
  }));

  const handleClose = () => {
    setSelectedTypeId(null);
    setAmount('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setNotes('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Purchase</Text>
          <TouchableOpacity onPress={handleSave} disabled={!selectedTypeId || !amount || !date}>
            <Text style={[styles.saveButton, (!selectedTypeId || !amount || !date) && styles.disabledButton]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          <View style={styles.inputGroup}>
            <SelectPicker
              label="Expense Type"
              value={selectedTypeId || ''}
              onValueChange={setSelectedTypeId}
              items={pickerItems}
              placeholder="Select expense type..."
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes..."
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Purchase List Modal Component
interface PurchaseListModalProps {
  visible: boolean;
  onClose: () => void;
  expenseType: ExpenseType | null;
  purchases: ExpensePurchase[];
  onDelete: (id: string) => void;
}

function PurchaseListModal({ visible, onClose, expenseType, purchases, onDelete }: PurchaseListModalProps) {
  const formatAmount = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDate = (dateStr: string) => format(new Date(dateStr), 'MMM d, yyyy');

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {expenseType?.name || 'Purchases'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#2c3e50" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.purchaseList}>
            {purchases.length === 0 ? (
              <View style={styles.emptyPurchaseList}>
                <Text style={styles.emptyPurchaseText}>No purchases yet</Text>
              </View>
            ) : (
              purchases.map((purchase) => (
                <View key={purchase.id} style={styles.purchaseItem}>
                  <View style={styles.purchaseItemLeft}>
                    <Text style={styles.purchaseDate}>
                      {formatDate(purchase.date)}
                    </Text>
                    {purchase.notes && (
                      <Text style={styles.purchaseNotes}>{purchase.notes}</Text>
                    )}
                  </View>
                  <View style={styles.purchaseItemRight}>
                    <Text style={styles.purchaseAmount}>
                      {formatAmount(purchase.amount)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => onDelete(purchase.id)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.closeButton]}
              onPress={onClose}
            >
              <Text style={styles.saveButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecf0f1',
  },
  header: {
    backgroundColor: '#2c3e50',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#7f8c8d',
    marginTop: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 8,
  },
  expenseRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expenseRowContent: {
    flex: 1,
  },
  expenseTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  expenseAmount: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '500',
  },
  overBudget: {
    color: '#e74c3c',
  },
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
  title: {
    fontSize: 18,
    fontWeight: '600',
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
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  bottomSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheetContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  modalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
  },
  cancelButtonText: {
    color: '#7f8c8d',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3498db',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#2c3e50',
    flex: 1,
  },
  purchaseList: {
    maxHeight: 400,
    padding: 20,
  },
  emptyPurchaseList: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyPurchaseText: {
    fontSize: 16,
    color: '#95a5a6',
  },
  purchaseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  purchaseItemLeft: {
    flex: 1,
  },
  purchaseDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  purchaseNotes: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  purchaseItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  purchaseAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#27ae60',
  },
  deleteButton: {
    padding: 4,
  },
});
