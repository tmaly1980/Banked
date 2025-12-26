import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBills } from '@/contexts/BillsContext';
import TabScreenHeader from '@/components/TabScreenHeader';
import BillDetailsModal from '@/components/modals/BillDetailsModal';
import { BillModel } from '@/models/BillModel';
import Bills from '@/components/Expenses/Bills';
import Budget from '@/components/Expenses/Budget';
import Projects from '@/components/Expenses/Projects';
import Purchases from '@/components/Expenses/Purchases';
import BillFormModal from '@/components/modals/BillFormModal';
import FloatingActionButton from '@/components/FloatingActionButton';

type AccordionSection = 'bills' | 'budget' | 'projects' | 'purchases';

export default function ExpensesScreen() {
  const { bills, loading, refreshData } = useBills();
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <TabScreenHeader title="Expenses" />

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
          }
        >
          {/* Bills Accordion */}
          <View style={styles.accordionSection}>
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
            </TouchableOpacity>
            {expandedSection === 'bills' && (
              <View style={styles.accordionContent}>
                <Bills 
                  bills={bills} 
                  onBillPress={handleBillPress}
                />
              </View>
            )}
          </View>

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
        </ScrollView>

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
        {expandedSection === 'bills' && (
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
        )}
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
  content: {
    flex: 1,
  },
  accordionSection: {
    marginBottom: 2,
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
  accordionContent: {
    backgroundColor: 'white',
  },
});
