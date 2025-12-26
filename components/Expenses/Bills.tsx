import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BillModel } from '@/models/BillModel';
import { format, isAfter, isBefore, startOfDay, addDays } from 'date-fns';
import DayOrDateInput from '@/components/DayOrDateInput';
import BillDatePicker from '@/components/BillDatePicker';

interface BillsProps {
  bills: BillModel[];
  onBillPress: (bill: BillModel) => void;
  onAddBill?: (bill: { name: string; amount: number; due_date?: string; due_day?: number }) => Promise<void>;
}

export default function Bills({ bills, onBillPress, onAddBill }: BillsProps) {
  const [laterExpanded, setLaterExpanded] = useState(true);
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [inlineBillDate, setInlineBillDate] = useState<string>('');
  const [inlineBillDay, setInlineBillDay] = useState<number | undefined>(undefined);
  const [inlineBillName, setInlineBillName] = useState('');
  const [inlineBillAmount, setInlineBillAmount] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  const nameInputRef = useRef<TextInput>(null);
  const amountInputRef = useRef<TextInput>(null);

  // Load saved accordion state on mount
  useEffect(() => {
    const loadAccordionState = async () => {
      try {
        const saved = await AsyncStorage.getItem('bills_later_expanded');
        if (saved !== null) {
          setLaterExpanded(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Failed to load accordion state:', error);
      }
    };
    loadAccordionState();
  }, []);

  // Save accordion state when it changes
  const toggleLaterExpanded = async () => {
    const newState = !laterExpanded;
    setLaterExpanded(newState);
    try {
      await AsyncStorage.setItem('bills_later_expanded', JSON.stringify(newState));
    } catch (error) {
      console.error('Failed to save accordion state:', error);
    }
  };

  const handleAddInlineBill = async () => {
    if (!onAddBill || isAdding) return;
    
    const name = inlineBillName.trim();
    const amount = parseFloat(inlineBillAmount);
    
    if (!name || isNaN(amount) || amount <= 0) {
      return;
    }
    
    if (!inlineBillDate && inlineBillDay === undefined) {
      return;
    }
    
    try {
      setIsAdding(true);
      await onAddBill({
        name,
        amount,
        due_date: !isRecurring && inlineBillDate ? inlineBillDate : undefined,
        due_day: isRecurring && inlineBillDay ? inlineBillDay : undefined,
      });
      
      // Clear form
      setInlineBillDate('');
      setInlineBillDay(undefined);
      setInlineBillName('');
      setInlineBillAmount('');
      setShowInlineForm(false);
      setIsRecurring(false);
    } catch (error) {
      console.error('Failed to add bill:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDateSelect = (date: string) => {
    setInlineBillDate(date);
    setInlineBillDay(undefined);
  };

  const handleDaySelect = (day: number) => {
    setInlineBillDay(day);
    setInlineBillDate('');
  };

  const handleClearDate = () => {
    setInlineBillDate('');
    setInlineBillDay(undefined);
  };

  const handleShowInlineForm = () => {
    if (showInlineForm) {
      // Hide form if already shown
      setShowInlineForm(false);
    } else {
      // Show form
      setShowInlineForm(true);
    }
  };

  const groupedBills = useMemo(() => {
    const today = startOfDay(new Date());
    const thirtyDaysFromNow = addDays(today, 30);
    const overdue: BillModel[] = [];
    const upcoming: BillModel[] = [];
    const later: BillModel[] = [];

    bills.forEach(bill => {
      // Bills with deferred flag or no due date go to "Later"
      if (bill.deferred_flag || !bill.next_due_date) {
        later.push(bill);
      } else if (bill.is_overdue) {
        overdue.push(bill);
      } else {
        // Check if bill is within next 30 days using next_due_date from SQL
        const nextDueDate = startOfDay(new Date(bill.next_due_date));
        if (nextDueDate <= thirtyDaysFromNow) {
          upcoming.push(bill);
        } else {
          later.push(bill);
        }
      }
    });

    // Overdue bills are already sorted by the SQL function
    // Upcoming bills are already sorted by the SQL function
    // No need to re-sort

    return { overdue, upcoming, later };
  }, [bills]);

  const formatBillDate = (bill: BillModel): string => {
    if (bill.next_due_date) {
      // Parse date string as local date to avoid timezone conversion
      const [year, month, day] = bill.next_due_date.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return format(date, 'MM/dd');
    }
    return '';
  };

  const getBillStatus = (bill: BillModel): string => {
    if (bill.isOverdue) return 'Overdue';
    if (bill.isPaid) return 'Paid';
    return 'Due';
  };

  const getStatusColor = (bill: BillModel): string => {
    if (bill.isOverdue) return '#e74c3c';
    if (bill.isPaid) return '#2ecc71';
    return '#f39c12';
  };

  const renderBillRow = (bill: BillModel) => {
    const hasPartialPayment = bill.remaining_amount !== undefined && 
                              bill.remaining_amount > 0 &&
                              bill.remaining_amount < bill.amount;
    const isOverdue = bill.is_overdue;
    
    return (
      <TouchableOpacity
        key={bill.id}
        style={styles.billRow}
        onPress={() => onBillPress(bill)}
      >
        <View style={styles.dateContainer}>
          {isOverdue && (
            <Ionicons name="time-outline" size={16} color="#e74c3c" style={styles.statusIcon} />
          )}
          <Text style={[styles.billDate, isOverdue && styles.overdueText]}>{formatBillDate(bill)}</Text>
        </View>
        <Text style={[styles.billName, isOverdue && styles.overdueText]} numberOfLines={1}>{bill.name}</Text>
        <Text style={[
          styles.billAmount,
          hasPartialPayment && styles.billAmountPartial,
          isOverdue && styles.overdueText
        ]}>
          ${(bill.remaining_amount || bill.amount).toFixed(2)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
      {/* Overdue Bills (no header, just rows) */}
      {groupedBills.overdue.length > 0 && (
        <View style={styles.section}>
          {groupedBills.overdue.map(renderBillRow)}
        </View>
      )}

      {/* Upcoming Bills */}
      {groupedBills.upcoming.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Upcoming ({groupedBills.upcoming.length})
            </Text>
            {onAddBill && (
              <TouchableOpacity 
                style={styles.addIcon}
                onPress={handleShowInlineForm}
              >
                <Ionicons name="add-circle-outline" size={24} color="#3498db" />
              </TouchableOpacity>
            )}
          </View>
          
          {showInlineForm && (
            <View style={styles.inlineFormRow}>
              <View style={styles.inlineDateInput}>
                <DayOrDateInput
                  value={isRecurring && inlineBillDay ? inlineBillDay : inlineBillDate}
                  isRecurring={isRecurring}
                  onPress={() => setShowDatePicker(true)}
                  placeholder="MM/DD"
                  style={styles.compactInput}
                />
              </View>
              <TextInput
                ref={nameInputRef}
                style={[styles.inlineTextInput, styles.inlineNameInput]}
                placeholder="Bill name"
                value={inlineBillName}
                onChangeText={setInlineBillName}
                returnKeyType="next"
                onSubmitEditing={() => amountInputRef.current?.focus()}
              />
              <TextInput
                ref={amountInputRef}
                style={[styles.inlineTextInput, styles.inlineAmountInput]}
                placeholder="Amount"
                value={inlineBillAmount}
                onChangeText={setInlineBillAmount}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={handleAddInlineBill}
              />
            </View>
          )}
          
          {groupedBills.upcoming.map(renderBillRow)}
        </View>
      )}

      {/* Later Bills (Accordion) */}
      {groupedBills.later.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={toggleLaterExpanded}
          >
            <Text style={styles.sectionTitle}>
              Later ({groupedBills.later.length})
            </Text>
            <Ionicons
              name={laterExpanded ? 'chevron-down' : 'chevron-forward'}
              size={24}
              color="#2c3e50"
            />
          </TouchableOpacity>
          {laterExpanded && groupedBills.later.map(renderBillRow)}
        </View>
      )}
      </ScrollView>
      
      <BillDatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={handleDateSelect}
        onSelectDay={handleDaySelect}
        onClear={handleClearDate}
        isRecurring={isRecurring}
        onToggleRecurring={setIsRecurring}
        selectedDate={inlineBillDate}
        selectedDay={inlineBillDay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ecf0f1',
    gap: 8,
  },
  addIcon: {
    marginLeft: 'auto',
  },
  overdueHeader: {
    justifyContent: 'flex-start',
    backgroundColor: '#fadbd8',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  overdueTitle: {
    color: '#e74c3c',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ecf0f1',
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    gap: 8,
  },
  dateContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  statusIcon: {
    flexShrink: 0,
  },
  billDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  billName: {
    flex: 4,
    fontSize: 15,
    color: '#2c3e50',
  },
  billAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 2,
    textAlign: 'right',
  },
  billAmountPartial: {
    color: '#e67e22',
  },
  overdueText: {
    color: '#e74c3c',
  },
  inlineFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
    gap: 4,
  },
  inlineDateInput: {
    flex: 2,
  },
  compactInput: {
    padding: 8,
    minHeight: 36,
  },
  inlineTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    backgroundColor: 'white',
    fontSize: 14,
    minHeight: 36,
  },
  inlineNameInput: {
    flex: 5,
  },
  inlineAmountInput: {
    flex: 2,
    textAlign: 'right',
  },
});
