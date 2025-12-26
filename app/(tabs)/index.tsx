import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import TabScreenHeader from '@/components/TabScreenHeader';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <TabScreenHeader
          title="Home"
          rightContent={
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <TouchableOpacity onPress={() => router.push('/goals')}>
                <Ionicons name="flag" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/settings')}>
                <Ionicons name="settings" size={24} color="white" />
              </TouchableOpacity>
            </View>
          }
        />

        <ScrollView style={styles.content}>
          {/* Today Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today</Text>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Expected Income</Text>
                <Text style={styles.cardValue}>$0.00</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Expected Expenses</Text>
                <Text style={styles.cardValue}>$0.00</Text>
              </View>
              <View style={[styles.cardRow, styles.cardRowTotal]}>
                <Text style={styles.cardLabelBold}>Net Income/Loss</Text>
                <Text style={styles.cardValueBold}>$0.00</Text>
              </View>
            </View>
          </View>

          {/* This Week Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>This Week</Text>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Projected Income</Text>
                <Text style={styles.cardValue}>$0.00</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Required Expenses</Text>
                <Text style={styles.cardValue}>$0.00</Text>
              </View>
              <View style={[styles.cardRow, styles.cardRowTotal]}>
                <View style={styles.statusContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#2ecc71" />
                  <Text style={styles.statusText}>On Track</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Next Big Bills Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next Big Bills</Text>
            <View style={styles.card}>
              <View style={styles.billItem}>
                <View style={styles.billInfo}>
                  <Text style={styles.billName}>Rent</Text>
                  <Text style={styles.billDueDate}>Due Jan 1, 2026</Text>
                </View>
                <Text style={styles.billAmount}>$1,200.00</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.billItem}>
                <View style={styles.billInfo}>
                  <Text style={styles.billName}>Car Payment</Text>
                  <Text style={styles.billDueDate}>Due Jan 5, 2026</Text>
                </View>
                <Text style={styles.billAmount}>$350.00</Text>
              </View>
            </View>
          </View>
        </ScrollView>
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
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  cardRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    marginTop: 8,
    paddingTop: 16,
  },
  cardLabel: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  cardLabelBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  cardValueBold: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2ecc71',
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  billDueDate: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  billAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  divider: {
    height: 1,
    backgroundColor: '#ecf0f1',
    marginVertical: 4,
  },
});
