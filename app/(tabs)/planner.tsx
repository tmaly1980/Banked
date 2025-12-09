import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TabScreenHeader from '@/components/TabScreenHeader';
import CalculatorInput from '@/components/CalculatorInput';
import DateInput from '@/components/DateInput';
import { startOfWeek, addDays, format, isSameDay } from 'date-fns';

type Frequency = 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
type PayType = 'regular' | 'varies';

interface DailyAmount {
  sunday: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
}

interface IncomeSource {
  id: string;
  name: string;
  frequency: Frequency;
  amount: number;
  daysPerWeek?: number;
  payType?: PayType;
  dailyAmounts?: DailyAmount;
}

interface DaySchedule {
  date: Date;
  amount: number;
  sources: { name: string; amount: number }[];
}

interface ChecklistItem {
  id: string;
  name: string;
  amount: string;
  dueDate: string;
  completed: boolean;
}

type Urgency = 'Urgent' | 'High' | 'Moderate' | 'Low';

interface Priority {
  id: string;
  name: string;
  amount?: string;
  dueDate?: string;
  urgency?: Urgency;
  checklist: ChecklistItem[];
}

const STORAGE_KEY = '@planner_income_sources';
const BALANCE_STORAGE_KEY = '@planner_account_balance';
const PRIORITIES_STORAGE_KEY = '@planner_priorities';

