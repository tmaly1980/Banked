import React, { useState, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import FloatingActionButton from '@/components/FloatingActionButton';
import IncomeRuleFormModal from '@/components/modals/IncomeRuleFormModal';
import TimeOffFormModal from '@/components/modals/TimeOffFormModal';
import { format, parseISO } from 'date-fns';

interface IncomeSource {
  id: string;
  name: string;
}

interface IncomeRule {
  id: string;
  income_source_id: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  days_of_week: number[] | null;
  start_date: string;
  end_date: string | null;
}

interface GroupedRules {
  source: IncomeSource;
  rules: IncomeRule[];
}

export default function IncomePlannerScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<IncomeRule | null>(null);
  const [selectedTimeOff, setSelectedTimeOff] = useState<any>(null);
  const [groupedRules, setGroupedRules] = useState<GroupedRules[]>([]);
  const [timeOffList, setTimeOffList] = useState<any[]>([]);

  useEffect(() => {
    loadIncomeRules();
    loadTimeOff();
  }, [user]);

  const loadIncomeRules = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load all income rules with their sources
      const { data: rules, error } = await supabase
        .from('income_rules')
        .select('*, income_sources(id, name)')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true });

      if (error) throw error;

      // Group rules by income source
      const grouped: { [key: string]: GroupedRules } = {};
      
      rules?.forEach((rule: any) => {
        const sourceId = rule.income_source_id;
        if (!grouped[sourceId]) {
          grouped[sourceId] = {
            source: {
              id: sourceId,
              name: rule.income_sources?.name || 'Unknown',
            },
            rules: [],
          };
        }
        grouped[sourceId].rules.push({
          id: rule.id,
          income_source_id: rule.income_source_id,
          amount: rule.amount,
          frequency: rule.frequency,
          days_of_week: rule.days_of_week,
          start_date: rule.start_date,
          end_date: rule.end_date,
        });
      });

      setGroupedRules(Object.values(grouped));
    } catch (error) {
      console.error('Error loading income rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeOff = async () => {
    if (!user) return;

    try {
      const today = new Date();
      
      const { data, error } = await supabase
        .from('time_off')
        .select('*')
        .eq('user_id', user.id)
        .gte('end_date', format(today, 'yyyy-MM-dd'))
        .order('start_date', { ascending: true });

      if (error) throw error;

      setTimeOffList(data || []);
    } catch (error) {
      console.error('Error loading time off:', error);
    }
  };

  const handleTimeOffPress = (timeOff: any) => {
    setSelectedTimeOff(timeOff);
    setShowTimeOffModal(true);
  };

  const handleTimeOffModalClose = () => {
    setShowTimeOffModal(false);
    setSelectedTimeOff(null);
  };

  const formatDaysOfWeek = (days: number[] | null) => {
    if (!days || days.length === 0) return '';
    const dayNames = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
    return days.sort().map(d => dayNames[d]).join(', ');
  };

  const formatFrequency = (rule: IncomeRule) => {
    if (rule.frequency === 'daily' && rule.days_of_week) {
      return formatDaysOfWeek(rule.days_of_week);
    }
    return rule.frequency.charAt(0).toUpperCase() + rule.frequency.slice(1);
  };

  const formatDateRange = (rule: IncomeRule) => {
    const startDate = format(parseISO(rule.start_date), 'MM/dd');
    if (rule.end_date) {
      const endDate = format(parseISO(rule.end_date), 'MM/dd');
      return `${startDate} - ${endDate}`;
    }
    return `from ${startDate}`;
  };

  const handleRulePress = (rule: IncomeRule) => {
    setSelectedRule(rule);
    setShowFormModal(true);
  };

  const handleAddNew = () => {
    setSelectedRule(null);
    setShowFormModal(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.title}>Income Scheduler</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => {
                loadIncomeRules();
                loadTimeOff();
              }}
            />
          }
        >
          {groupedRules.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#bdc3c7" />
              <Text style={styles.emptyText}>No income rules yet</Text>
              <Text style={styles.emptySubtext}>Tap + to create your first rule</Text>
            </View>
          ) : (
            groupedRules.map((group) => (
              <View key={group.source.id} style={styles.sourceCard}>
                <Text style={styles.sourceName}>{group.source.name}</Text>
                {group.rules.map((rule, index) => (
                  <TouchableOpacity
                    key={rule.id}
                    style={[styles.ruleRow, index === 0 && styles.firstRuleRow]}
                    onPress={() => handleRulePress(rule)}
                  >
                    <Text style={styles.ruleFrequency}>{formatFrequency(rule)}</Text>
                    <Text style={styles.ruleAmount}>${rule.amount.toFixed(2)}</Text>
                    <Text style={styles.ruleDateRange}>{formatDateRange(rule)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}

          {/* Time Off Section */}
          {timeOffList.length > 0 && (
            <View style={styles.timeOffSection}>
              <Text style={styles.sectionTitle}>Upcoming Time Off</Text>
              {timeOffList.map((timeOff) => (
                <TouchableOpacity
                  key={timeOff.id}
                  style={styles.timeOffCard}
                  onPress={() => handleTimeOffPress(timeOff)}
                >
                  <View style={styles.timeOffHeader}>
                    <View style={styles.timeOffInfo}>
                      <Text style={styles.timeOffName}>{timeOff.name}</Text>
                      <Text style={styles.timeOffDates}>
                        {format(parseISO(timeOff.start_date), 'MMM d, yyyy')} - {format(parseISO(timeOff.end_date), 'MMM d, yyyy')}
                      </Text>
                      {timeOff.description && (
                        <Text style={styles.timeOffDescription}>{timeOff.description}</Text>
                      )}
                    </View>
                    <View style={styles.timeOffCapacity}>
                      <Text style={styles.capacityLabel}>{timeOff.capacity}%</Text>
                      <Text style={styles.capacitySubtext}>reduced</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* FAB */}
        <FloatingActionButton
          options={[
            {
              label: 'Add Time Off',
              icon: 'calendar-outline',
              onPress: () => {
                setSelectedTimeOff(null);
                setShowTimeOffModal(true);
              },
            },
            {
              label: 'Add Income Rule',
              icon: 'add',
              onPress: handleAddNew,
            },
          ]}
        />

        {/* Form Modal */}
        <IncomeRuleFormModal
          visible={showFormModal}
          onClose={() => {
            setShowFormModal(false);
            setSelectedRule(null);
          }}
          onSuccess={() => {
            loadIncomeRules();
            setShowFormModal(false);
            setSelectedRule(null);
          }}
          incomeRule={selectedRule}
        />

        {/* Time Off Modal */}
        <TimeOffFormModal
          visible={showTimeOffModal}
          onClose={() => setShowTimeOffModal(false)}
          onSuccess={() => {
            loadTimeOff();
            handleTimeOffModalClose();
          }}
          editingTimeOff={selectedTimeOff}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
  sourceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sourceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  firstRuleRow: {
    borderTopWidth: 0,
  },
  ruleFrequency: {
    fontSize: 14,
    color: '#7f8c8d',
    flex: 2,
  },
  ruleAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2ecc71',
    flex: 2,
    textAlign: 'left',
  },
  ruleDateRange: {
    fontSize: 14,
    color: '#7f8c8d',
    flex: 2,
    textAlign: 'right',
  },
  timeOffSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  timeOffCard: {
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
  timeOffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timeOffInfo: {
    flex: 1,
    marginRight: 12,
  },
  timeOffName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  timeOffDates: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  timeOffDescription: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  timeOffCapacity: {
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  capacityLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f39c12',
  },
  capacitySubtext: {
    fontSize: 11,
    color: '#e67e22',
  },
});
