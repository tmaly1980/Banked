import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BillModel } from '@/models/BillModel';
import { format, isAfter, isBefore, startOfDay, addDays } from 'date-fns';

interface BillsProps {
  bills: BillModel[];
  onBillPress: (bill: BillModel) => void;
}

export default function Bills({ bills, onBillPress }: BillsProps) {
  const [laterExpanded, setLaterExpanded] = useState(true);

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
    return '--/--';
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
    
    return (
      <TouchableOpacity
        key={bill.id}
        style={styles.billRow}
        onPress={() => onBillPress(bill)}
      >
        <Text style={styles.billDate}>{formatBillDate(bill)}</Text>
        <Text style={styles.billName} numberOfLines={1}>{bill.name}</Text>
        <Text style={[
          styles.billAmount,
          hasPartialPayment && styles.billAmountPartial
        ]}>
          ${(bill.remaining_amount || bill.amount).toFixed(2)}
        </Text>
        <Text style={styles.billStatus}></Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
      {/* Overdue Bills */}
      {groupedBills.overdue.length > 0 && (
        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.overdueHeader]}>
            <Ionicons name="warning" size={20} color="#e74c3c" />
            <Text style={[styles.sectionTitle, styles.overdueTitle]}>
              Overdue ({groupedBills.overdue.length})
            </Text>
          </View>
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
          </View>
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ecf0f1',
    gap: 8,
  },
  overdueHeader: {
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
    gap: 12,
  },
  billDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
    width: 50,
  },
  billName: {
    flex: 1,
    fontSize: 15,
    color: '#2c3e50',
  },
  billAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    width: 80,
    textAlign: 'right',
  },
  billAmountPartial: {
    color: '#e67e22',
  },
  billStatus: {
    fontSize: 13,
    fontWeight: '600',
    width: 60,
    textAlign: 'right',
  },
});
