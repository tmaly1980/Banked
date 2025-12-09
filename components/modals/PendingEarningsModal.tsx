import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIncome } from '@/contexts/IncomeContext';
import { IncomeSource } from '@/types';

interface PendingEarningsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PendingEarningsModal({ visible, onClose }: PendingEarningsModalProps) {
  const { incomeSources, updateIncomeSource } = useIncome();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleStartEdit = (source: IncomeSource) => {
    setEditingId(source.id);
    setEditValue(source.pending_earnings.toFixed(2));
  };

  const handleSaveEdit = async (source: IncomeSource) => {
    const newValue = parseFloat(editValue) || 0;
    try {
      await updateIncomeSource(source.id, { pending_earnings: newValue });
      setEditingId(null);
    } catch (err) {
      console.error('Error updating pending earnings:', err);
      alert('Failed to update earnings');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const totalPendingEarnings = incomeSources.reduce(
    (sum, source) => sum + source.pending_earnings,
    0
  );

  const renderIncomeSource = ({ item }: { item: IncomeSource }) => {
    const isEditing = editingId === item.id;

    return (
      <View style={styles.sourceRow}>
        <View style={styles.sourceInfo}>
          <Text style={styles.sourceName}>{item.name}</Text>
          <Text style={styles.sourceFrequency}>{item.frequency}</Text>
        </View>
        
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.editInput}
              value={editValue}
              onChangeText={setEditValue}
              keyboardType="decimal-pad"
              autoFocus
              selectTextOnFocus
              onSubmitEditing={() => handleSaveEdit(item)}
              onBlur={() => handleCancelEdit()}
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => handleSaveEdit(item)}
            >
              <Ionicons name="checkmark" size={20} color="#2ecc71" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.amountContainer}
            onPress={() => handleStartEdit(item)}
          >
            <Text style={styles.amount}>${item.pending_earnings.toFixed(2)}</Text>
            <Ionicons name="pencil" size={16} color="#95a5a6" style={styles.editIcon} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pending Earnings</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#7f8c8d" />
            </TouchableOpacity>
          </View>

          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total Pending</Text>
            <Text style={styles.totalAmount}>${totalPendingEarnings.toFixed(2)}</Text>
          </View>

          <FlatList
            data={incomeSources}
            renderItem={renderIncomeSource}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No income sources</Text>
                <Text style={styles.emptySubtext}>Add income sources in the Income tab</Text>
              </View>
            }
          />
        </View>
      </KeyboardAvoidingView>
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
  totalSection: {
    backgroundColor: '#2ecc71',
    padding: 20,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  sourceFrequency: {
    fontSize: 13,
    color: '#7f8c8d',
    textTransform: 'capitalize',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2ecc71',
    marginRight: 8,
  },
  editIcon: {
    marginLeft: 4,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#3498db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    minWidth: 100,
    textAlign: 'right',
  },
  saveButton: {
    marginLeft: 8,
    padding: 4,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 4,
  },
});
