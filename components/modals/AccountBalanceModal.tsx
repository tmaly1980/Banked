import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import BottomSheetModal from './BottomSheetModal';

interface AccountBalanceModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AccountBalanceModal({
  visible,
  onClose,
  onSuccess,
}: AccountBalanceModalProps) {
  const { user } = useAuth();
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (visible && user) {
      loadCurrentBalance();
    }
  }, [visible, user]);

  const loadCurrentBalance = async () => {
    if (!user) return;

    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('account_info')
        .select('account_balance')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading account balance:', error);
      }

      if (data) {
        setBalance(data.account_balance.toString());
      } else {
        setBalance('');
      }
    } catch (err) {
      console.error('Error loading account balance:', err);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    const balanceNum = parseFloat(balance);
    if (isNaN(balanceNum)) {
      Alert.alert('Invalid Amount', 'Please enter a valid number');
      return;
    }

    setLoading(true);
    try {
      // Try to update first
      const { data: existing } = await supabase
        .from('account_info')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('account_info')
          .update({
            account_balance: balanceNum,
            balance_updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('account_info')
          .insert({
            user_id: user.id,
            account_balance: balanceNum,
            balance_updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      Alert.alert('Success', 'Account balance updated');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error saving account balance:', err);
      Alert.alert('Error', 'Failed to update account balance');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (text: string) => {
    // Remove non-numeric characters except decimal point and minus
    const cleaned = text.replace(/[^0-9.-]/g, '');
    
    // Handle multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    
    return cleaned;
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      onSave={handleSave}
      title="Set Account Balance"
      saveDisabled={loading}
    >
      {/* Content */}
      {fetching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.label}>Current Balance</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.input}
              value={balance}
              onChangeText={(text) => setBalance(formatAmount(text))}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#999"
              autoFocus
            />
          </View>

          <Text style={styles.helpText}>
            Enter your current account balance to track your finances
          </Text>
        </View>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
  },
  dollarSign: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2c3e50',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#2c3e50',
    paddingVertical: 16,
  },
  helpText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 12,
    lineHeight: 20,
  },
});
