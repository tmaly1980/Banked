import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Paycheck } from '@/types';
import { format } from 'date-fns';

interface WeeklyPaycheckGroupProps {
  startDate: Date;
  endDate: Date;
  paychecks: Paycheck[];
  total: number;
  onViewPaycheck: (paycheck: Paycheck) => void;
  onEditPaycheck: (paycheck: Paycheck) => void;
  onDeletePaycheck: (paycheck: Paycheck) => void;
}

export default function WeeklyPaycheckGroup({
  startDate,
  endDate,
  paychecks,
  total,
  onViewPaycheck,
  onEditPaycheck,
  onDeletePaycheck,
}: WeeklyPaycheckGroupProps) {
  const formatWeekLabel = (startDate: Date, endDate: Date): string => {
    const start = format(startDate, 'MMM d');
    const end = format(endDate, 'MMM d');
    return `${start} - ${end}`;
  };

  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <View style={styles.container}>
      {/* Week Header */}
      <Text style={styles.weekLabel}>
        {formatWeekLabel(startDate, endDate)}
      </Text>

      {/* Card */}
      <View style={styles.card}>
        {/* Week Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalAmount}>
            {formatAmount(total)}
          </Text>
        </View>

        {/* Paychecks List */}
        <View style={styles.paychecksList}>
          {paychecks.map((paycheck) => (
            <TouchableOpacity
              key={paycheck.id}
              style={styles.paycheckItem}
              onPress={() => onViewPaycheck(paycheck)}
              onLongPress={() => Alert.alert(
                'Paycheck Actions',
                'Choose an action:',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Edit', onPress: () => onEditPaycheck(paycheck) },
                  { text: 'Delete', style: 'destructive', onPress: () => onDeletePaycheck(paycheck) },
                ]
              )}
            >
              <View style={styles.paycheckRow}>
                <Text style={styles.paycheckDate}>
                  {paycheck.date ? format(new Date(paycheck.date), 'MMM d') : 'No date'}
                </Text>
                <Text style={styles.paycheckName} numberOfLines={1}>
                  {paycheck.name || 'Paycheck'}
                </Text>
                <Text style={styles.paycheckAmount}>
                  {formatAmount(paycheck.amount)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  weekLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#27ae60',
  },
  paychecksList: {
    gap: 0,
  },
  paycheckItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  paycheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paycheckDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    width: 50,
  },
  paycheckName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    flex: 1,
  },
  paycheckAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27ae60',
  },
});
