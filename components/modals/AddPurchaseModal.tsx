import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import SelectPicker from '@/components/SelectPicker';
import DateInput from '@/components/DateInput';
import { ExpenseType } from '@/types';
import { format } from 'date-fns';
import { globalStyles } from '@/lib/globalStyles';

interface AddPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  expenseTypes: ExpenseType[];
  onSuccess: (data: { description?: string; expense_type_id: string; amount: number; purchase_date: string }) => void;
}

export default function AddPurchaseModal({
  visible,
  onClose,
  expenseTypes,
  onSuccess,
}: AddPurchaseModalProps) {
  const [description, setDescription] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');

  useEffect(() => {
    if (visible) {
      console.log('[AddPurchaseModal] Modal opened - resetting form');
      setDescription('');
      setSelectedTypeId('');
      setAmount('');
      setPurchaseDate('');
    }
  }, [visible]);

  const handleClose = () => {
    console.log('[AddPurchaseModal] Closing modal - resetting form');
    setDescription('');
    setSelectedTypeId('');
    setAmount('');
    setPurchaseDate('');
    onClose();
  };

  const handleSave = () => {
    console.log('[AddPurchaseModal] === handleSave START ===');
    console.log('[AddPurchaseModal] Form values:', {
      selectedTypeId,
      amount,
      purchaseDate,
      description,
    });
    
    // Only require expense type - amount, date, and description are optional
    if (!selectedTypeId) {
      console.log('[AddPurchaseModal] Validation failed - No expense type selected');
      return;
    }

    const parsedAmount = amount ? parseFloat(amount) : undefined;
    console.log('[AddPurchaseModal] Parsed amount:', parsedAmount);
    
    if (amount && (isNaN(parsedAmount!) || parsedAmount! <= 0)) {
      console.log('[AddPurchaseModal] Validation failed - Invalid amount');
      return;
    }

    const data = {
      description: description.trim() || undefined,
      expense_type_id: selectedTypeId,
      amount: parsedAmount,
      purchase_date: purchaseDate || undefined,
    };
    
    console.log('[AddPurchaseModal] Calling onSuccess with data:', JSON.stringify(data, null, 2));
    try {
      onSuccess(data);
      console.log('[AddPurchaseModal] onSuccess called successfully');
    } catch (error) {
      console.error('[AddPurchaseModal] Error calling onSuccess:', error);
    }
    console.log('[AddPurchaseModal] === handleSave END ===');
  };

  const isValid = !!selectedTypeId;

  const pickerItems = expenseTypes.map(type => ({
    label: type.name,
    value: type.id,
  }));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={globalStyles.modalContainer}
      >
        <View style={globalStyles.modalHeader}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={globalStyles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={globalStyles.modalTitle}>Add Purchase</Text>
          <TouchableOpacity onPress={handleSave} disabled={!isValid}>
            <Text style={[globalStyles.saveButton, !isValid && globalStyles.disabledButton]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={globalStyles.form} keyboardShouldPersistTaps="handled">
          <View style={globalStyles.inputGroup}>
            <SelectPicker
              label="Expense Type"
              value={selectedTypeId}
              onValueChange={setSelectedTypeId}
              items={pickerItems}
              placeholder="Select expense type..."
            />
          </View>

          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.label}>Description (optional)</Text>
            <TextInput
              style={globalStyles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Weekly Groceries"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.rowContainer}>
            <View style={styles.rowItemLeft}>
              <DateInput
                label="Date (optional)"
                value={purchaseDate}
                onChangeDate={setPurchaseDate}
              />
            </View>
            <View style={styles.rowItemRight}>
              <Text style={globalStyles.label}>Amount (optional)</Text>
              <TextInput
                style={globalStyles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="$0.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  rowItemLeft: {
    flex: 2,
  },
  rowItemRight: {
    flex: 1,
  },
});
