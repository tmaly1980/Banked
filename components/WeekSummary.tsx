import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format, parseISO } from 'date-fns';
import { formatDollar } from '@/lib/utils';
import { BillModel } from '@/models/BillModel';

interface IncomeSource {
  source_name: string;
  income_date: string;
  amount: number;
}

interface WeekSummaryProps {
  title: string;
  income: number;
  bills: BillModel[];
  total: number;
  incomeBreakdown: IncomeSource[];
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default function WeekSummary({ title, income, bills, total, incomeBreakdown, isExpanded, onToggleExpand }: WeekSummaryProps) {
  const net = income - total;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.cardRow}
          onPress={onToggleExpand}
        >
          <Text style={styles.cardLabel}>Income</Text>
          <Text style={[styles.cardValue, { color: '#27ae60' }]}>
            {formatDollar(income, true)}
          </Text>
        </TouchableOpacity>
        
        {isExpanded && incomeBreakdown.length > 0 && (
          <View style={styles.breakdownContainer}>
            {incomeBreakdown.map((source, index) => (
              <View key={index} style={styles.breakdownItem}>
                <View style={styles.breakdownInfo}>
                  <Text style={styles.breakdownName}>{source.source_name}</Text>
                  <Text style={styles.breakdownDate}>
                    {format(parseISO(source.income_date), 'MMM d')}
                  </Text>
                </View>
                <Text style={styles.breakdownAmount}>
                  {formatDollar(source.amount, true)}
                </Text>
              </View>
            ))}
          </View>
        )}
        
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Bills Due</Text>
          <Text style={styles.cardValue}>{formatDollar(total)}</Text>
        </View>
        {bills.length > 0 && (
          <>
            <View style={styles.divider} />
            {bills.map((bill, index) => (
              <View key={bill.id}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.billItem}>
                  <View style={styles.billInfo}>
                    <Text style={styles.billName}>{bill.name}</Text>
                    <Text style={styles.billDueDate}>
                      Due {format(parseISO(bill.next_due_date!), 'MMM d')}
                    </Text>
                  </View>
                  <Text style={styles.billAmount}>
                    {formatDollar(
                      bill.is_variable 
                        ? (bill.statement_minimum_due || bill.updated_balance || bill.statement_balance || 0)
                        : (bill.remaining_amount || bill.amount || 0)
                    )}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
        {bills.length === 0 && (
          <Text style={styles.emptyText}>No bills due this period</Text>
        )}
        <View style={[styles.cardRow, styles.cardRowTotal]}>
          <Text style={styles.cardLabelBold}>Net</Text>
          <Text style={[styles.cardValueBold, { color: net >= 0 ? '#27ae60' : '#e74c3c' }]}>
            {formatDollar(net, true)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  cardRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    marginTop: 8,
    paddingTop: 16,
  },
  cardLabel: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  cardLabelBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  cardValueBold: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  billDueDate: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  billAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  divider: {
    height: 1,
    backgroundColor: '#ecf0f1',
    marginVertical: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  breakdownContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 16,
  },
  breakdownInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownName: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  breakdownDate: {
    fontSize: 12,
    color: '#95a5a6',
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#27ae60',
  },
});
