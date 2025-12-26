import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBills } from '@/contexts/BillsContext';
import TabScreenHeader from '@/components/TabScreenHeader';
import BillDetailsModal from '@/components/modals/BillDetailsModal';
import { BillModel } from '@/models/BillModel';
import { formatDollar } from '@/lib/utils';
import Bills from '@/components/Expenses/Bills';
import Budget from '@/components/Expenses/Budget';
import Projects from '@/components/Expenses/Projects';
import Purchases from '@/components/Expenses/Purchases';
import BillFormModal from '@/components/modals/BillFormModal';
import FloatingActionButton from '@/components/FloatingActionButton';

type TabSection = 'bills' | 'budget' | 'projects' | 'purchases';

export default function ExpensesScreen() {
  const { bills, loading, refreshData, createBill } = useBills();
  const [activeTab, setActiveTab] = useState<TabSection>('bills');
  const [selectedBill, setSelectedBill] = useState<BillModel | null>(null);
  const [billDetailsVisible, setBillDetailsVisible] = useState(false);
  const [billFormVisible, setBillFormVisible] = useState(false);

  const handleBillPress = (bill: BillModel) => {
    setSelectedBill(bill);
    setBillDetailsVisible(true);
  };

  const handleRefresh = async () => {
    await refreshData();
  };

  const handleAddInlineBill = async (bill: { name: string; amount?: number | null; due_date?: string; due_day?: number }) => {
    const { error } = await createBill({
      name: bill.name,
      amount: bill.amount || null,
      due_date: bill.due_date || undefined,
      due_day: bill.due_day || undefined,
      priority: 'medium',
      loss_risk_flag: false,
      deferred_flag: false,
    });
    
    if (!error) {
      await refreshData();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <TabScreenHeader title="Expenses" />

        {/* Top Navigation Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'bills' && styles.activeTab]}
            onPress={() => setActiveTab('bills')}
          >
            <Text style={[styles.tabText, activeTab === 'bills' && styles.activeTabText]}>
              Bills
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'budget' && styles.activeTab]}
            onPress={() => setActiveTab('budget')}
          >
            <Text style={[styles.tabText, activeTab === 'budget' && styles.activeTabText]}>
              Budget
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'projects' && styles.activeTab]}
            onPress={() => setActiveTab('projects')}
          >
            <Text style={[styles.tabText, activeTab === 'projects' && styles.activeTabText]}>
              Projects
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'purchases' && styles.activeTab]}
            onPress={() => setActiveTab('purchases')}
          >
            <Text style={[styles.tabText, activeTab === 'purchases' && styles.activeTabText]}>
              Purchases
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        <View style={styles.content}>
          {activeTab === 'bills' && (
            <Bills 
              bills={bills} 
              onBillPress={handleBillPress}
              onAddBill={handleAddInlineBill}
              onRefresh={handleRefresh}
              loading={loading}
            />
          )}
          {activeTab === 'budget' && (
            <View style={styles.placeholderContainer}>
              <Ionicons name="calculator-outline" size={64} color="#bdc3c7" />
              <Text style={styles.placeholderText}>Budget tracking coming soon</Text>
            </View>
          )}
          {activeTab === 'projects' && (
            <View style={styles.placeholderContainer}>
              <Ionicons name="construct-outline" size={64} color="#bdc3c7" />
              <Text style={styles.placeholderText}>Projects coming soon</Text>
            </View>
          )}
          {activeTab === 'purchases' && (
            <View style={styles.placeholderContainer}>
              <Ionicons name="cart-outline" size={64} color="#bdc3c7" />
              <Text style={styles.placeholderText}>Purchases coming soon</Text>
            </View>
          )}
        </View>

        {/* Bill Details Modal */}
        <BillDetailsModal
          visible={billDetailsVisible}
          onClose={() => {
            setBillDetailsVisible(false);
            setSelectedBill(null);
          }}
          onSuccess={refreshData}
          onEdit={() => {
            setBillDetailsVisible(false);
            setBillFormVisible(true);
          }}
          bill={selectedBill}
        />

        {/* Bill Form Modal */}
        <BillFormModal
          visible={billFormVisible}
          onClose={() => {
            setBillFormVisible(false);
            setSelectedBill(null);
          }}
          onSuccess={() => {
            refreshData();
            setBillFormVisible(false);
            setSelectedBill(null);
          }}
          editingBill={selectedBill}
        />

        {/* Floating Action Button for Bills */}
        <FloatingActionButton
          options={[
            {
              label: 'Add Bill',
              icon: 'add',
              onPress: () => {
                setSelectedBill(null);
                setBillFormVisible(true);
              },
            },
          ]}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2c3e50',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomColor: '#3498db',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  activeTabText: {
    color: '#3498db',
  },
  content: {
    flex: 1,
    backgroundColor: 'white',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  placeholderText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 16,
    textAlign: 'center',
  },
});
