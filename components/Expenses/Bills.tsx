import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BillModel } from '@/models/BillModel';
import { formatDollar } from '@/lib/utils';
import { format, isAfter, isBefore, startOfDay, addDays } from 'date-fns';
import DayOrDateInput from '@/components/DayOrDateInput';
import BillDatePicker from '@/components/BillDatePicker';
import UndatedBillsAccordion from '@/components/Bills/UndatedBillsAccordion';

interface BillsProps {
  bills: BillModel[];
  onBillPress: (bill: BillModel) => void;
  onAddBill?: (bill: { name: string; amount?: number | null; due_date?: string; due_day?: number }) => Promise<void>;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

export default function Bills({ bills, onBillPress, onAddBill, onRefresh, loading }: BillsProps) {
  const [undatedExpanded, setUndatedExpanded] = useState(true);
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
          setUndatedExpanded(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Failed to load accordion state:', error);
      }
    };
    loadAccordionState();
  }, []);

  // Save accordion state when it changes
  const toggleUndatedExpanded = async () => {
    const newState = !undatedExpanded;
    setUndatedExpanded(newState);
    try {
      await AsyncStorage.setItem('bills_later_expanded', JSON.stringify(newState));
    } catch (error) {
      console.error('Failed to save accordion state:', error);
    }
  };

  const handleAddInlineBill = async () => {
    if (!onAddBill || isAdding) return;
    
    const name = inlineBillName.trim();
    const amount = inlineBillAmount.trim() ? parseFloat(inlineBillAmount) : null;
    
    if (!name) {
      return;
    }
    
    // If amount is provided, validate it's a valid positive number
    if (amount !== null && (isNaN(amount) || amount <= 0)) {
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
    const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0); // Last day of next month
    const overdue: BillModel[] = [];
    const upcoming: BillModel[] = [];
    const later: BillModel[] = [];

    bills.forEach(bill => {
      if (!bill.next_due_date) {
        // Bills without dates go to "Later"
        later.push(bill);
      } else {
        const nextDueDate = startOfDay(new Date(bill.next_due_date));
        
        // A bill is only overdue if it's BEFORE today (not including today)
        if (nextDueDate < today) {
          overdue.push(bill);
        } else if (nextDueDate <= endOfNextMonth) {
          // Bills due today through end of next month
          upcoming.push(bill);
        } else {
          later.push(bill);
        }
      }
    });

    // Group upcoming bills by month
    const upcomingByMonth: { [key: string]: BillModel[] } = {};
    upcoming.forEach(bill => {
      const [year, month] = bill.next_due_date!.split('-');
      const monthKey = `${year}-${month}`;
      if (!upcomingByMonth[monthKey]) {
        upcomingByMonth[monthKey] = [];
      }
      upcomingByMonth[monthKey].push(bill);
    });

    // Sort bills within each month by date
    Object.keys(upcomingByMonth).forEach(monthKey => {
      upcomingByMonth[monthKey].sort((a, b) => {
        if (!a.next_due_date || !b.next_due_date) return 0;
        return a.next_due_date.localeCompare(b.next_due_date);
      });
    });

    // Sort overdue bills by date (oldest first)
    overdue.sort((a, b) => {
      if (!a.next_due_date || !b.next_due_date) return 0;
      return a.next_due_date.localeCompare(b.next_due_date);
    });

    return { overdue, upcoming, upcomingByMonth, later };
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

  const isBillDeferredForMonth = (bill: BillModel): boolean => {
    if (!bill.deferred_months || bill.deferred_months.length === 0 || !bill.next_due_date) {
      return false;
    }
    // Get the month-year of the bill's next_due_date
    const [year, month] = bill.next_due_date.split('-');
    const billMonthYear = `${year}-${month}`;
    return bill.deferred_months.includes(billMonthYear);
  };

  const getUrgencyColor = (bill: BillModel): string | null => {
    if (!bill.is_deferred_active) return null;
    
    const today = startOfDay(new Date());
    
    if (bill.loss_date) {
      const lossDate = startOfDay(new Date(bill.loss_date));
      const daysUntilLoss = Math.ceil((lossDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilLoss < 7) {
        return '#e74c3c'; // Red if < 7 days to loss
      } else if (daysUntilLoss < 15) {
        return '#e67e22'; // Orange if < 15 days to loss
      }
    }
    
    if (bill.decide_by_date && !bill.loss_date) {
      const decideBy = startOfDay(new Date(bill.decide_by_date));
      const daysUntilDecision = Math.ceil((decideBy.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDecision < 7 && daysUntilDecision >= 0) {
        return '#3498db'; // Blue if < 7 days to decide_by
      }
    }
    
    return null;
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
    console.log(`[Bill Data] ${bill.name}:`, {
      next_due_date: bill.next_due_date,
      active_deferred_months: bill.active_deferred_months,
      decide_by_dates: bill.decide_by_dates,
      loss_dates: bill.loss_dates
    });
    
    const hasPartialPayment = bill.remaining_amount !== undefined && 
                              bill.remaining_amount > 0 &&
                              bill.amount !== null &&
                              bill.remaining_amount < bill.amount;
    const isOverdue = bill.is_overdue;
    const isDeferred = isBillDeferredForMonth(bill);
    
    // Check if this bill's month is in the active_deferred_months list
    // OR if the previous month was deferred (showing "pushed forward" state)
    const isActiveDeferral = bill.active_deferred_months && bill.next_due_date && (() => {
      const [billYear, billMonth] = bill.next_due_date.split('-');
      const billMonthYear = `${billYear}-${billMonth}`;
      
      // Check if current month is deferred
      if (bill.active_deferred_months.includes(billMonthYear)) {
        return true;
      }
      
      // Check if previous month was deferred (bill pushed to this month)
      const billDate = new Date(parseInt(billYear), parseInt(billMonth) - 1, 1);
      const prevMonthDate = new Date(billDate.getFullYear(), billDate.getMonth() - 1, 1);
      const prevMonthYear = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
      
      const result = bill.active_deferred_months.includes(prevMonthYear);
      console.log(`[Deferral Debug] ${bill.name}: active_deferred_months=${JSON.stringify(bill.active_deferred_months)}, next_due_date=${bill.next_due_date}, billMonthYear=${billMonthYear}, prevMonthYear=${prevMonthYear}, result=${result}`);
      return result;
    })();
    
    // Calculate urgency color for deferred bills
    let urgencyColor: string | null = null;
    if (isActiveDeferral && bill.active_deferred_months && bill.next_due_date) {
      const today = startOfDay(new Date());
      const [billYear, billMonth] = bill.next_due_date.split('-');
      const billMonthYear = `${billYear}-${billMonth}`;
      const monthIndex = bill.active_deferred_months.indexOf(billMonthYear);
      
      if (monthIndex >= 0) {
        // Get the corresponding decide_by_date and loss_date for this month
        const lossDate = bill.loss_dates?.[monthIndex];
        const decideByDate = bill.decide_by_dates?.[monthIndex];
        
        if (lossDate) {
          const lossDateObj = startOfDay(new Date(lossDate));
          const daysUntilLoss = Math.ceil((lossDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilLoss < 7) {
            urgencyColor = '#e74c3c'; // Red if < 7 days to loss
          } else if (daysUntilLoss < 15) {
            urgencyColor = '#e67e22'; // Orange if < 15 days to loss
          }
        } else if (decideByDate) {
          const decideBy = startOfDay(new Date(decideByDate));
          const daysUntilDecision = Math.ceil((decideBy.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilDecision < 7 && daysUntilDecision >= 0) {
            urgencyColor = '#3498db'; // Blue if < 7 days to decide_by
          }
        }
      }
    }
    
    // For variable bills:
    // - First instance (current/overdue): use minimum due
    // - Second instance (next month): use balance - minimum (estimate)
    let displayAmount: number;
    if (bill.is_variable) {
      if (bill.next_due_date) {
        const nextDueDate = new Date(bill.next_due_date);
        const today = new Date();
        const isCurrentMonth = nextDueDate.getMonth() === today.getMonth() && 
                               nextDueDate.getFullYear() === today.getFullYear();
        const isNextMonth = !isCurrentMonth && !bill.is_overdue;
        
        if (isNextMonth && bill.statement_balance && bill.statement_minimum_due) {
          // Second instance - estimate as balance - minimum
          displayAmount = Math.max(0, bill.statement_balance - bill.statement_minimum_due);
        } else {
          // First instance (current/overdue) - use minimum due
          displayAmount = bill.statement_minimum_due || bill.updated_balance || bill.statement_balance || 0;
        }
      } else {
        displayAmount = bill.statement_minimum_due || bill.updated_balance || bill.statement_balance || 0;
      }
    } else {
      displayAmount = bill.remaining_amount || bill.amount || 0;
    }
    

    console.log('Rendering bill:', bill.name, 'Amount:', displayAmount, 'Variable:', bill.is_variable, 'Partial Payment:', hasPartialPayment);

    return (
      <TouchableOpacity
        key={`${bill.id}-${bill.next_due_date}`}
        style={[
          styles.billRow,
          isActiveDeferral && styles.deferredBillRow
        ]}
        onPress={() => onBillPress(bill)}
      >
        <View style={styles.dateContainer}>
          <Text style={[
            styles.billDate, 
            isOverdue && styles.overdueText, 
            bill.alert_flag && { fontWeight: '700' },
            urgencyColor && { color: urgencyColor }
          ]}>{bill.alert_flag} {formatBillDate(bill)}</Text>
          {isActiveDeferral && (
            <Ionicons name="pause-outline" size={16} color={urgencyColor || "#95a5a6"} style={styles.statusIcon} />
          )}
          {isOverdue && !isActiveDeferral && (
            <Ionicons name="time-outline" size={16} color="#e74c3c" style={styles.statusIcon} />
          )}
          {bill.alert_flag && (
            <Ionicons name="warning-outline" size={16} color="#e67e22" style={styles.statusIcon} />
          )}
        </View>
        <View style={styles.billNameContainer}>
          <Text style={[
            styles.billName, 
            isDeferred && { color: '#95a5a6' }, 
            isOverdue && !isActiveDeferral && styles.overdueText, 
            bill.alert_flag && { fontWeight: '700' },
            urgencyColor && { color: urgencyColor }
          ]} numberOfLines={1}>{bill.name}</Text>
          {bill.urgent_note && (
            <View style={styles.urgentNoteContainer}>
              <MaterialCommunityIcons name="alert-outline" size={14} color="#e67e22" />
              <Text style={styles.urgentNoteText} numberOfLines={1}>{bill.urgent_note}</Text>
            </View>
          )}
        </View>
        <Text style={[
          styles.billAmount,
          isDeferred && { color: '#95a5a6' },
          hasPartialPayment && styles.billAmountPartial,
          isOverdue && !isActiveDeferral && styles.overdueText,
          bill.alert_flag && { fontWeight: '700' },
          urgencyColor && { color: urgencyColor }
        ]}>
          {formatDollar(displayAmount)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={loading || false} onRefresh={onRefresh} />
          ) : undefined
        }
      >
      {/* Overdue Bills (no header, just rows) */}
      {groupedBills.overdue.length > 0 && (
        <View style={styles.section}>
          {groupedBills.overdue.map(renderBillRow)}
        </View>
      )}

      {/* Upcoming Bills - Grouped by Month */}
      {Object.keys(groupedBills.upcomingByMonth).length > 0 && (
        <View style={styles.section}>
          {Object.entries(groupedBills.upcomingByMonth)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([monthKey, monthBills]) => {
              const [year, month] = monthKey.split('-');
              const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
              const monthLabel = format(monthDate, 'MMM yyyy');
              
              const monthTotal = monthBills.reduce((sum, bill) => {
                let amount: number;
                if (bill.is_variable) {
                  if (bill.next_due_date) {
                    const nextDueDate = new Date(bill.next_due_date);
                    const today = new Date();
                    const isCurrentMonth = nextDueDate.getMonth() === today.getMonth() && 
                                           nextDueDate.getFullYear() === today.getFullYear();
                    const isNextMonth = !isCurrentMonth && !bill.is_overdue;
                    
                    if (isNextMonth && bill.statement_balance && bill.statement_minimum_due) {
                      amount = Math.max(0, bill.statement_balance - bill.statement_minimum_due);
                    } else {
                      amount = bill.statement_minimum_due || bill.updated_balance || bill.statement_balance || 0;
                    }
                  } else {
                    amount = bill.statement_minimum_due || bill.updated_balance || bill.statement_balance || 0;
                  }
                } else {
                  amount = bill.remaining_amount || bill.amount || 0;
                }
                return sum + amount;
              }, 0);
              
              return (
                <View key={monthKey}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                      {monthLabel} ({monthBills.length})
                    </Text>
                    <Text style={styles.sectionTotal}>
                      {formatDollar(monthTotal)}
                    </Text>
                  </View>
                  {monthBills.map(renderBillRow)}
                </View>
              );
            })}
        </View>
      )}
      </ScrollView>

      {/* Fixed Footer Accordions */}
      <View style={styles.footerAccordions}>
        {/* Undated Bills Accordion */}
        {groupedBills.later.length > 0 && (
          <UndatedBillsAccordion
            undatedBills={groupedBills.later}
            onViewBill={onBillPress}
            onEditBill={onBillPress}
            onDeleteBill={onBillPress}
          />
        )}
      </View>
      
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
  sectionTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498db',
    marginLeft: 'auto',
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
  deferredBillRow: {
    backgroundColor: '#f8f9fa',
  },
  dateContainer: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    paddingRight: 12,
  },
  statusIcon: {
    flexShrink: 0,
  },
  billDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  billNameContainer: {
    flex: 6,
  },
  billName: {
    fontSize: 15,
    color: '#2c3e50',
  },
  urgentNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  urgentNoteText: {
    fontSize: 12,
    color: '#e67e22',
    fontWeight: '500',
    flex: 1,
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
  footerAccordions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
