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
import { GigWithPaychecks, Paycheck } from '@/types';
import { format, parseISO } from 'date-fns';

interface LinkPaychecksModalProps {
  visible: boolean;
  gig: GigWithPaychecks | null;
  availablePaychecks: Paycheck[];
  onClose: () => void;
}

export default function LinkPaychecksModal({
  visible,
  gig,
  availablePaychecks,
  onClose,
}: LinkPaychecksModalProps) {
  const { linkPaycheckToGig, unlinkPaycheckFromGig } = useBills();
  const [loading, setLoading] = useState(false);

  if (!gig) return null;

  const handleLinkPaycheck = async (paycheck: Paycheck) => {
    setLoading(true);
    try {
      const { error } = await linkPaycheckToGig(gig.id, paycheck.id);
      if (error) {
        Alert.alert('Error', error.message);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to link paycheck');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkPaycheck = async (paycheck: Paycheck) => {
    Alert.alert(
      'Unlink Paycheck',
      'Are you sure you want to unlink this paycheck?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await unlinkPaycheckFromGig(gig.id, paycheck.id);
              if (error) {
                Alert.alert('Error', error.message);
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to unlink paycheck');
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

  const totalLinkedAmount = gig.paychecks.reduce((sum, pc) => sum + pc.amount, 0);

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
              <Text style={styles.modalTitle}>Link Paychecks</Text>
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
              <Text style={styles.summaryLabel}>Linked Paychecks:</Text>
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
            {/* Currently Linked Paychecks */}
            {gig.paychecks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Linked Paychecks ({gig.paychecks.length})
                </Text>
                {gig.paychecks.map(paycheck => (
                  <View key={paycheck.id} style={styles.paycheckItem}>
                    <View style={styles.paycheckInfo}>
                      <Text style={styles.paycheckDate}>
                        {paycheck.date ? format(parseISO(paycheck.date), 'MMM d, yyyy') : 'No date'}
                      </Text>
                      {paycheck.name && (
                        <Text style={styles.paycheckName}>{paycheck.name}</Text>
                      )}
                      <Text style={styles.paycheckAmount}>
                        {formatAmount(paycheck.amount)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleUnlinkPaycheck(paycheck)}
                      style={styles.unlinkButton}
                      disabled={loading}
                    >
                      <Ionicons name="remove-circle" size={24} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Available Paychecks */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Available Paychecks ({availablePaychecks.length})
              </Text>
              {availablePaychecks.length === 0 ? (
                <Text style={styles.emptyText}>
                  No unlinked paychecks available
                </Text>
              ) : (
                availablePaychecks.map(paycheck => (
                  <View key={paycheck.id} style={styles.paycheckItem}>
                    <View style={styles.paycheckInfo}>
                      <Text style={styles.paycheckDate}>
                        {paycheck.date ? format(parseISO(paycheck.date), 'MMM d, yyyy') : 'No date'}
                      </Text>
                      {paycheck.name && (
                        <Text style={styles.paycheckName}>{paycheck.name}</Text>
                      )}
                      <Text style={styles.paycheckAmount}>
                        {formatAmount(paycheck.amount)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleLinkPaycheck(paycheck)}
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
  paycheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  paycheckInfo: {
    flex: 1,
  },
  paycheckDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  paycheckName: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  paycheckAmount: {
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
