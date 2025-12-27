import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BillModel } from '@/models/BillModel';
import { formatDollar } from '@/lib/utils';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface UndatedBillsAccordionProps {
  undatedBills: BillModel[];
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

export default function UndatedBillsAccordion({
  undatedBills,
  onViewBill,
  onEditBill,
  onDeleteBill,
}: UndatedBillsAccordionProps) {
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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return 'signal-cellular-3';
      case 'medium': return 'signal-cellular-2';
      case 'low': return 'signal-cellular-1';
      default: return 'signal-cellular-1';
    }
  };

  const totalUndated = undatedBills.reduce((sum, bill) => {
    const billAmount = bill.is_variable 
      ? (bill.statement_minimum_due || bill.updated_balance || bill.statement_balance || 0)
      : (bill.amount || 0);
    return sum + billAmount;
  }, 0);

  if (undatedBills.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={toggleAccordion}>
        <View style={styles.headerLeft}>
          <Ionicons 
            name={isExpanded ? "chevron-down" : "chevron-forward"} 
            size={20} 
            color="#6c757d" 
          />
          <Text style={styles.headerTitle}>Undated</Text>
        </View>
        <Text style={styles.headerCount}>
          ({undatedBills.length}) {formatDollar(totalUndated)}
        </Text>
      </TouchableOpacity>

      {/* Content - Scrollable when expanded */}
      {isExpanded && (
        <ScrollView style={styles.content}>
          {undatedBills.map((bill) => {
            const priorityColor = getPriorityColor(bill.priority);
            return (
              <TouchableOpacity
                key={bill.id}
                style={styles.billItem}
                activeOpacity={0.7}
                onPress={() => onViewBill(bill)}
                onLongPress={() => Alert.alert(
                  'Bill Actions',
                  'Choose an action:',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Edit', onPress: () => onEditBill(bill) },
                    { text: 'Delete', style: 'destructive', onPress: () => onDeleteBill(bill) },
                  ]
                )}
              >
                <View style={styles.billRow}>
                  {bill.alert_flag && (
                    <MaterialCommunityIcons 
                      name="alert-outline" 
                      size={16} 
                      color="#e67e22" 
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <MaterialCommunityIcons 
                    name={getPriorityIcon(bill.priority)} 
                    size={16} 
                    color={priorityColor}
                    style={styles.priorityIcon}
                  />
                  <Text style={[styles.billName, { color: priorityColor }]} numberOfLines={1}>
                    {bill.name}
                  </Text>
                  {bill.loss_risk_flag && (
                    <Text style={styles.urgentIcon}>⚠️</Text>
                  )}
                  {bill.partial_payment && bill.partial_payment > 0 ? (
                    <View style={styles.amountContainer}>
                      <Text style={[styles.billAmountRemaining, { color: priorityColor }]}>
                        {formatDollar(bill.remaining_amount || 0)}
                      </Text>
                      <Text style={styles.billAmountTotal}>
                        / {formatDollar(bill.amount || 0)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.billAmount, { color: priorityColor }]}>
                      {formatDollar(bill.amount || 0)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  headerCount: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  content: {
    maxHeight: SCREEN_HEIGHT * 0.4,
    backgroundColor: 'white',
  },
  billItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityIcon: {
    width: 16,
  },
  billName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  urgentIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  billAmountRemaining: {
    fontSize: 14,
    fontWeight: '700',
  },
  billAmountTotal: {
    fontSize: 12,
    fontWeight: '500',
    color: '#95a5a6',
    marginLeft: 2,
  },
  billAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
});
