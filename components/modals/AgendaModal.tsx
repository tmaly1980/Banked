import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BillModel } from '@/models/BillModel';

interface AgendaModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  bills: BillModel[];
  onBillClick?: (bill: BillModel) => void;
}

export default function AgendaModal({ visible, onClose, title, bills, onBillClick }: AgendaModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#7f8c8d" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {bills.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={64} color="#bdc3c7" />
                <Text style={styles.emptyText}>No items in this view</Text>
              </View>
            ) : (
              bills.map((bill) => (
                <TouchableOpacity
                  key={bill.id}
                  style={styles.billCard}
                  onPress={() => onBillClick?.(bill)}
                >
                  <View style={styles.billHeader}>
                    <Text style={styles.billName}>{bill.name}</Text>
                    <Text style={styles.billAmount}>${bill.amount?.toFixed(2)}</Text>
                  </View>
                  
                  <View style={styles.billMeta}>
                    {bill.due_date && (
                      <View style={styles.metaItem}>
                        <Ionicons name="calendar" size={14} color="#7f8c8d" />
                        <Text style={styles.metaText}>
                          {new Date(bill.due_date).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                    {bill.due_day && (
                      <View style={styles.metaItem}>
                        <Ionicons name="calendar" size={14} color="#7f8c8d" />
                        <Text style={styles.metaText}>Day {bill.due_day}</Text>
                      </View>
                    )}
                    {bill.priority && (
                      <View style={styles.metaItem}>
                        <Ionicons
                          name="flag"
                          size={14}
                          color={
                            bill.priority === 'high'
                              ? '#e74c3c'
                              : bill.priority === 'medium'
                              ? '#f39c12'
                              : '#95a5a6'
                          }
                        />
                        <Text style={styles.metaText}>{bill.priority}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalContent: {
    padding: 16,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
    marginTop: 16,
  },
  billCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
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
  billAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginLeft: 12,
  },
  billMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
});
