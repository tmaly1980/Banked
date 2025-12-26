import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BillModel } from '@/models/BillModel';
import { format } from 'date-fns';
import { formatAmount } from '@/lib/utils';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface OverdueBillsAccordionProps {
  overdueBills: BillModel[];
  onViewBill: (bill: BillModel) => void;
  onEditBill: (bill: BillModel) => void;
  onDeleteBill: (bill: BillModel) => void;
}

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function OverdueBillsAccordion({
  overdueBills,
  onViewBill,
  onEditBill,
  onDeleteBill,
}: OverdueBillsAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'low': return '#000000';
      default: return '#95a5a6';
    }
  };

  const formatAmountDisplay = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const totalOverdue = overdueBills.reduce((sum, bill) => {
    const billAmount = bill.is_variable 
      ? (bill.statement_minimum_due || bill.updated_balance || bill.statement_balance || 0)
      : (bill.amount || 0);
    return sum + billAmount;
  }, 0);

  if (overdueBills.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleAccordion}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons
            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={24}
            color="#e74c3c"
          />
          <Text style={styles.headerTitle}>
            Overdue Bills ({overdueBills.length})
          </Text>
        </View>
        <Text style={styles.headerAmount}>{formatAmountDisplay(totalOverdue)}</Text>
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          nestedScrollEnabled={true}
        >
          {overdueBills.map((bill) => (
            <View key={bill.id} style={styles.billItem}>
              {/* Debug log */}
              {console.log(`[OverdueBills] Bill: ${bill.name}`, {
                partial_payment: bill.partial_payment,
                remaining_amount: bill.remaining_amount,
                total_amount: bill.total_amount,
                amount: bill.amount,
              })}
              <TouchableOpacity
                style={styles.billInfo}
                onPress={() => onViewBill(bill)}
                activeOpacity={0.7}
              >
                <View style={styles.billHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {bill.alert_flag && (
                      <MaterialCommunityIcons 
                        name="alert-outline" 
                        size={16} 
                        color="#e67e22" 
                      />
                    )}
                    <Text style={styles.billName}>{bill.name}</Text>
                  </View>
                  {bill.partial_payment && bill.partial_payment > 0 ? (
                    <View style={styles.amountContainer}>
                      <Text style={styles.billAmountRemaining}>
                        ${(bill.remaining_amount || 0).toFixed(2)}
                      </Text>
                      <Text style={styles.billAmountTotal}>
                        / ${(bill.amount || 0).toFixed(2)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.billAmount}>{formatAmountDisplay(bill.amount)}</Text>
                  )}
                </View>
                
                {bill.next_date && (
                  <View style={styles.billMeta}>
                    <Ionicons name="calendar-outline" size={14} color="#e74c3c" />
                    <Text style={styles.dueDateText}>
                      Due: {format(new Date(bill.next_date), 'MMM d, yyyy')}
                    </Text>
                  </View>
                )}

                {bill.priority && (
                  <View style={styles.priorityBadge}>
                    <MaterialCommunityIcons
                      name="signal-cellular-3"
                      size={14}
                      color={getPriorityColor(bill.priority)}
                    />
                    <Text style={[styles.priorityText, { color: getPriorityColor(bill.priority) }]}>
                      {bill.priority}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Action Buttons */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onEditBill(bill)}
                >
                  <Ionicons name="create-outline" size={20} color="#3498db" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    Alert.alert(
                      'Delete Bill',
                      `Are you sure you want to delete "${bill.name}"?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => onDeleteBill(bill),
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff3cd',
    borderTopWidth: 1,
    borderTopColor: '#e74c3c',
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff3cd',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e74c3c',
  },
  headerAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e74c3c',
  },
  content: {
    maxHeight: SCREEN_HEIGHT * 0.3,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  billItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e74c3c',
    overflow: 'hidden',
  },
  billInfo: {
    padding: 16,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 12,
  },
  billAmountRemaining: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e67e22',
  },
  billAmountTotal: {
    fontSize: 13,
    fontWeight: '500',
    color: '#95a5a6',
    marginLeft: 2,
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e74c3c',
    marginLeft: 12,
  },
  billMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  dueDateText: {
    fontSize: 13,
    color: '#e74c3c',
    fontWeight: '500',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
    gap: 16,
  },
  actionButton: {
    padding: 8,
  },
});
