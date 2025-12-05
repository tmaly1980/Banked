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
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (visible) {
      setDescription('');
      setSelectedTypeId('');
      setAmount('');
      setPurchaseDate(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [visible]);

  const handleClose = () => {
    setDescription('');
    setSelectedTypeId('');
    setAmount('');
    setPurchaseDate(format(new Date(), 'yyyy-MM-dd'));
    onClose();
  };

  const handleSave = () => {
    console.log('=== AddPurchaseModal handleSave ===');
    console.log('selectedTypeId:', selectedTypeId);
    console.log('amount:', amount);
    console.log('purchaseDate:', purchaseDate);
    console.log('description:', description);
    
    const parsedAmount = parseFloat(amount);
    console.log('parsedAmount:', parsedAmount);
    console.log('isNaN(parsedAmount):', isNaN(parsedAmount));
    console.log('parsedAmount <= 0:', parsedAmount <= 0);
    
    if (!selectedTypeId || !amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      console.log('Validation failed - returning early');
      if (!selectedTypeId) console.log('  - No expense type selected');
      if (!amount) console.log('  - No amount entered');
      if (isNaN(parsedAmount)) console.log('  - Amount is not a number');
      if (parsedAmount <= 0) console.log('  - Amount is <= 0');
      return;
    }

    const data = {
      description: description.trim() || undefined,
      expense_type_id: selectedTypeId,
      amount: parsedAmount,
      purchase_date: purchaseDate,
    };
    
    console.log('Calling onSuccess with data:', data);
    onSuccess(data);
    console.log('onSuccess called successfully');
  };

  const isValid = selectedTypeId && amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;

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
                label="Date"
                value={purchaseDate}
                onChangeDate={setPurchaseDate}
              />
            </View>
            <View style={styles.rowItemRight}>
              <Text style={globalStyles.label}>Amount</Text>
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
