import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useBills } from '@/contexts/BillsContext';
import TabScreenHeader from '@/components/TabScreenHeader';
import SelectPicker from '@/components/SelectPicker';
import AddPurchaseModal from '@/components/modals/AddPurchaseModal';
import ViewPurchaseModal from '@/components/modals/ViewPurchaseModal';
import { ExpenseType, ExpenseBudget, ExpensePurchase } from '@/types';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isThisWeek, isSameDay } from 'date-fns';
import { InlineAlert } from '@/components/InlineAlert';
import { useInlineAlert } from '@/hooks/useInlineAlert';
import { formatAmount } from '@/lib/utils';
import { globalStyles } from '@/lib/globalStyles';

type TabType = 'weekly' | 'upcoming';

interface GroupedPurchases {
  type: ExpenseType;
  purchases: ExpensePurchase[];
  total: number;
}

export default function ExpensesScreen() {
  const { 
    expenseBudgets, 
    expensePurchases, 
    expenseTypes, 
    loading, 
    refreshData,
    createExpenseBudget,
    updateExpenseBudget,
    createExpensePurchase,
    updateExpensePurchase,
    deleteExpensePurchase
  } = useBills();
  
  const { alert, showError, showSuccess, hideAlert } = useInlineAlert();
  const [activeTab, setActiveTab] = useState<TabType>('weekly');
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [addPurchaseModalVisible, setAddPurchaseModalVisible] = useState(false);
  const [viewPurchaseModalVisible, setViewPurchaseModalVisible] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<ExpensePurchase | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 0 });

  // Group purchases by expense type for the selected week
  const weeklyPurchases = useMemo(() => {
    const groups: GroupedPurchases[] = [];
    const typeIds = new Set<string>();

    // Filter purchases for selected week
    const purchasesInWeek = expensePurchases.filter(p => {
      if (!p.purchase_date) return false;
      const purchaseDate = new Date(p.purchase_date);
      return purchaseDate >= weekStart && purchaseDate <= weekEnd;
    });

    // Group by type
    purchasesInWeek.forEach(p => typeIds.add(p.expense_type_id));

    typeIds.forEach(typeId => {
      const type = expenseTypes.find(t => t.id === typeId);
      if (!type) return;

      const typePurchases = purchasesInWeek
        .filter(p => p.expense_type_id === typeId)
        .sort((a, b) => {
          const dateA = new Date(a.purchase_date!).getTime();
          const dateB = new Date(b.purchase_date!).getTime();
          return dateA - dateB;
        });

      const total = typePurchases.reduce((sum, p) => sum + (p.purchase_amount || 0), 0);

      groups.push({ type, purchases: typePurchases, total });
    });

    return groups.sort((a, b) => a.type.order - b.type.order);
  }, [expensePurchases, expenseTypes, weekStart, weekEnd]);

  // Group upcoming purchases (no date) by expense type
  const upcomingPurchases = useMemo(() => {
    const groups: GroupedPurchases[] = [];
    const typeIds = new Set<string>();

    // Filter purchases without dates
    const purchasesWithoutDate = expensePurchases.filter(p => !p.purchase_date);

    purchasesWithoutDate.forEach(p => typeIds.add(p.expense_type_id));

    typeIds.forEach(typeId => {
      const type = expenseTypes.find(t => t.id === typeId);
      if (!type) return;

      const typePurchases = purchasesWithoutDate
        .filter(p => p.expense_type_id === typeId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const total = typePurchases.reduce((sum, p) => sum + (p.purchase_amount || p.estimated_amount || 0), 0);

      groups.push({ type, purchases: typePurchases, total });
    });

    return groups.sort((a, b) => a.type.order - b.type.order);
  }, [expensePurchases, expenseTypes]);

  // Calculate totals for footer
  const { totalPurchases, totalBudget } = useMemo(() => {
    if (activeTab === 'weekly') {
      const weekStartDate = format(weekStart, 'yyyy-MM-dd');
      
      // Total purchases for the week
      const purchases = weeklyPurchases.reduce((sum, group) => sum + group.total, 0);
      
      // Total budget for the week
      const budgets = expenseBudgets
        .filter(b => b.start_date === weekStartDate)
        .reduce((sum, b) => sum + b.amount, 0);
      
      return { totalPurchases: purchases, totalBudget: budgets };
    } else {
      // Upcoming view
      const purchases = upcomingPurchases.reduce((sum, group) => sum + group.total, 0);
      
      // No budget for upcoming (undated) purchases
      return { totalPurchases: purchases, totalBudget: 0 };
    }
  }, [activeTab, weeklyPurchases, upcomingPurchases, expenseBudgets, weekStart]);

  const handlePreviousWeek = () => {
    setSelectedWeek(subWeeks(selectedWeek, 1));
  };

  const handleNextWeek = () => {
    setSelectedWeek(addWeeks(selectedWeek, 1));
  };

  const handleThisWeek = () => {
    setSelectedWeek(new Date());
  };

  const handleAddPurchase = () => {
    setAddPurchaseModalVisible(true);
  };

  const handlePurchaseAdded = async (data: { description?: string; expense_type_id: string; amount: number; purchase_date: string }) => {
    try {
      const purchaseData = {
        expense_type_id: data.expense_type_id,
        description: data.description,
        amount: data.amount,
        purchase_date: data.purchase_date,
      };
      
      const { data: purchase, error } = await createExpensePurchase(purchaseData);
      if (error) throw error;
      
      setAddPurchaseModalVisible(false);
      showSuccess('Purchase added successfully');
      
      await refreshData();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to add purchase');
    }
  };

  const handleUpdatePurchase = async (id: string, updates: {
    description?: string;
    estimated_amount?: number;
    purchase_amount?: number;
    purchase_date?: string;
    checklist?: any[];
    photos?: string[];
  }) => {
    try {
      const { error } = await updateExpensePurchase(id, updates);
      if (error) throw error;
      
      await refreshData();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to update purchase');
    }
  };

  const handlePurchasePress = (purchase: ExpensePurchase) => {
    setSelectedPurchase(purchase);
    setViewPurchaseModalVisible(true);
  };

  const handleDeletePurchase = async (id: string) => {
    try {
      const { error } = await deleteExpensePurchase(id);
      if (error) throw error;
      
      showSuccess('Purchase deleted');
      await refreshData();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to delete purchase');
    }
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>, purchaseId: string) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeletePurchase(purchaseId)}
      >
        <Animated.View style={{ transform: [{ translateX: trans }] }}>
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
      <TabScreenHeader
        title="Expenses"
        rightContent={
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: '#27ae60' }]}
            onPress={handleAddPurchase}
          >
            <Text style={styles.headerButtonText}>+ Add</Text>
          </TouchableOpacity>
        }
      />

      {/* Tab Selector - only show if there are upcoming purchases */}
      {upcomingPurchases.length > 0 && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'weekly' && styles.activeTab]}
            onPress={() => setActiveTab('weekly')}
          >
            <Text style={[styles.tabText, activeTab === 'weekly' && styles.activeTabText]}>
              Weekly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
              Upcoming
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Week Selector (only for Weekly tab) */}
      {activeTab === 'weekly' && (
        <View style={styles.weekSelector}>
          <TouchableOpacity onPress={handlePreviousWeek} style={styles.weekArrow}>
            <Ionicons name="chevron-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          
          <View style={styles.weekLabelContainer}>
            <Text style={styles.weekLabel}>
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
            </Text>
            {!isThisWeek(selectedWeek) && (
              <TouchableOpacity onPress={handleThisWeek} style={styles.todayButton}>
                <Ionicons name="calendar-outline" size={20} color="#3498db" />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity onPress={handleNextWeek} style={styles.weekArrow}>
            <Ionicons name="chevron-forward" size={24} color="#2c3e50" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshData} />
        }
      >
        <InlineAlert
          type={alert.type}
          message={alert.message}
          visible={alert.visible}
          onDismiss={hideAlert}
        />

        {activeTab === 'weekly' ? (
          // Weekly View
          weeklyPurchases.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#bdc3c7" />
              <Text style={styles.emptyStateText}>No purchases this week</Text>
              <Text style={styles.emptyStateSubtext}>
                Add a purchase to track your weekly expenses
              </Text>
            </View>
          ) : (
            weeklyPurchases.map((group) => (
              <View key={group.type.id} style={styles.categoryGroup}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName}>{group.type.name}</Text>
                  <Text style={styles.categoryTotal}>{formatAmount(group.total)}</Text>
                </View>
                <View style={styles.categoryCard}>
                  {group.purchases.map((purchase, index) => (
                    <Swipeable
                      key={purchase.id}
                      renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, purchase.id)}
                    >
                      <TouchableOpacity
                        style={[
                          styles.purchaseRow,
                          index < group.purchases.length - 1 && styles.purchaseRowBorder
                        ]}
                        onPress={() => handlePurchasePress(purchase)}
                      >
                        <View style={styles.purchaseLeft}>
                          <Text style={styles.purchaseDate}>
                            {format(new Date(purchase.purchase_date!), 'MMM d')}
                          </Text>
                          <Text style={styles.purchaseDescription}>
                            {purchase.description || group.type.name}
                          </Text>
                        </View>
                        <Text style={styles.purchaseAmount}>
                          {formatAmount(purchase.purchase_amount || 0)}
                        </Text>
                      </TouchableOpacity>
                    </Swipeable>
                  ))}
                </View>
              </View>
            ))
          )
        ) : (
          // Upcoming View
          upcomingPurchases.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="list-outline" size={64} color="#bdc3c7" />
              <Text style={styles.emptyStateText}>No upcoming purchases</Text>
              <Text style={styles.emptyStateSubtext}>
                Add purchases without dates to your wishlist
              </Text>
            </View>
          ) : (
            upcomingPurchases.map((group) => (
              <View key={group.type.id} style={styles.categoryGroup}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName}>{group.type.name}</Text>
                  <Text style={styles.categoryTotal}>{formatAmount(group.total)}</Text>
                </View>
                <View style={styles.categoryCard}>
                  {group.purchases.map((purchase, index) => (
                    <Swipeable
                      key={purchase.id}
                      renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, purchase.id)}
                    >
                      <TouchableOpacity
                        style={[
                          styles.purchaseRow,
                          index < group.purchases.length - 1 && styles.purchaseRowBorder
                        ]}
                        onPress={() => handlePurchasePress(purchase)}
                      >
                        <View style={styles.purchaseLeft}>
                          <Text style={styles.purchaseDescription}>
                            {purchase.description || group.type.name}
                          </Text>
                        </View>
                        <Text style={styles.purchaseAmount}>
                          {formatAmount(purchase.purchase_amount || purchase.estimated_amount || 0)}
                        </Text>
                      </TouchableOpacity>
                    </Swipeable>
                  ))}
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* Fixed Footer with Total */}
      <View style={styles.footer}>
        <Text style={styles.footerLabel}>Total</Text>
        <Text style={styles.footerAmount}>
          {formatAmount(totalPurchases)}
          {totalBudget > 0 && (
            <Text style={styles.footerBudget}> / {formatAmount(totalBudget)}</Text>
          )}
        </Text>
      </View>

      {/* Add Purchase Modal */}
      <AddPurchaseModal
        visible={addPurchaseModalVisible}
        onClose={() => setAddPurchaseModalVisible(false)}
        expenseTypes={expenseTypes}
        onSuccess={handlePurchaseAdded}
      />

      {/* View Purchase Modal */}
      <ViewPurchaseModal
        visible={viewPurchaseModalVisible}
        onClose={() => {
          setViewPurchaseModalVisible(false);
          setSelectedPurchase(null);
        }}
        purchase={selectedPurchase}
        expenseType={selectedPurchase ? expenseTypes.find(t => t.id === selectedPurchase.expense_type_id) || null : null}
        budget={selectedPurchase ? expenseBudgets.find(b => b.expense_type_id === selectedPurchase.expense_type_id) || null : null}
        onUpdate={handleUpdatePurchase}
        onDelete={handleDeletePurchase}
      />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3498db',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#7f8c8d',
  },
  activeTabText: {
    color: '#3498db',
    fontWeight: '600',
  },
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  weekArrow: {
    padding: 8,
  },
  weekLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  todayButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7f8c8d',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 8,
    textAlign: 'center',
  },
  categoryGroup: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  categoryTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#27ae60',
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  purchaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  purchaseRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  purchaseLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  purchaseDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7f8c8d',
    minWidth: 50,
  },
  purchaseDescription: {
    fontSize: 15,
    color: '#2c3e50',
    flex: 1,
  },
  purchaseAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 12,
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  footerLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
  },
  footerAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#27ae60',
  },
  footerBudget: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
});
