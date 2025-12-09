import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useTriage } from '@/contexts/TriageContext';
import type { FinancialGoal, GoalPurchase, AllocationMode, DeadlineType } from '@/contexts/TriageContext';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

export default function GoalDetails() {
  const {
    currentStep,
    setCurrentStep,
    goals,
    updateGoal,
    markGoalPaid,
    incomeSources,
    bankBalance,
    getRemainingBankBalance,
    calculateGoalProjection,
  } = useTriage();

  const goalId = currentStep.replace('goal-', '');
  const goal = goals.find(g => g.id === goalId);

  const [step, setStep] = useState('multiple-purchases');
  const [purchases, setPurchases] = useState<GoalPurchase[]>([]);
  const [newPurchaseName, setNewPurchaseName] = useState('');
  const [newPurchaseAmount, setNewPurchaseAmount] = useState('');
  const [singleAmount, setSingleAmount] = useState('');
  const [deadlineType, setDeadlineType] = useState<DeadlineType | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [useBankBalance, setUseBankBalance] = useState(false);
  const [bankBalanceAmount, setBankBalanceAmount] = useState(0);
  const [allocations, setAllocations] = useState<Array<{ sourceId: string; mode: AllocationMode; percentage?: number; fixedAmount?: number }>>([]);
  const [currentAllocationIndex, setCurrentAllocationIndex] = useState(0);

  if (!goal) {
    setCurrentStep('goals-list');
    return null;
  }

  const addPurchase = () => {
    if (!newPurchaseName.trim() || !newPurchaseAmount.trim()) return;
    
    const purchase: GoalPurchase = {
      id: `purchase-${Date.now()}`,
      name: newPurchaseName.trim(),
      amount: parseFloat(newPurchaseAmount) || 0,
    };
    
    setPurchases([...purchases, purchase]);
    setNewPurchaseName('');
    setNewPurchaseAmount('');
  };

  const deletePurchase = (id: string) => {
    setPurchases(purchases.filter(p => p.id !== id));
  };

  const getTotalAmount = () => {
    if (goal.multiplePurchases) {
      return purchases.reduce((sum, p) => sum + p.amount, 0);
    }
    return parseFloat(singleAmount) || 0;
  };

  const saveGoalDetails = () => {
    const updates: Partial<FinancialGoal> = {
      purchases,
      totalAmount: getTotalAmount(),
      deadlineType,
      dueDate: dueDate || undefined,
      useBankBalance,
      bankBalanceAmount,
      allocations,
    };
    
    updateGoal(goalId, updates);
  };

  const projection = calculateGoalProjection(goalId);

  if (step === 'multiple-purchases') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>{goal.title}</Text>
            
            <Text style={styles.question}>
              Are there multiple purchases/payments involved with this financial goal?
            </Text>
            
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.choiceButton}
                onPress={() => {
                  updateGoal(goalId, { multiplePurchases: true });
                  setStep('add-purchases');
                }}
              >
                <Text style={styles.choiceButtonText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.choiceButton}
                onPress={() => {
                  updateGoal(goalId, { multiplePurchases: false });
                  setStep('single-amount');
                }}
              >
                <Text style={styles.choiceButtonText}>No</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'add-purchases') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>{goal.title}</Text>
          
          <Text style={styles.subtitle}>
            OK, list each purchase/payment separately, one row at a time
          </Text>

          <View style={styles.purchaseForm}>
            <TextInput
              style={[styles.input, { flex: 2 }]}
              value={newPurchaseName}
              onChangeText={setNewPurchaseName}
              placeholder="Name"
              placeholderTextColor="#95a5a6"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={newPurchaseAmount}
              onChangeText={setNewPurchaseAmount}
              placeholder="Amount"
              placeholderTextColor="#95a5a6"
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={styles.addPurchaseButton} onPress={addPurchase}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {purchases.map(purchase => (
            <View key={purchase.id} style={styles.purchaseRow}>
              <Text style={styles.purchaseName}>{purchase.name}</Text>
              <Text style={styles.purchaseAmount}>${purchase.amount.toFixed(2)}</Text>
              <TouchableOpacity onPress={() => deletePurchase(purchase.id)}>
                <Ionicons name="trash-outline" size={20} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          ))}

          {purchases.length > 0 && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalAmount}>${getTotalAmount().toFixed(2)}</Text>
              </View>
              
              <TouchableOpacity
                style={styles.button}
                onPress={() => setStep('deadline')}
              >
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (step === 'single-amount') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>{goal.title}</Text>
          
          <Text style={styles.question}>How much is this item going to cost?</Text>
          <TextInput
            style={styles.input}
            value={singleAmount}
            onChangeText={setSingleAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#95a5a6"
          />

          {singleAmount.trim() && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => setStep('deadline')}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (step === 'deadline') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>{goal.title}</Text>
            
            <Text style={styles.question}>
              OK, is there a particular date this should get done by?
            </Text>
          
          <TouchableOpacity
            style={styles.choiceButton}
            onPress={() => {
              setDeadlineType('catastrophic');
              setStep('deadline-date');
            }}
          >
            <Text style={styles.choiceButtonText}>
              Yes, missing the due date would be catastrophic - give me suggestions on how to make it happen
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.choiceButton}
            onPress={() => {
              setDeadlineType('preferred');
              setStep('deadline-date');
            }}
          >
            <Text style={styles.choiceButtonText}>
              Yes, but it can be late
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.choiceButton}
            onPress={() => {
              setDeadlineType('flexible');
              setStep('bank-balance-question');
            }}
          >
            <Text style={styles.choiceButtonText}>
              No, just tell me when it can safely be paid
            </Text>
          </TouchableOpacity>
        </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'deadline-date') {
    const promptText = deadlineType === 'catastrophic'
      ? 'When must this be paid/done by?'
      : 'When would you like this to be paid/done by?';

    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{goal.title}</Text>
          
          <Text style={styles.question}>{promptText}</Text>
          <TextInput
            style={styles.input}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="MM/DD/YYYY"
            placeholderTextColor="#95a5a6"
          />

          {dueDate.trim() && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => setStep('bank-balance-question')}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (step === 'bank-balance-question') { {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>{goal.title}</Text>
          
          <Text style={styles.question}>
            Do you plan on using any of your bank account balance?
          </Text>
          
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.choiceButton}
              onPress={() => {
                setUseBankBalance(true);
                setStep('bank-balance-amount');
              }}
            >
              <Text style={styles.choiceButtonText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.choiceButton}
              onPress={() => {
                setUseBankBalance(false);
                setBankBalanceAmount(0);
                setStep('allocate-income');
              }}
            >
              <Text style={styles.choiceButtonText}>No, use income only</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'bank-balance-amount') {
    const remainingBalance = getRemainingBankBalance();
    
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{goal.title}</Text>
          
          <Text style={styles.question}>How much?</Text>
          <Text style={styles.subtitle}>
            Available: ${remainingBalance.toFixed(2)}
          </Text>

          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={remainingBalance}
            value={bankBalanceAmount}
            onValueChange={setBankBalanceAmount}
            minimumTrackTintColor="#3498db"
            maximumTrackTintColor="#bdc3c7"
            thumbTintColor="#3498db"
          />
          
          <Text style={styles.sliderValue}>${bankBalanceAmount.toFixed(2)}</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => setStep('allocate-income')}
          >  
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'allocate-income') {
    if (currentAllocationIndex >= incomeSources.length) {
      // All sources allocated, save and show projection
      saveGoalDetails();
      setStep('projection');
      return null;
    }

    const source = incomeSources[currentAllocationIndex];
    const allocation = allocations.find(a => a.sourceId === source.id);

    if (!allocation) {
      // Ask if they want to use all income
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>{goal.title}</Text>
            
            <Text style={styles.question}>
              For {source.name}:
            </Text>
            <Text style={styles.question}>
              Do you want to use all of your pay toward this goal?
            </Text>
            
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.choiceButton}
                onPress={() => {
                  setAllocations([...allocations, { sourceId: source.id, mode: 'all' }]);
                  setCurrentAllocationIndex(currentAllocationIndex + 1);
                }}
              >
                <Text style={styles.choiceButtonText}>Yes, use all</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.choiceButton}
                onPress={() => {
                  setStep('allocation-mode');
                }}
              >
                <Text style={styles.choiceButtonText}>No, use part of it</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          </View>
        </SafeAreaView>
      );
    }

    return null;
  }

  if (step === 'allocation-mode') {
    const source = incomeSources[currentAllocationIndex];

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{goal.title}</Text>
          
          <Text style={styles.question}>OK, how much?</Text>
          
          <TouchableOpacity
            style={styles.choiceButton}
            onPress={() => setStep('allocation-percentage')}
          >
            <Text style={styles.choiceButtonText}>Percentage based</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.choiceButton}
            onPress={() => setStep('allocation-fixed')}
          >
            <Text style={styles.choiceButtonText}>Fixed Amount</Text>
          </TouchableOpacity>
        </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'allocation-percentage') {
    const source = incomeSources[currentAllocationIndex];
    const [percentage, setPercentage] = useState('');

    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{goal.title}</Text>
          
          <Text style={styles.question}>What percentage of {source.name}?</Text>
          <TextInput
            style={styles.input}
            value={percentage}
            onChangeText={setPercentage}
            keyboardType="decimal-pad"
            placeholder="e.g., 50"
            placeholderTextColor="#95a5a6"
          />

          {percentage.trim() && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setAllocations([...allocations, {
                  sourceId: source.id,
                  mode: 'percentage',
                  percentage: parseFloat(percentage) || 0,
                }]);
                setCurrentAllocationIndex(currentAllocationIndex + 1);
                setStep('allocate-income');
              }}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (step === 'allocation-fixed') {
    const source = incomeSources[currentAllocationIndex];
    const [fixedAmount, setFixedAmount] = useState('');

    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{goal.title}</Text>
          
          <Text style={styles.question}>How much per deposit from {source.name}?</Text>
          <TextInput
            style={styles.input}
            value={fixedAmount}
            onChangeText={setFixedAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#95a5a6"
          />

          {fixedAmount.trim() && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setAllocations([...allocations, {
                  sourceId: source.id,
                  mode: 'fixed_amount',
                  fixedAmount: parseFloat(fixedAmount) || 0,
                }]);
                setCurrentAllocationIndex(currentAllocationIndex + 1);
                setStep('allocate-income');
              }}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (step === 'projection') {
    const { canAfford, projectedDate, shortfall, surplus } = projection;

    if (canAfford) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>{goal.title}</Text>
            
            <Text style={styles.successText}>
              Looks good, you'll be able to pay that goal by {projectedDate}, and you'll have ${surplus.toFixed(2)} extra
            </Text>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#27ae60' }]}
                onPress={() => {
                  markGoalPaid(goalId);
                  setCurrentStep('goals-list');
                }}
              >
                <Text style={styles.buttonText}>Mark as Paid</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.button}
                onPress={() => setCurrentStep('goals-list')}
              >
                <Text style={styles.buttonText}>Continue to Goals List</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      );
    }

    // Cannot afford
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{goal.title}</Text>
          
          <Text style={styles.warningText}>
            Looks like you won't be able to meet that deadline, you're actually ${shortfall.toFixed(2)} short
          </Text>

          <Text style={styles.subtitle}>Here are your options:</Text>

          <TouchableOpacity
            style={styles.choiceButton}
            onPress={() => {
              updateGoal(goalId, { dueDate: projectedDate });
              Alert.alert('Due date updated', `New due date: ${projectedDate}`);
              setCurrentStep('goals-list');
            }}
          >
            <Text style={styles.choiceButtonText}>
              Option 1: Push back until {projectedDate}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.choiceButton}
            onPress={() => setStep('work-more')}
          >
            <Text style={styles.choiceButtonText}>
              Option 2: Work more in the meantime
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (step === 'work-more') {
    const { shortfall } = projection;

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>{goal.title}</Text>
            
            <Text style={styles.question}>
              To make an extra ${shortfall.toFixed(2)}, you can:
            </Text>

          {incomeSources.map(source => {
            if (source.payFrequency === 'daily' && typeof source.dailyPay === 'number') {
              const extraDaily = (shortfall / 30).toFixed(2);
              return (
                <View key={source.id} style={styles.suggestionBox}>
                  <Text style={styles.suggestionText}>
                    {source.name}: Make an extra ${extraDaily} daily
                  </Text>
                </View>
              );
            } else if (source.payFrequency === 'per_project') {
              return (
                <View key={source.id} style={styles.suggestionBox}>
                  <Text style={styles.suggestionText}>
                    {source.name}: Add ${shortfall.toFixed(2)} to your existing projects
                  </Text>
                </View>
              );
            }
            return null;
          })}

          <TouchableOpacity
            style={styles.button}
            onPress={() => setCurrentStep('goals-list')}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
          </View>
        </SafeAreaView>
      );
    }
  }

  return null;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 16,
    lineHeight: 22,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
    lineHeight: 24,
  },
  input: {
    borderWidth: 2,
    borderColor: '#3498db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: 'white',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonGroup: {
    gap: 12,
  },
  choiceButton: {
    backgroundColor: '#ecf0f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#bdc3c7',
  },
  choiceButtonText: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  purchaseForm: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  addPurchaseButton: {
    backgroundColor: '#27ae60',
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  purchaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  purchaseName: {
    flex: 2,
    fontSize: 16,
    color: '#2c3e50',
  },
  purchaseAmount: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'right',
    marginRight: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#3498db',
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  slider: {
    width: '100%',
    height: 40,
    marginVertical: 16,
  },
  sliderValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3498db',
    textAlign: 'center',
    marginBottom: 16,
  },
  successText: {
    fontSize: 18,
    color: '#27ae60',
    fontWeight: '600',
    marginBottom: 24,
    lineHeight: 26,
  },
  warningText: {
    fontSize: 18,
    color: '#e74c3c',
    fontWeight: '600',
    marginBottom: 24,
    lineHeight: 26,
  },
  suggestionBox: {
    padding: 16,
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    marginBottom: 12,
  },
  suggestionText: {
    fontSize: 16,
    color: '#2c3e50',
    lineHeight: 22,
  },
});