export default function PlannerScreen() {
  const [activeTab, setActiveTab] = useState<'income' | 'priorities'>('income');
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [accountBalance, setAccountBalance] = useState(0);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showPriorityView, setShowPriorityView] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  const [priorityForm, setPriorityForm] = useState({
    name: '',
    amount: '',
    dueDate: '',
    urgency: undefined as Urgency | undefined,
  });
  const [newChecklistItem, setNewChecklistItem] = useState({
    name: '',
    amount: '',
    dueDate: '',
  });
  const [formData, setFormData] = useState({
    name: '',
    frequency: 'monthly' as Frequency,
    amount: '',
    daysPerWeek: 5,
    payType: 'regular' as PayType,
    dailyAmounts: {
      sunday: '',
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      saturday: '',
    },
  });

  // Load from AsyncStorage on mount
  useEffect(() => {
    loadIncomeSources();
    loadAccountBalance();
    loadPriorities();
  }, []);

  // Save to AsyncStorage whenever income sources change
  useEffect(() => {
    if (incomeSources.length > 0) {
      saveIncomeSources();
    }
  }, [incomeSources]);

  const loadIncomeSources = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setIncomeSources(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading income sources:', error);
    }
  };

  const saveIncomeSources = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(incomeSources));
    } catch (error) {
      console.error('Error saving income sources:', error);
    }
  };

  const loadAccountBalance = async () => {
    try {
      const stored = await AsyncStorage.getItem(BALANCE_STORAGE_KEY);
      if (stored) {
        setAccountBalance(parseFloat(stored));
      }
    } catch (error) {
      console.error('Error loading account balance:', error);
    }
  };

  const saveAccountBalance = async (balance: number) => {
    try {
      await AsyncStorage.setItem(BALANCE_STORAGE_KEY, balance.toString());
      setAccountBalance(balance);
    } catch (error) {
      console.error('Error saving account balance:', error);
    }
  };

  const handleSaveBalance = () => {
    const balance = parseFloat(balanceInput) || 0;
    saveAccountBalance(balance);
    setShowBalanceModal(false);
    setBalanceInput('');
  };

  const loadPriorities = async () => {
    try {
      const stored = await AsyncStorage.getItem(PRIORITIES_STORAGE_KEY);
      if (stored) {
        setPriorities(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading priorities:', error);
    }
  };

  const savePriorities = async (updatedPriorities: Priority[]) => {
    try {
      await AsyncStorage.setItem(PRIORITIES_STORAGE_KEY, JSON.stringify(updatedPriorities));
      setPriorities(updatedPriorities);
    } catch (error) {
      console.error('Error saving priorities:', error);
    }
  };

  const handleAddPriority = () => {
    if (priorityForm.name) {
      const newPriority: Priority = {
        id: Date.now().toString(),
        name: priorityForm.name,
        amount: priorityForm.amount || undefined,
        dueDate: priorityForm.dueDate || undefined,
        urgency: priorityForm.urgency,
        checklist: [],
      };
      const updated = [...priorities, newPriority];
      savePriorities(updated);
      setPriorityForm({ name: '', amount: '', dueDate: '', urgency: undefined });
      setShowPriorityModal(false);
    }
  };

  const handleDeletePriority = (id: string) => {
    const updated = priorities.filter(p => p.id !== id);
    savePriorities(updated);
  };

  const handleAddChecklistItem = () => {
    if (selectedPriority && newChecklistItem.name) {
      const item: ChecklistItem = {
        id: Date.now().toString(),
        name: newChecklistItem.name,
        amount: newChecklistItem.amount,
        dueDate: newChecklistItem.dueDate,
        completed: false,
      };
      const updated = priorities.map(p =>
        p.id === selectedPriority.id
          ? { ...p, checklist: [...p.checklist, item] }
          : p
      );
      savePriorities(updated);
      setSelectedPriority({ ...selectedPriority, checklist: [...selectedPriority.checklist, item] });
      setNewChecklistItem({ name: '', amount: '', dueDate: '' });
    }
  };

  const handleToggleChecklistItem = (itemId: string) => {
    if (selectedPriority) {
      const updated = priorities.map(p =>
        p.id === selectedPriority.id
          ? {
              ...p,
              checklist: p.checklist.map(item =>
                item.id === itemId ? { ...item, completed: !item.completed } : item
              ),
            }
          : p
      );
      savePriorities(updated);
      setSelectedPriority({
        ...selectedPriority,
        checklist: selectedPriority.checklist.map(item =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        ),
      });
    }
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    if (selectedPriority) {
      const updated = priorities.map(p =>
        p.id === selectedPriority.id
          ? { ...p, checklist: p.checklist.filter(item => item.id !== itemId) }
          : p
      );
      savePriorities(updated);
      setSelectedPriority({ ...selectedPriority, checklist: selectedPriority.checklist.filter(item => item.id !== itemId) });
    }
  };

  const handleAddSource = () => {
    if (formData.name && (formData.amount || formData.frequency === 'daily')) {
      const newSource: IncomeSource = {
        id: Date.now().toString(),
        name: formData.name,
        frequency: formData.frequency,
        amount: parseFloat(formData.amount) || 0,
        daysPerWeek: formData.frequency === 'daily' ? formData.daysPerWeek : undefined,
        payType: formData.frequency === 'daily' ? formData.payType : undefined,
        dailyAmounts: formData.frequency === 'daily' && formData.payType === 'varies' 
          ? formData.dailyAmounts 
          : undefined,
      };
      setIncomeSources([...incomeSources, newSource]);
      resetForm();
      setShowBottomSheet(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      frequency: 'monthly',
      amount: '',
      daysPerWeek: 5,
      payType: 'regular',
      dailyAmounts: {
        sunday: '',
        monday: '',
        tuesday: '',
        wednesday: '',
        thursday: '',
        friday: '',
        saturday: '',
      },
    });
  };

  const handleDeleteSource = (id: string) => {
    setIncomeSources(incomeSources.filter(source => source.id !== id));
  };

  const getFrequencyLabel = (frequency: Frequency): string => {
    const labels = {
      daily: 'Daily',
      weekly: 'Weekly',
      'bi-weekly': 'Bi-Weekly',
      monthly: 'Monthly',
    };
    return labels[frequency];
  };

  // Generate 6-week schedule
  const generateSchedule = (): DaySchedule[] => {
    const schedule: DaySchedule[] = [];
    const today = new Date();
    const startDate = startOfWeek(today);

    for (let i = 0; i < 42; i++) {
      const date = addDays(startDate, i);
      const dayOfWeek = date.getDay();
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek] as keyof DailyAmount;
      
      let dayAmount = 0;
      const daySources: { name: string; amount: number }[] = [];

      incomeSources.forEach(source => {
        let sourceAmount = 0;

        if (source.frequency === 'daily') {
          if (source.payType === 'varies' && source.dailyAmounts) {
            const amountStr = source.dailyAmounts[dayName];
            sourceAmount = parseFloat(amountStr) || 0;
          } else {
            // Regular daily pay
            sourceAmount = source.amount;
          }
        } else if (source.frequency === 'weekly') {
          // Weekly on same day as start date
          if (dayOfWeek === 0) sourceAmount = source.amount;
        } else if (source.frequency === 'bi-weekly') {
          // Bi-weekly on same day, every other week
          const weeksSinceStart = Math.floor(i / 7);
          if (dayOfWeek === 0 && weeksSinceStart % 2 === 0) sourceAmount = source.amount;
        } else if (source.frequency === 'monthly') {
          // Monthly on first day of month
          if (date.getDate() === 1) sourceAmount = source.amount;
        }

        if (sourceAmount > 0) {
          dayAmount += sourceAmount;
          daySources.push({ name: source.name, amount: sourceAmount });
        }
      });

      schedule.push({ date, amount: dayAmount, sources: daySources });
    }

    return schedule;
  };

  const schedule = incomeSources.length > 0 ? generateSchedule() : [];

  // Calculate running balance
  let runningBalance = accountBalance;
  const scheduleWithBalance = schedule.map((day) => {
    runningBalance += day.amount;
    return {
      ...day,
      balance: runningBalance,
    };
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TabScreenHeader title="Planner" />
        
        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'income' && styles.tabActive]}
            onPress={() => setActiveTab('income')}
          >
            <Text style={[styles.tabText, activeTab === 'income' && styles.tabTextActive]}>
              Income
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'priorities' && styles.tabActive]}
            onPress={() => setActiveTab('priorities')}
          >
            <Text style={[styles.tabText, activeTab === 'priorities' && styles.tabTextActive]}>
              Priorities
            </Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          {activeTab === 'income' ? (
            <>
          {/* Income Sources */}
          {incomeSources.length > 0 && (
            <View style={styles.sourcesSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Income Sources</Text>
                <TouchableOpacity
                  style={styles.addSourceHeaderButton}
                  onPress={() => setShowBottomSheet(true)}
                >
                  <Ionicons name="add" size={20} color="#9b59b6" />
                  <Text style={styles.addSourceHeaderButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              {incomeSources.map((source) => (
                <View key={source.id} style={styles.sourceRow}>
                  <View style={styles.sourceInfo}>
                    <Text style={styles.sourceName}>{source.name}</Text>
                    <Text style={styles.sourceFrequency}>{getFrequencyLabel(source.frequency)}</Text>
                  </View>
                  <View style={styles.sourceRight}>
                    <Text style={styles.sourceAmount}>${source.amount.toFixed(2)}</Text>
                    <TouchableOpacity onPress={() => handleDeleteSource(source.id)}>
                      <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Empty State */}
          {incomeSources.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#bdc3c7" />
              <Text style={styles.emptyStateText}>
                Add your first source of income to display a baseline revenue schedule
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => setShowBottomSheet(true)}
              >
                <Text style={styles.emptyStateButtonText}>Add Income Source</Text>
              </TouchableOpacity>
            </View>
          )}
            </>
          ) : (
            <>
              {/* Priorities */}
              {priorities.length > 0 && (
                <View style={styles.sourcesSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Spending Priorities</Text>
                    <TouchableOpacity
                      style={styles.addSourceHeaderButton}
                      onPress={() => setShowPriorityModal(true)}
                    >
                      <Ionicons name="add" size={20} color="#9b59b6" />
                      <Text style={styles.addSourceHeaderButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                  {priorities.map((priority) => (
                    <TouchableOpacity
                      key={priority.id}
                      style={styles.sourceRow}
                      onPress={() => {
                        setSelectedPriority(priority);
                        setShowPriorityView(true);
                      }}
                    >
                      <View style={styles.sourceInfo}>
                        <Text style={styles.sourceName}>{priority.name}</Text>
                        {priority.dueDate && (
                          <Text style={styles.sourceFrequency}>
                            Due: {format(new Date(priority.dueDate), 'MMM d, yyyy')}
                          </Text>
                        )}
                      </View>
                      <View style={styles.sourceRight}>
                        {priority.amount && (
                          <Text style={styles.sourceAmount}>${parseFloat(priority.amount).toFixed(2)}</Text>
                        )}
                        <TouchableOpacity onPress={(e) => {
                          e.stopPropagation();
                          handleDeletePriority(priority.id);
                        }}>
                          <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Empty State for Priorities */}
              {priorities.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="list-outline" size={64} color="#bdc3c7" />
                  <Text style={styles.emptyStateText}>
                    Add your first spending priority to track goals and expenses
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={() => setShowPriorityModal(true)}
                  >
                    <Text style={styles.emptyStateButtonText}>Add Priority</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* Upcoming Schedule - Shows for both tabs */}
          {scheduleWithBalance.length > 0 && (
            <View style={styles.scheduleSection}>
              <Text style={styles.sectionTitle}>Upcoming Schedule</Text>
              <View style={styles.ledger}>
                <TouchableOpacity
                  style={styles.ledgerEntry}
                  onPress={() => {
                    setBalanceInput(accountBalance.toString());
                    setShowBalanceModal(true);
                  }}
                >
                  <Text style={styles.ledgerSource}>Account Balance</Text>
                  <Text style={styles.ledgerAmount}>${accountBalance.toFixed(2)}</Text>
                </TouchableOpacity>
                {scheduleWithBalance.map((day, index) => {
                  if (day.amount === 0) return null;
                  const isSaturday = day.date.getDay() === 6;
                  
                  return (
                    <React.Fragment key={index}>
                      {day.sources.map((source, idx) => (
                        <View key={`${index}-${idx}`} style={styles.ledgerEntry}>
                          <Text style={styles.ledgerDate}>
                            {format(day.date, 'EEE MMM d')}
                          </Text>
                          <Text style={styles.ledgerSource}>{source.name}</Text>
                          <Text style={styles.ledgerAmount}>${source.amount.toFixed(2)}</Text>
                        </View>
                      ))}
                      <View style={[styles.ledgerBalance, isSaturday && styles.weeklyTotalBalance]}>
                        {isSaturday && <Text style={styles.weeklyTotalLabel}>Weekly Total</Text>}
                        <Text style={styles.ledgerBalanceAmount}>${day.balance.toFixed(2)}</Text>
                      </View>
                    </React.Fragment>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Bottom Sheet Modal */}
      <Modal
        visible={showBottomSheet}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBottomSheet(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1}
            onPress={() => setShowBottomSheet(false)}
          />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => {
                setShowBottomSheet(false);
                resetForm();
              }}>
                <Text style={styles.headerButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>Add Income Source</Text>
              <TouchableOpacity onPress={handleAddSource}>
                <Text style={[styles.headerButton, styles.saveButton]}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sheetContent}>
              <TextInput
                style={styles.input}
                placeholder="Income source name"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholderTextColor="#95a5a6"
              />

              <Text style={styles.label}>Frequency</Text>
              <View style={styles.frequencyButtons}>
                {(['daily', 'weekly', 'bi-weekly', 'monthly'] as Frequency[]).map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyButton,
                      formData.frequency === freq && styles.frequencyButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, frequency: freq })}
                  >
                    <Text
                      style={[
                        styles.frequencyButtonText,
                        formData.frequency === freq && styles.frequencyButtonTextActive,
                      ]}
                    >
                      {getFrequencyLabel(freq)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Daily Frequency Options */}
              {formData.frequency === 'daily' && (
                <>
                  <Text style={styles.label}>Days Per Week</Text>
                  <View style={styles.daysPerWeekButtons}>
                    {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                      <TouchableOpacity
                        key={days}
                        style={[
                          styles.daysButton,
                          formData.daysPerWeek === days && styles.daysButtonActive,
                        ]}
                        onPress={() => setFormData({ ...formData, daysPerWeek: days })}
                      >
                        <Text
                          style={[
                            styles.daysButtonText,
                            formData.daysPerWeek === days && styles.daysButtonTextActive,
                          ]}
                        >
                          {days}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Pay Type</Text>
                  <View style={styles.payTypeButtons}>
                    <TouchableOpacity
                      style={[
                        styles.payTypeButton,
                        formData.payType === 'regular' && styles.payTypeButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, payType: 'regular' })}
                    >
                      <Text
                        style={[
                          styles.payTypeButtonText,
                          formData.payType === 'regular' && styles.payTypeButtonTextActive,
                        ]}
                      >
                        Regular
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.payTypeButton,
                        formData.payType === 'varies' && styles.payTypeButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, payType: 'varies' })}
                    >
                      <Text
                        style={[
                          styles.payTypeButtonText,
                          formData.payType === 'varies' && styles.payTypeButtonTextActive,
                        ]}
                      >
                        Varies
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Amount Input - Show for non-daily or regular daily */}
              {(formData.frequency !== 'daily' || formData.payType === 'regular') && (
                <>
                  <Text style={styles.label}>Amount</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="$0.00"
                    value={formData.amount}
                    onChangeText={(text) => setFormData({ ...formData, amount: text })}
                    keyboardType="decimal-pad"
                    placeholderTextColor="#95a5a6"
                  />
                </>
              )}

              {/* Daily Varying Amounts */}
              {formData.frequency === 'daily' && formData.payType === 'varies' && (
                <View style={styles.dailyAmountsContainer}>
                  {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => (
                    <View key={day} style={styles.dailyAmountRow}>
                      <Text style={styles.dayLabel}>
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </Text>
                      <TextInput
                        style={styles.dailyAmountInput}
                        placeholder="$0.00"
                        value={formData.dailyAmounts[day as keyof DailyAmount]}
                        onChangeText={(text) => setFormData({
                          ...formData,
                          dailyAmounts: {
                            ...formData.dailyAmounts,
                            [day]: text,
                          },
                        })}
                        keyboardType="numeric"
                      />
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Account Balance Modal */}
      <Modal
        visible={showBalanceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBalanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowBalanceModal(false)}
          />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => {
                setShowBalanceModal(false);
                setBalanceInput('');
              }}>
                <Text style={styles.headerButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>Account Balance</Text>
              <TouchableOpacity onPress={handleSaveBalance}>
                <Text style={[styles.headerButton, styles.saveButton]}>Save</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sheetContent}>
              <CalculatorInput
                label="Current Balance"
                placeholder="$0.00"
                value={balanceInput}
                onChangeText={setBalanceInput}
                keyboardType="decimal-pad"
                placeholderTextColor="#95a5a6"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Priority Modal */}
      <Modal
        visible={showPriorityModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPriorityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowPriorityModal(false)}
          />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => {
                setShowPriorityModal(false);
                setPriorityForm({ name: '', amount: '', dueDate: '', urgency: undefined });
              }}>
                <Text style={styles.headerButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>Add Spending Goal</Text>
              <TouchableOpacity onPress={handleAddPriority}>
                <Text style={[styles.headerButton, styles.saveButton]}>Save</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sheetContent}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Priority name"
                value={priorityForm.name}
                onChangeText={(text) => setPriorityForm({ ...priorityForm, name: text })}
                placeholderTextColor="#95a5a6"
              />

              <Text style={styles.label}>Urgency</Text>
              <View style={styles.urgencyButtons}>
                {(['Urgent', 'High', 'Moderate', 'Low'] as Urgency[]).map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.urgencyButton,
                      priorityForm.urgency === level && styles.urgencyButtonActive,
                    ]}
                    onPress={() => setPriorityForm({ ...priorityForm, urgency: level })}
                  >
                    <Text
                      style={[
                        styles.urgencyButtonText,
                        priorityForm.urgency === level && styles.urgencyButtonTextActive,
                      ]}
                    >
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.formRow}>
                <View style={styles.formColumn}>
                  <CalculatorInput
                    label="Amount (optional)"
                    placeholder="$0.00"
                    value={priorityForm.amount}
                    onChangeText={(text) => setPriorityForm({ ...priorityForm, amount: text })}
                    keyboardType="decimal-pad"
                    placeholderTextColor="#95a5a6"
                  />
                </View>

                <View style={styles.formColumn}>
                  <DateInput
                    label="Due Date (optional)"
                    value={priorityForm.dueDate}
                    onChangeDate={(date) => setPriorityForm({ ...priorityForm, dueDate: date })}
                    placeholder="MM/DD/YYYY"
                  />
                </View>
              </View>

            </View>
          </View>
        </View>
      </Modal>

      {/* Priority View Modal */}
      <Modal
        visible={showPriorityView}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPriorityView(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowPriorityView(false)}
          />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setShowPriorityView(false)}>
                <Text style={styles.headerButton}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>{selectedPriority?.name}</Text>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView style={styles.sheetContent}>
              {selectedPriority?.amount && (
                <View style={styles.priorityDetail}>
                  <Text style={styles.priorityDetailLabel}>Amount:</Text>
                  <Text style={styles.priorityDetailValue}>${parseFloat(selectedPriority.amount).toFixed(2)}</Text>
                </View>
              )}

              {selectedPriority?.dueDate && (
                <View style={styles.priorityDetail}>
                  <Text style={styles.priorityDetailLabel}>Due Date:</Text>
                  <Text style={styles.priorityDetailValue}>
                    {format(new Date(selectedPriority.dueDate), 'MMM d, yyyy')}
                  </Text>
                </View>
              )}

              <View style={styles.checklistSection}>
                <Text style={styles.sectionTitle}>Checklist</Text>
                
                {selectedPriority?.checklist.map((item) => (
                  <View key={item.id} style={styles.checklistItem}>
                    <TouchableOpacity
                      onPress={() => handleToggleChecklistItem(item.id)}
                      style={styles.checklistCheckbox}
                    >
                      <Ionicons
                        name={item.completed ? 'checkbox' : 'square-outline'}
                        size={24}
                        color={item.completed ? '#27ae60' : '#7f8c8d'}
                      />
                    </TouchableOpacity>
                    <View style={styles.checklistInfo}>
                      <Text style={[styles.checklistName, item.completed && styles.checklistNameCompleted]}>
                        {item.name}
                      </Text>
                      <View style={styles.checklistMeta}>
                        {item.amount && (
                          <Text style={styles.checklistMetaText}>${parseFloat(item.amount).toFixed(2)}</Text>
                        )}
                        {item.dueDate && (
                          <Text style={styles.checklistMetaText}>
                            {format(new Date(item.dueDate), 'MMM d')}
                          </Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteChecklistItem(item.id)}>
                      <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={styles.addChecklistForm}>
                  <TextInput
                    style={styles.checklistInput}
                    placeholder="New item"
                    value={newChecklistItem.name}
                    onChangeText={(text) => setNewChecklistItem({ ...newChecklistItem, name: text })}
                    placeholderTextColor="#95a5a6"
                  />
                  <TextInput
                    style={styles.checklistInputSmall}
                    placeholder="$0.00"
                    value={newChecklistItem.amount}
                    onChangeText={(text) => setNewChecklistItem({ ...newChecklistItem, amount: text })}
                    keyboardType="decimal-pad"
                    placeholderTextColor="#95a5a6"
                  />
                  <TouchableOpacity
                    style={styles.addChecklistButton}
                    onPress={handleAddChecklistItem}
                  >
                    <Ionicons name="add" size={24} color="#9b59b6" />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  sourcesSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  addSourceHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3e5f5',
    borderRadius: 6,
  },
  addSourceHeaderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9b59b6',
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 3,
  },
  sourceFrequency: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  sourceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sourceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  addSourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9b59b6',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addSourceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9b59b6',
    marginLeft: 6,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#7f8c8d',
    marginTop: 20,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyStateButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  scheduleSection: {
    marginTop: 8,
  },
  ledger: {
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ledgerEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  ledgerDate: {
    fontSize: 13,
    color: '#7f8c8d',
    width: 90,
  },
  ledgerSource: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  ledgerAmount: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '600',
    textAlign: 'right',
    minWidth: 80,
  },
  ledgerBalance: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  ledgerBalanceLabel: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  ledgerBalanceAmount: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: 'bold',
  },
  weeklyTotalBalance: {
    borderBottomWidth: 3,
    borderBottomColor: '#27ae60',
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  weeklyTotalLabel: {
    fontSize: 13,
    color: '#27ae60',
    fontWeight: '600',
  },
  weeklyTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#e8f5e9',
    borderBottomWidth: 2,
    borderBottomColor: '#27ae60',
    marginBottom: 12,
  },
  weeklyTotalLabel: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: 'bold',
  },
  weeklyTotalAmount: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: 'bold',
  },
  scheduleDay: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  scheduleDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  scheduleDayDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
  },
  scheduleDayAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  scheduleSource: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  scheduleSourceName: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  scheduleSourceAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#27ae60',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  sheetContent: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    marginBottom: 16,
  },
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  frequencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  frequencyButtonActive: {
    backgroundColor: '#9b59b6',
    borderColor: '#9b59b6',
  },
  frequencyButtonText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  frequencyButtonTextActive: {
    color: 'white',
  },
  daysPerWeekButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  daysButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  daysButtonActive: {
    backgroundColor: '#9b59b6',
    borderColor: '#9b59b6',
  },
  daysButtonText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  daysButtonTextActive: {
    color: 'white',
  },
  payTypeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  payTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    alignItems: 'center',
  },
  payTypeButtonActive: {
    backgroundColor: '#9b59b6',
    borderColor: '#9b59b6',
  },
  payTypeButtonText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  payTypeButtonTextActive: {
    color: 'white',
  },
  dailyAmountsContainer: {
    marginBottom: 16,
  },
  dailyAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    width: 100,
  },
  dailyAmountInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#9b59b6',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  tabTextActive: {
    color: '#9b59b6',
  },
  priorityDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    marginBottom: 8,
  },
  priorityDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  priorityDetailValue: {
    fontSize: 14,
    color: '#2c3e50',
  },
  checklistSection: {
    marginTop: 20,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  checklistCheckbox: {
    marginRight: 12,
  },
  checklistInfo: {
    flex: 1,
  },
  checklistName: {
    fontSize: 15,
    color: '#2c3e50',
    marginBottom: 4,
  },
  checklistNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#95a5a6',
  },
  checklistMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  checklistMetaText: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  addChecklistForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  checklistInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  checklistInputSmall: {
    width: 80,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  addChecklistButton: {
    backgroundColor: '#f3e5f5',
    borderRadius: 8,
    padding: 8,
  },
  urgencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  urgencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  urgencyButtonActive: {
    backgroundColor: '#9b59b6',
    borderColor: '#9b59b6',
  },
  urgencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  urgencyButtonTextActive: {
    color: 'white',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formColumn: {
    flex: 1,
  },
});

