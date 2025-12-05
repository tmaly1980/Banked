import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Paycheck } from '@/types';
import { format } from 'date-fns';
import WeeklyCard from '@/components/WeeklyCard';
import { formatAmount } from '@/lib/utils';

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

  const subheading = (
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>Total:</Text>
      <Text style={styles.totalAmount}>
        {formatAmount(total)}
      </Text>
    </View>
  );

  return (
    <WeeklyCard
      title={formatWeekLabel(startDate, endDate)}
      subheading={subheading}
    >
      {/* Paychecks List */}
      <View style={styles.paychecksList}>
        {paychecks
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map((paycheck) => (
          <TouchableOpacity
            key={paycheck.id}
            style={styles.paycheckItem}
            onPress={() => onEditPaycheck(paycheck)}
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
    </WeeklyCard>
  );
}

const styles = StyleSheet.create({
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  paychecksList: {
    paddingHorizontal: 16,
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
