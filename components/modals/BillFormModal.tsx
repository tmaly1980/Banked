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
  Switch,
  Alert,
} from 'react-native';
import { InlineAlert } from '@/components/InlineAlert';
import { useInlineAlert } from '@/hooks/useInlineAlert';
import { useBills } from '@/contexts/BillsContext';
import { BillModel } from '@/models/BillModel';
import BillDatePicker from '@/components/BillDatePicker';
import MonthYearInput from '@/components/MonthYearInput';
import DayOrDateInput from '@/components/DayOrDateInput';
import CategoryDropdown from '@/components/CategoryDropdown';
import AmountInput from '@/components/AmountInput';
import PillPicker from '@/components/PillPicker';
import { dateToTimestamp, timestampToDate } from '@/lib/dateUtils';
import { globalStyles } from '@/lib/globalStyles';
import { format } from 'date-fns';

interface BillFormModalProps {
  visible: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  editingBill?: BillModel | null;
}

export default function BillFormModal({
  visible,
  onClose,
  onSuccess,
  editingBill,
}: BillFormModalProps) {
  const { alert, showError, showSuccess, hideAlert } = useInlineAlert();
  const { createBill, updateBill, deleteBill, createBillStatement } = useBills();
  const [name, setName] = useState(editingBill?.name || '');
  const [amount, setAmount] = useState(editingBill?.amount?.toString() || '');
  const [dueDate, setDueDate] = useState(editingBill?.due_date || '');
  const [dueDay, setDueDay] = useState(editingBill?.due_day?.toString() || '');
  const [categoryId, setCategoryId] = useState<string | null>(editingBill?.category_id || null);
  const [notes, setNotes] = useState(editingBill?.notes || '');
  const [isRecurring, setIsRecurring] = useState(!!editingBill?.due_day);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startMonthYear, setStartMonthYear] = useState<string | null>(editingBill?.start_month_year || null);
  const [endMonthYear, setEndMonthYear] = useState<string | null>(editingBill?.end_month_year || null);
  const [isVariable, setIsVariable] = useState(editingBill?.is_variable || false);
  const [balance, setBalance] = useState('');
  const [minimumDue, setMinimumDue] = useState('');

  // Auto-hide alert when form values change
  useEffect(() => {
    if (alert.visible) {
      hideAlert();
    }
  }, [name, amount, dueDate, dueDay, categoryId, notes, isRecurring]);

  const resetForm = () => {
    setName('');
    setAmount('');
    setDueDate('');
    setDueDay('');
    setCategoryId(null);
    setNotes('');
    setIsRecurring(false);
    setStartMonthYear(null);
    setEndMonthYear(null);
    setIsVariable(false);
    setBalance('');
    setMinimumDue('');
  };

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const validateForm = () => {
    if (!name.trim()) {
      showError('Please enter a name');
      return false;
    }
    
    if (isVariable) {
      // For variable bills, balance is optional (can be set later via statements)
      if (balance.trim()) {
        const balanceNum = parseFloat(balance);
        if (isNaN(balanceNum) || balanceNum <= 0) {
          showError('Please enter a valid balance');
          return false;
        }
      }
    } else {
      // For fixed bills, amount is optional (useful for bills with changing amounts)
      if (amount.trim()) {
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
          showError('Please enter a valid amount');
          return false;
        }
      }
    }

    if (isRecurring && dueDay) {
      const dayNum = parseInt(dueDay);
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
        showError('Please enter a valid due day (1-31)');
        return false;
      }
    }

    return true;
  };

  const getDueDateDisplay = () => {
    if (isRecurring && dueDay) {
      return `Every ${dueDay}${getDaySuffix(parseInt(dueDay))}`;
    } else if (dueDate) {
      return format(new Date(dueDate), 'MMM d, yyyy');
    }
    return 'Select due date';
  };

  const getDaySuffix = (day: number) => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, 'MMMM yyyy');
  };

  const handleDateSelect = (date: string) => {
    setDueDate(date);
    setDueDay('');
    setShowDatePicker(false);
  };

  const handleDaySelect = (day: number, selectedMonth?: Date) => {
    setDueDay(day.toString());
    setDueDate('');
    // Auto-set start_month_year to the month being viewed when selecting recurring day
    if (selectedMonth) {
      const monthYear = format(selectedMonth, 'yyyy-MM');
      setStartMonthYear(monthYear);
    }
    setShowDatePicker(false);
  };

  const handleClearDate = () => {
    setDueDate('');
    setDueDay('');
    setShowDatePicker(false);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const amountNum = isVariable ? null : parseFloat(amount);
      const hasDueDate = isRecurring ? !!dueDay : !!dueDate;
      const billData = {
        name: name.trim(),
        amount: amountNum,
        due_date: isRecurring ? null : (dueDate ? dateToTimestamp(dueDate) : null),
        due_day: isRecurring ? (dueDay ? parseInt(dueDay) : null) : null,
        category_id: categoryId || null,
        deferred_flag: !hasDueDate,
        notes: notes.trim() || undefined,
        start_month_year: startMonthYear || null,
        end_month_year: endMonthYear || null,
        is_variable: isVariable,
      };

      let billId = editingBill?.id;
      if (editingBill) {
        const { error } = await updateBill(editingBill.id, billData);
        if (error) throw error;
      } else {
        const { data, error } = await createBill(billData);
        if (error) throw error;
        billId = data?.id;
      }

      // Create bill statement for variable bills
      if (isVariable && billId && balance) {
        const { error: stmtError } = await createBillStatement(
          billId,
          parseFloat(balance),
          minimumDue ? parseFloat(minimumDue) : undefined
        );
        if (stmtError) throw stmtError;
      }

      showSuccess(`Bill ${editingBill ? 'updated' : 'added'} successfully`);
      
      resetForm();
      onSuccess?.();
      onClose?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingBill) return;

    Alert.alert(
      'Delete Bill',
      `Are you sure you want to delete "${editingBill.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await deleteBill(editingBill.id);
              if (error) throw error;
              
              showSuccess('Bill deleted successfully');
              resetForm();
              onSuccess?.();
              onClose?.();
            } catch (error) {
              showError(error instanceof Error ? error.message : 'An error occurred');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  React.useEffect(() => {
    if (visible && editingBill) {
      setName(editingBill.name);
      setIsVariable(editingBill.is_variable || false);
      
      // For variable bills, load balance and minimum due from statement
      if (editingBill.is_variable) {
        setBalance(editingBill.statement_balance?.toString() || '');
        setMinimumDue(editingBill.statement_minimum_due?.toString() || '');
        setAmount(''); // Clear amount for variable bills
      } else {
        setAmount(editingBill.amount?.toString() || '');
        setBalance('');
        setMinimumDue('');
      }
      
      setDueDate(editingBill.due_date ? timestampToDate(editingBill.due_date) : '');
      setDueDay(editingBill.due_day?.toString() || '');
      setCategoryId(editingBill.category_id || null);
      setNotes(editingBill.notes || '');
      setIsRecurring(!!editingBill.due_day);
      setStartMonthYear(editingBill.start_month_year || null);
      setEndMonthYear(editingBill.end_month_year || null);
    }
  }, [visible, editingBill]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={globalStyles.modalContainer}
      >
        <View style={globalStyles.modalHeader}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={globalStyles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={globalStyles.modalTitle}>
            {editingBill ? 'Edit' : 'Add'} Bill
          </Text>
          {editingBill ? (
            <TouchableOpacity onPress={handleDelete} disabled={loading}>
              <Text style={[styles.deleteLink, loading && globalStyles.disabledButton]}>
                Delete
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 50 }} />
          )}
        </View>

        <ScrollView style={globalStyles.form}>
          <InlineAlert
            type={alert.type}
            message={alert.message}
            visible={alert.visible}
            onDismiss={hideAlert}
          />

          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.label}>Bill Name</Text>
            <TextInput
              style={globalStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="Electric Bill, Rent, etc."
            />
          </View>

          {/* Bill Type Toggle */}
          <View style={globalStyles.inputGroup}>
            <PillPicker
              options={[
                { label: 'Fixed', value: 'fixed' as const },
                { label: 'Variable', value: 'variable' as const }
              ]}
              value={isVariable ? 'variable' : 'fixed'}
              onChange={(value) => setIsVariable(value === 'variable')}
            />
          </View>

          <View style={styles.rowInputGroup}>
            <View style={styles.halfInputGroup}>
              <Text style={globalStyles.label}>{isVariable ? 'Current Balance' : 'Amount'}</Text>
              <AmountInput
                style={globalStyles.input}
                value={isVariable ? balance : amount}
                onChangeText={isVariable ? setBalance : setAmount}
                placeholder="0.00"
              />
            </View>

            <View style={styles.halfInputGroup}>
              <Text style={globalStyles.label}>Due Date</Text>
              <DayOrDateInput
                value={isRecurring && dueDay ? parseInt(dueDay) : dueDate}
                isRecurring={isRecurring}
                onPress={() => setShowDatePicker(true)}
                placeholder="Select due date"
                startMonthYear={startMonthYear}
              />
            </View>
          </View>

          {/* Minimum Due for Variable Bills */}
          {isVariable && (
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Minimum Due</Text>
              <AmountInput
                style={globalStyles.input}
                value={minimumDue}
                onChangeText={setMinimumDue}
                placeholder="0.00"
              />
            </View>
          )}

          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.label}>Category</Text>
            <CategoryDropdown
              selectedCategoryId={categoryId}
              onSelectCategory={setCategoryId}
            />
          </View>

          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.label}>Notes</Text>
            <TextInput
              style={[globalStyles.input, globalStyles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes or reminders..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View style={styles.saveFooter}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : (editingBill ? 'Save Changes' : 'Add Bill')}
            </Text>
          </TouchableOpacity>
        </View>

        <BillDatePicker
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onSelectDate={handleDateSelect}
          onSelectDay={handleDaySelect}
          onClear={handleClearDate}
          isRecurring={isRecurring}
          onToggleRecurring={setIsRecurring}
          selectedDate={dueDate}
          selectedDay={dueDay ? parseInt(dueDay) : undefined}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rowInputGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  halfInputGroup: {
    flex: 1,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  dateInputText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  dateInputPlaceholder: {
    color: '#95a5a6',
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  saveFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  saveButton: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteLink: {
    fontSize: 17,
    color: '#e74c3c',
    fontWeight: '600',
  },
  setDateLink: {
    fontSize: 16,
    color: '#3498db',
    paddingVertical: 8,
  },
  setEndDateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
});