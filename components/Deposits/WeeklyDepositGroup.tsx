import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Deposit } from '@/types';
import { format } from 'date-fns';
import WeeklyCard from '@/components/WeeklyCard';
import { formatAmount } from '@/lib/utils';

interface WeeklyDepositGroupProps {
  startDate: Date;
  endDate: Date;
  deposits: Deposit[];
  total: number;
  onViewDeposit: (deposit: Deposit) => void;
  onEditDeposit: (deposit: Deposit) => void;
  onDeleteDeposit: (deposit: Deposit) => void;
}

export default function WeeklyDepositGroup({
  startDate,
  endDate,
  deposits,
  total,
  onViewDeposit,
  onEditDeposit,
  onDeleteDeposit,
}: WeeklyDepositGroupProps) {
  const formatWeekLabel = (startDate: Date, endDate: Date): string => {
    const start = format(startDate, 'MMM d');
    const end = format(endDate, 'MMM d');
    return `${start} - ${end}`;
  };

  const subheading = (
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>Total Income:</Text>
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
      {/* Deposits List */}
      <View style={styles.depositsList}>
        {deposits
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map((deposit) => (
          <TouchableOpacity
            key={deposit.id}
            style={styles.depositItem}
            onPress={() => onEditDeposit(deposit)}
          >
            <View style={styles.depositRow}>
              <Text style={styles.depositDate}>
                {deposit.date ? format(new Date(deposit.date), 'MMM d') : 'No date'}
              </Text>
              <Text style={styles.depositName} numberOfLines={1}>
                {deposit.name || 'Deposit'}
              </Text>
              <Text style={styles.depositAmount}>
                {formatAmount(deposit.amount)}
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
  depositsList: {
    paddingHorizontal: 16,
  },
  depositItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  depositRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  depositDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    width: 50,
  },
  depositName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    flex: 1,
  },
  depositAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27ae60',
  },
});
