import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface AccountInfo {
  id: string;
  account_name: string | null;
  account_balance: number;
  spendable_limit: number | null;
  user_id: string;
}

interface AccountManagementModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function AccountManagementModal({
  visible,
  onClose,
  onUpdate,
}: AccountManagementModalProps) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const nameInputRef = useRef<TextInput>(null);
  const balanceInputRef = useRef<TextInput>(null);
  const limitInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      loadAccounts();
    }
  }, [visible, user]);

  const loadAccounts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('account_info')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const handleRowPress = (account: AccountInfo) => {
    setEditingId(account.id);
    setEditName(account.account_name || '');
    setEditBalance(account.account_balance.toString());
    setEditLimit(account.spendable_limit?.toString() || '');
    setIsAddingNew(false);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const handleSave = async () => {
    if (!editingId) return;

    const balance = parseFloat(editBalance) || 0;
    const limit = editLimit ? parseFloat(editLimit) : null;

    try {
      const { error } = await supabase
        .from('account_info')
        .update({
          account_name: editName.trim() || null,
          account_balance: balance,
          spendable_limit: limit,
        })
        .eq('id', editingId);

      if (error) throw error;

      await loadAccounts();
      setEditingId(null);
      setEditName('');
      setEditBalance('');
      setEditLimit('');
      onUpdate?.();
    } catch (error) {
      console.error('Error updating account:', error);
    }
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingId('new');
    setEditName('');
    setEditBalance('0');
    setEditLimit('');
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const handleSaveNew = async () => {
    if (!user) return;

    const balance = parseFloat(editBalance) || 0;
    const limit = editLimit ? parseFloat(editLimit) : null;

    try {
      const { error } = await supabase
        .from('account_info')
        .insert({
          user_id: user.id,
          account_name: editName.trim() || null,
          account_balance: balance,
          spendable_limit: limit,
        });

      if (error) throw error;

      await loadAccounts();
      setIsAddingNew(false);
      setEditingId(null);
      setEditName('');
      setEditBalance('');
      setEditLimit('');
      onUpdate?.();
    } catch (error) {
      console.error('Error creating account:', error);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setEditName('');
    setEditBalance('');
    setEditLimit('');
  };

  const renderAccountRow = (account: AccountInfo) => {
    const isEditing = editingId === account.id;

    if (isEditing) {
      return (
        <View key={account.id} style={styles.editRow}>
          <TextInput
            ref={nameInputRef}
            style={styles.input}
            value={editName}
            onChangeText={setEditName}
            placeholder="Account name"
            returnKeyType="next"
            onSubmitEditing={() => balanceInputRef.current?.focus()}
          />
          <View style={styles.inputRow}>
            <TextInput
              ref={balanceInputRef}
              style={[styles.input, styles.numberInput]}
              value={editBalance}
              onChangeText={setEditBalance}
              placeholder="Balance"
              keyboardType="decimal-pad"
              returnKeyType="next"
              onSubmitEditing={() => limitInputRef.current?.focus()}
            />
            <TextInput
              ref={limitInputRef}
              style={[styles.input, styles.numberInput]}
              value={editLimit}
              onChangeText={setEditLimit}
              placeholder="Limit (optional)"
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={account.id}
        style={styles.accountRow}
        onPress={() => handleRowPress(account)}
      >
        <View style={styles.accountInfo}>
          <Text style={styles.accountName}>
            {account.account_name || 'Unnamed Account'}
          </Text>
          <View style={styles.amountRow}>
            <Text style={styles.label}>Balance:</Text>
            <Text style={styles.amount}>${account.account_balance.toFixed(2)}</Text>
          </View>
          {account.spendable_limit !== null && (
            <View style={styles.amountRow}>
              <Text style={styles.label}>Limit:</Text>
              <Text style={styles.amount}>${account.spendable_limit.toFixed(2)}</Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#7f8c8d" />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Manage Accounts</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#2c3e50" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {accounts.map(renderAccountRow)}
          
          {isAddingNew && (
            <View style={styles.editRow}>
              <TextInput
                ref={nameInputRef}
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Account name"
                returnKeyType="next"
                onSubmitEditing={() => balanceInputRef.current?.focus()}
              />
              <View style={styles.inputRow}>
                <TextInput
                  ref={balanceInputRef}
                  style={[styles.input, styles.numberInput]}
                  value={editBalance}
                  onChangeText={setEditBalance}
                  placeholder="Balance"
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => limitInputRef.current?.focus()}
                />
                <TextInput
                  ref={limitInputRef}
                  style={[styles.input, styles.numberInput]}
                  value={editLimit}
                  onChangeText={setEditLimit}
                  placeholder="Limit (optional)"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleSaveNew}
                />
              </View>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveNew}>
                  <Text style={styles.buttonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!isAddingNew && !editingId && (
            <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
              <Ionicons name="add-circle" size={24} color="white" />
              <Text style={styles.addButtonText}>Add Account</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    color: '#7f8c8d',
    marginRight: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  editRow: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  numberInput: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#95a5a6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
