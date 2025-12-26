import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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

type AccordionSection = 'bills' | 'budget' | 'projects' | 'purchases';

export default function ExpensesScreen() {
  const { bills, loading, refreshData, createBill } = useBills();
  const [expandedSection, setExpandedSection] = useState<AccordionSection | null>('bills');
  const [selectedBill, setSelectedBill] = useState<BillModel | null>(null);
  const [billDetailsVisible, setBillDetailsVisible] = useState(false);
  const [billFormVisible, setBillFormVisible] = useState(false);

  const toggleSection = (section: AccordionSection) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

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

        {/* Bills Accordion */}
        <View style={expandedSection === 'bills' ? styles.billsAccordionSection : styles.accordionSection}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => toggleSection('bills')}
          >
            <Ionicons
              name={expandedSection === 'bills' ? 'chevron-down' : 'chevron-forward'}
              size={24}
              color="#2c3e50"
            />
            <Text style={styles.accordionTitle}>Bills</Text>
            <Text style={styles.accordionTotal}>
              {formatDollar(bills
                .filter(bill => !bill.deferred_flag && bill.next_due_date)
                .reduce((sum, bill) => {
                  const amount = bill.is_variable 
                    ? (bill.statement_minimum_due || bill.updated_balance || bill.statement_balance || 0)
                    : (bill.remaining_amount || bill.amount || 0);
                  return sum + amount;
                }, 0))}
            </Text>
          </TouchableOpacity>
          {expandedSection === 'bills' && (
            <View style={styles.billsScrollContainer}>
              <Bills 
                bills={bills} 
                onBillPress={handleBillPress}
                onAddBill={handleAddInlineBill}
                onRefresh={handleRefresh}
                loading={loading}
              />
            </View>
          )}
        </View>

        {/* Bottom Fixed Accordions */}
        <View style={styles.bottomAccordions}>
          {/* Budget Accordion */}
          <View style={styles.accordionSection}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleSection('budget')}
            >
              <Ionicons
                name={expandedSection === 'budget' ? 'chevron-down' : 'chevron-forward'}
                size={24}
                color="#2c3e50"
              />
              <Text style={styles.accordionTitle}>Budget</Text>
            </TouchableOpacity>
            {expandedSection === 'budget' && (
              <View style={styles.accordionContent}>
                <Budget />
              </View>
            )}
          </View>

          {/* Projects Accordion */}
          <View style={styles.accordionSection}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleSection('projects')}
            >
              <Ionicons
                name={expandedSection === 'projects' ? 'chevron-down' : 'chevron-forward'}
                size={24}
                color="#2c3e50"
              />
              <Text style={styles.accordionTitle}>Projects</Text>
            </TouchableOpacity>
            {expandedSection === 'projects' && (
              <View style={styles.accordionContent}>
                <Projects />
              </View>
            )}
          </View>

          {/* Purchases Accordion */}
          <View style={styles.accordionSection}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleSection('purchases')}
            >
              <Ionicons
                name={expandedSection === 'purchases' ? 'chevron-down' : 'chevron-forward'}
                size={24}
                color="#2c3e50"
              />
              <Text style={styles.accordionTitle}>Purchases</Text>
            </TouchableOpacity>
            {expandedSection === 'purchases' && (
              <View style={styles.accordionContent}>
                <Purchases />
              </View>
            )}
          </View>
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
  billsAccordionSection: {
    flex: 1,
    backgroundColor: 'white',
  },
  billsScrollContainer: {
    flex: 1,
  },
  bottomAccordions: {
    backgroundColor: 'white',
  },
  accordionSection: {
    backgroundColor: 'white',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    gap: 12,
  },
  accordionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  accordionTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498db',
    marginLeft: 'auto',
  },
  accordionContent: {
    minHeight: 150,
    backgroundColor: 'white',
  },
});
