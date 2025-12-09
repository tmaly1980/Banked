import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Deposit } from '@/types';
import { format } from 'date-fns';

interface DepositDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  deposit: Deposit | null;
}

export default function DepositDetailsModal({
  visible,
  onClose,
  deposit,
}: DepositDetailsModalProps) {
  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  if (!deposit) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Deposit Details</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Deposit Info */}
          <View style={styles.section}>
            <Text style={styles.depositName}>
              {deposit.name || 'Deposit'}
            </Text>
            <Text style={styles.depositAmount}>
              {formatAmount(deposit.amount)}
            </Text>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>
                  {deposit.date ? format(new Date(deposit.date), 'MMM d, yyyy') : 'No date'}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Created</Text>
                <Text style={styles.infoValue}>
                  {format(new Date(deposit.created_at), 'MMM d, yyyy')}
                </Text>
              </View>
            </View>

            {/* Notes */}
            {deposit.notes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Notes</Text>
                <Text style={styles.notesText}>{deposit.notes}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  depositName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  depositAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  notesContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#27ae60',
  },
  notesLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 6,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  notesText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
});
