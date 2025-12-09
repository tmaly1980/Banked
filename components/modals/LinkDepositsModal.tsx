import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBills } from '@/contexts/BillsContext';
import { GigWithDeposits, Deposit } from '@/types';
import { format, parseISO } from 'date-fns';

interface LinkDepositsModalProps {
  visible: boolean;
  gig: GigWithDeposits | null;
  availableDeposits: Deposit[];
  onClose: () => void;
}

export default function LinkDepositsModal({
  visible,
  gig,
  availableDeposits,
  onClose,
}: LinkDepositsModalProps) {
  const { linkDepositToGig, unlinkDepositFromGig } = useBills();
  const [loading, setLoading] = useState(false);

  if (!gig) return null;

  const handleLinkDeposit = async (deposit: Deposit) => {
    setLoading(true);
    try {
      const { error } = await linkDepositToGig(gig.id, deposit.id);
      if (error) {
        Alert.alert('Error', error.message);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to link deposit');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkDeposit = async (deposit: Deposit) => {
    Alert.alert(
      'Unlink Deposit',
      'Are you sure you want to unlink this deposit?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await unlinkDepositFromGig(gig.id, deposit.id);
              if (error) {
                Alert.alert('Error', error.message);
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to unlink deposit');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const totalLinkedAmount = gig.deposits.reduce((sum, d) => sum + d.amount, 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Link Deposits</Text>
              <Text style={styles.gigName}>{gig.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#2c3e50" />
            </TouchableOpacity>
          </View>

          {/* Summary */}
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Gig Total:</Text>
              <Text style={styles.summaryAmount}>
                {formatAmount(gig.total_amount)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Linked Deposits:</Text>
              <Text
                style={[
                  styles.summaryAmount,
                  totalLinkedAmount > gig.total_amount && styles.overAmount,
                ]}
              >
                {formatAmount(totalLinkedAmount)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Remaining:</Text>
              <Text
                style={[
                  styles.summaryAmount,
                  totalLinkedAmount > gig.total_amount
                    ? styles.overAmount
                    : styles.remainingAmount,
                ]}
              >
                {formatAmount(gig.total_amount - totalLinkedAmount)}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.scrollView}>
            {/* Currently Linked Deposits */}
            {gig.deposits.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Linked Deposits ({gig.deposits.length})
                </Text>
                {gig.deposits.map(deposit => (
                  <View key={deposit.id} style={styles.depositItem}>
                    <View style={styles.depositInfo}>
                      <Text style={styles.depositDate}>
                        {deposit.date ? format(parseISO(deposit.date), 'MMM d, yyyy') : 'No date'}
                      </Text>
                      {deposit.name && (
                        <Text style={styles.depositName}>{deposit.name}</Text>
                      )}
                      <Text style={styles.depositAmount}>
                        {formatAmount(deposit.amount)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleUnlinkDeposit(deposit)}
                      style={styles.unlinkButton}
                      disabled={loading}
                    >
                      <Ionicons name="remove-circle" size={24} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Available Deposits */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Available Deposits ({availableDeposits.length})
              </Text>
              {availableDeposits.length === 0 ? (
                <Text style={styles.emptyText}>
                  No unlinked deposits available
                </Text>
              ) : (
                availableDeposits.map(deposit => (
                  <View key={deposit.id} style={styles.depositItem}>
                    <View style={styles.depositInfo}>
                      <Text style={styles.depositDate}>
                        {deposit.date ? format(parseISO(deposit.date), 'MMM d, yyyy') : 'No date'}
                      </Text>
                      {deposit.name && (
                        <Text style={styles.depositName}>{deposit.name}</Text>
                      )}
                      <Text style={styles.depositAmount}>
                        {formatAmount(deposit.amount)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleLinkDeposit(deposit)}
                      style={styles.linkButton}
                      disabled={loading}
                    >
                      <Ionicons name="add-circle" size={24} color="#27ae60" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          {/* Close Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={onClose} style={styles.doneButton}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  gigName: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  summary: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  remainingAmount: {
    color: '#27ae60',
  },
  overAmount: {
    color: '#e74c3c',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  depositItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  depositInfo: {
    flex: 1,
  },
  depositDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  depositName: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  depositAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  linkButton: {
    padding: 8,
  },
  unlinkButton: {
    padding: 8,
  },
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  doneButton: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
