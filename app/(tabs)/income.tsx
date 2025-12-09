import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TabScreenHeader from '@/components/TabScreenHeader';
import IncomeSourceFormModal from '@/components/modals/IncomeSourceFormModal';
import { useIncome } from '@/contexts/IncomeContext';
import { IncomeSource } from '@/types';

export default function IncomeScreen() {
  const { incomeSources, deleteIncomeSource } = useIncome();
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedSource, setSelectedSource] = useState<IncomeSource | null>(null);

  const handleAddNew = () => {
    setSelectedSource(null);
    setShowFormModal(true);
  };

  const handleEdit = (source: IncomeSource) => {
    setSelectedSource(source);
    setShowFormModal(true);
  };

  const handleDelete = (source: IncomeSource) => {
    Alert.alert(
      'Delete Income Source',
      `Are you sure you want to delete "${source.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteIncomeSource(source.id),
        },
      ]
    );
  };

  const getFrequencyLabel = (frequency: IncomeSource['frequency']) => {
    const labels = {
      daily: 'Daily',
      weekly: 'Weekly',
      'bi-weekly': 'Bi-Weekly',
      monthly: 'Monthly',
    };
    return labels[frequency];
  };

  const renderIncomeSource = ({ item }: { item: IncomeSource }) => (
    <TouchableOpacity
      style={styles.sourceCard}
      onPress={() => handleEdit(item)}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.sourceHeader}>
        <View style={styles.sourceInfo}>
          <Text style={styles.sourceName}>{item.name}</Text>
          <Text style={styles.sourceFrequency}>{getFrequencyLabel(item.frequency)}</Text>
        </View>
        <View style={styles.sourceEarnings}>
          <Text style={styles.earningsLabel}>Pending</Text>
          <Text style={styles.earningsAmount}>${item.pending_earnings.toFixed(2)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const totalPendingEarnings = incomeSources.reduce(
    (sum, source) => sum + source.pending_earnings,
    0
  );

  return (
    <SafeAreaView style={styles.container}>
      <TabScreenHeader title="Income Sources" />

      {totalPendingEarnings > 0 && (
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Pending Earnings</Text>
          <Text style={styles.totalAmount}>${totalPendingEarnings.toFixed(2)}</Text>
        </View>
      )}

      <FlatList
        data={incomeSources}
        renderItem={renderIncomeSource}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cash-outline" size={64} color="#bdc3c7" />
            <Text style={styles.emptyText}>No income sources yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add one</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={handleAddNew}>
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      <IncomeSourceFormModal
        visible={showFormModal}
        onClose={() => setShowFormModal(false)}
        incomeSource={selectedSource}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  totalCard: {
    backgroundColor: '#2ecc71',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
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
  sourceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  sourceFrequency: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  sourceEarnings: {
    alignItems: 'flex-end',
  },
  earningsLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  earningsAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7f8c8d',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
});
