import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FinancialGoal } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isBefore } from 'date-fns';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import FinancialGoalDetailsModal from '@/components/modals/FinancialGoalDetailsModal';
import FinancialGoalFormModal from '@/components/modals/FinancialGoalFormModal';

type GoalSection = 'thisWeek' | 'thisMonth' | 'later';

interface GroupedGoal {
  goal: FinancialGoal;
  section: GoalSection;
}

export default function GoalsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [groupedGoals, setGroupedGoals] = useState<{
    thisWeek: FinancialGoal[];
    thisMonth: FinancialGoal[];
    later: FinancialGoal[];
  }>({
    thisWeek: [],
    thisMonth: [],
    later: [],
  });
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user?.id)
        .neq('status', 'paid')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      setGoals(data || []);
      groupGoalsByTimeframe(data || []);
    } catch (err) {
      console.error('Error loading goals:', err);
      Alert.alert('Error', 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const groupGoalsByTimeframe = (goalsList: FinancialGoal[]) => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const thisWeek: FinancialGoal[] = [];
    const thisMonth: FinancialGoal[] = [];
    const later: FinancialGoal[] = [];

    goalsList.forEach((goal) => {
      if (goal.due_date) {
        const dueDate = parseISO(goal.due_date);
        if (dueDate >= weekStart && dueDate <= weekEnd) {
          thisWeek.push(goal);
        } else if (dueDate >= monthStart && dueDate <= monthEnd) {
          thisMonth.push(goal);
        } else {
          later.push(goal);
        }
      } else if (goal.due_week) {
        // Week format: YYYY-Www
        const currentWeek = format(weekStart, "yyyy-'W'ww");
        if (goal.due_week === currentWeek) {
          thisWeek.push(goal);
        } else {
          later.push(goal);
        }
      } else if (goal.due_month) {
        const currentMonth = format(now, 'yyyy-MM');
        if (goal.due_month === currentMonth) {
          thisMonth.push(goal);
        } else {
          later.push(goal);
        }
      } else {
        later.push(goal);
      }
    });

    setGroupedGoals({ thisWeek, thisMonth, later });
  };

  const handleGoalPress = (goal: FinancialGoal) => {
    setSelectedGoal(goal);
    setShowDetailsModal(true);
  };

  const handleAddGoal = () => {
    setSelectedGoal(null);
    setShowFormModal(true);
  };

  const handleDragEnd = async (section: GoalSection, data: FinancialGoal[], fromIndex: number, toIndex: number) => {
    // Check if item moved to a different section
    const movedGoal = data[toIndex];
    
    // Update local state first
    const newGrouped = { ...groupedGoals };
    newGrouped[section] = data;
    setGroupedGoals(newGrouped);

    // Update goal's due date fields based on section
    try {
      let updateData: any = {};
      
      if (section === 'thisWeek') {
        // Set due_date to middle of this week, clear month
        const weekMid = new Date();
        weekMid.setDate(weekMid.getDate() + 3);
        updateData.due_date = format(weekMid, 'yyyy-MM-dd');
        updateData.due_month = null;
        updateData.due_week = null;
      } else if (section === 'thisMonth') {
        // Set due_month to current month, clear due_date
        updateData.due_month = format(new Date(), 'yyyy-MM');
        updateData.due_date = null;
        updateData.due_week = null;
      } else if (section === 'later') {
        // Clear all due dates
        updateData.due_date = null;
        updateData.due_month = null;
        updateData.due_week = null;
      }

      const { error } = await supabase
        .from('financial_goals')
        .update(updateData)
        .eq('id', movedGoal.id);

      if (error) throw error;

      // Reload to ensure consistency
      loadGoals();
    } catch (err) {
      console.error('Error updating goal:', err);
      Alert.alert('Error', 'Failed to update goal');
      loadGoals(); // Reload on error
    }
  };

  const renderGoalItem = ({ item, drag, isActive }: RenderItemParams<FinancialGoal>) => {
    const getStatusColor = () => {
      switch (item.status) {
        case 'paid': return '#27ae60';
        case 'pending': return '#f39c12';
        case 'active': return '#3498db';
        case 'completed': return '#2ecc71';
        case 'cancelled': return '#95a5a6';
        default: return '#3498db';
      }
    };

    const formatDueInfo = () => {
      if (item.due_date) {
        return format(parseISO(item.due_date), 'MMM d, yyyy');
      }
      if (item.due_week) {
        return `Week ${item.due_week}`;
      }
      if (item.due_month) {
        return format(parseISO(item.due_month + '-01'), 'MMMM yyyy');
      }
      return 'No due date';
    };

    return (
      <ScaleDecorator>
        <TouchableOpacity
          style={[
            styles.goalItem,
            isActive && styles.goalItemActive,
          ]}
          onPress={() => handleGoalPress(item)}
          onLongPress={drag}
          disabled={isActive}
        >
          <View style={styles.goalHeader}>
            <View style={styles.goalInfo}>
              <Text style={styles.goalName}>{item.name}</Text>
              <Text style={styles.goalDue}>{formatDueInfo()}</Text>
            </View>
            <View style={styles.goalRight}>
              <Text style={styles.goalAmount}>${item.target_amount.toFixed(2)}</Text>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            </View>
          </View>
          {item.description && (
            <Text style={styles.goalDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.dragIndicator}>
            <Ionicons name="menu" size={20} color="#95a5a6" />
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  const renderSection = (title: string, section: GoalSection, data: FinancialGoal[]) => {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{data.length}</Text>
          </View>
        </View>
        {data.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>No goals in this timeframe</Text>
          </View>
        ) : (
          <DraggableFlatList
            data={data}
            renderItem={renderGoalItem}
            keyExtractor={(item) => item.id}
            onDragEnd={({ data: newData, from, to }) => handleDragEnd(section, newData, from, to)}
            scrollEnabled={false}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Financial Goals</Text>
          <TouchableOpacity onPress={handleAddGoal} style={styles.addButton}>
            <Ionicons name="add" size={28} color="#3498db" />
          </TouchableOpacity>
        </View>

        {/* Goals List */}
        <FlatList
          data={[
            { key: 'thisWeek', title: 'This Week', section: 'thisWeek' as GoalSection, data: groupedGoals.thisWeek },
            { key: 'thisMonth', title: 'This Month', section: 'thisMonth' as GoalSection, data: groupedGoals.thisMonth },
            { key: 'later', title: 'Later', section: 'later' as GoalSection, data: groupedGoals.later },
          ]}
          renderItem={({ item }) => renderSection(item.title, item.section, item.data)}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadGoals}
        />

        {/* Modals */}
        <FinancialGoalDetailsModal
          visible={showDetailsModal}
          goal={selectedGoal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedGoal(null);
          }}
          onUpdate={loadGoals}
        />

        <FinancialGoalFormModal
          visible={showFormModal}
          goal={selectedGoal}
          onClose={() => {
            setShowFormModal(false);
            setSelectedGoal(null);
          }}
          onSuccess={() => {
            setShowFormModal(false);
            setSelectedGoal(null);
            loadGoals();
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
  },
  addButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginRight: 8,
  },
  sectionBadge: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  sectionBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptySection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 14,
    color: '#95a5a6',
  },
  goalItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  goalItemActive: {
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  goalDue: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  goalRight: {
    alignItems: 'flex-end',
  },
  goalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#27ae60',
    marginBottom: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  goalDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  dragIndicator: {
    position: 'absolute',
    right: 8,
    bottom: 8,
  },
});
