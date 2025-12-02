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
import { Ionicons } from '@expo/vector-icons';
import { Bill } from '@/types';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface DeferredBillsAccordionProps {
  deferredBills: Bill[];
  onViewBill: (bill: Bill) => void;
  onEditBill: (bill: Bill) => void;
  onDeleteBill: (bill: Bill) => void;
}

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function DeferredBillsAccordion({
  deferredBills,
  onViewBill,
  onEditBill,
  onDeleteBill,
}: DeferredBillsAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'low': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const totalDeferred = deferredBills.reduce((sum, bill) => sum + bill.amount, 0);

  if (deferredBills.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={toggleAccordion}>
        <Ionicons 
          name={isExpanded ? "chevron-down" : "chevron-forward"} 
          size={20} 
          color="#6c757d" 
        />
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Deferred</Text>
          <Text style={styles.headerCount}>
            ({deferredBills.length}) {formatAmount(totalDeferred)}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Content - Scrollable when expanded */}
      {isExpanded && (
        <ScrollView style={styles.content}>
          {deferredBills.map((bill) => (
            <TouchableOpacity
              key={bill.id}
              style={styles.billItem}
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
              <View style={styles.billInfo}>
                <View style={styles.billHeader}>
                  <Text style={styles.billName}>{bill.name}</Text>
                  <Text style={styles.billAmount}>
                    {formatAmount(bill.amount)}
                  </Text>
                </View>
                <View style={styles.billDetails}>
                  <Text style={styles.billType}>
                    {bill.due_date ? 'One-time' : 'Monthly'}
                    {bill.due_day && ` (Day ${bill.due_day})`}
                  </Text>
                  <View style={styles.billFlags}>
                    <View 
                      style={[
                        styles.priorityBadge, 
                        { backgroundColor: getPriorityColor(bill.priority) }
                      ]}
                    >
                      <Text style={styles.priorityText}>
                        {bill.priority.toUpperCase()}
                      </Text>
                    </View>
                    {bill.loss_risk_flag && (
                      <View style={styles.riskBadge}>
                        <Text style={styles.riskText}>⚠️</Text>
                      </View>
                    )}
                    <View style={styles.deferredBadge}>
                      <Text style={styles.deferredText}>DEFERRED</Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
    padding: 16,
    backgroundColor: '#f8f9fa',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6c757d',
  },
  headerCount: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  content: {
    maxHeight: SCREEN_HEIGHT * 0.4,
    backgroundColor: 'white',
  },
  billItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  billInfo: {
    flex: 1,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  billName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    flex: 1,
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
  },
  billDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billType: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  billFlags: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  riskBadge: {
    padding: 2,
  },
  riskText: {
    fontSize: 12,
  },
  deferredBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#6c757d',
  },
  deferredText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
});